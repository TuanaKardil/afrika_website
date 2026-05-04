import concurrent.futures
import hashlib
import json
import logging
import re
from typing import Any

from scraper.openrouter import chat, GEMINI_FLASH_LITE

logger = logging.getLogger(__name__)

BATCH_SIZE = 4
MAX_WORKERS = 4

_EM_DASH_RE = re.compile(r"[—–]|(?<!\-)\-\-(?!\-)")

_WORD_FIXES: list[tuple[re.Pattern, str]] = [
    (re.compile(r"\bsedate\b", re.I), "anestezi uygulamak"),
    (re.compile(r"\bsedate edildi\b", re.I), "anestezi uygulandı"),
    (re.compile(r"\bsedate etti\b", re.I), "anestezi uyguladı"),
    (re.compile(r"\bpontif\b", re.I), "Papa"),
    (re.compile(r"\bpopemobil\b", re.I), "Papamobil"),
    (re.compile(r"\bfirebrand\b", re.I), "kışkırtıcı"),
    (re.compile(r"\bBrut[ae]l\b"), "Acımasız"),
    (re.compile(r"\bKütlesini\b"), "Ayinini"),
    (re.compile(r"\bKütle ile\b"), "Ayin ile"),
    (re.compile(r"\baçık hava Kütlesini\b", re.I), "açık hava Ayinini"),
]

_PROPER_NOUN_SUFFIXES = re.compile(
    r"\b([A-ZÇŞİĞÖÜ]{2,})(d[ae]n?|t[ae]n?|y[ae]|n[ıiuü]n|n[ıiuü]|[ıiuü]n)"
    r"(?=[^a-zA-ZçşığöüÇŞİĞÖÜ]|$)"
)


def _apply_word_fixes(text: str) -> str:
    for pattern, replacement in _WORD_FIXES:
        text = pattern.sub(replacement, text)
    return text


def _fix_apostrophes(text: str) -> str:
    def insert_apostrophe(m: re.Match) -> str:
        word, suffix = m.group(1), m.group(2)
        return f"{word}'{suffix}"

    return _PROPER_NOUN_SUFFIXES.sub(insert_apostrophe, text)


def postprocess(text: str) -> str:
    text = _apply_word_fixes(text)
    text = _fix_apostrophes(text)
    return text


def _ensure_html_paragraphs(text: str) -> str:
    """Convert plain-text newline-separated content to <p> tags if no <p> tags present."""
    if "<p" in text:
        return text
    # Split on double newlines and wrap each non-empty block in <p>
    source_match = re.search(r'<p class="source-link">.*?</p>', text, re.DOTALL)
    source_link = source_match.group(0) if source_match else ""
    core = text[:source_match.start()].strip() if source_match else text.strip()

    blocks = [b.strip() for b in re.split(r"\n{2,}", core) if b.strip()]
    if not blocks:
        return text
    result = "\n".join(f"<p>{b}</p>" for b in blocks)
    if source_link:
        result += "\n" + source_link
    return result


_SYSTEM_PROMPT = """\
You are a senior Turkish news editor and translator specializing in Africa-Turkey business relations. \
Translate English news articles into journalistic Turkish optimized for SEO, GEO, and AEO.

## Non-Negotiable Rules

1. LENGTH: Translated body MUST NOT exceed 600 words. Condense/summarize if needed. \
   Title + body count only; source link and image captions excluded.

2. HTML: Preserve all HTML tags exactly. Allowed: h2, h3, p, blockquote, ul, ol, li, strong, em, figure, figcaption, img, a.

3. NO EM DASHES: Never use — or – or --. Use commas or rephrase.

4. PROPER NOUNS: Use Turkish forms.
   Nigeria→Nijerya, South Africa→Güney Afrika, Egypt→Mısır, Ethiopia→Etiyopya,
   Ghana→Gana, Cameroon→Kamerun, Congo→Kongo, Zimbabwe→Zimbabve, Tanzania→Tanzanya,
   Rwanda→Ruanda, Somalia→Somali, Sudan→Sudan, Uganda→Uganda, Kenya→Kenya.
   African Union→Afrika Birliği, AfCFTA→Afrika Kıtası Serbest Ticaret Alanı (AfCFTA),
   African Development Bank→Afrika Kalkınma Bankası (AfDB).
   Turkish Airlines→Türk Hava Yolları. Other company names: keep original.
   Proper noun + Turkish suffix → always apostrophe: Kamerun'da, Afrika'da, ABD'den.

5. SOURCE LINK: Last line must be exactly:
   <p class="source-link"><small>Kaynak: <a href="{source_url}" target="_blank" rel="noopener">{source_name}</a></small></p>
   Never omit this.

## SEO Optimization
- Title must include primary country/region name and core topic (max 120 chars).
- First paragraph answers Who, What, Where, When in 1-2 sentences (meta description candidate).
- Use descriptive H2/H3 headings with natural keywords, not generic ones like "Detaylar".

## GEO Optimization
- Use full entity names on first mention; avoid pronouns ("bu ülke", "söz konusu anlaşma").
- Include specific numbers, dates, dollar amounts, percentages.
- Attribute quotes clearly: "Nijerya Merkez Bankası Başkanı'nın açıklamasına göre..." not "yetkililer söyledi".
- Add one sentence connecting news to Turkey-Africa context.

## AEO Optimization
- Include at least one question-based H2 (e.g. "Nijerya Nairası Neden Değer Kaybediyor?").
- After each question H2, provide a 40-60 word direct answer block.
- Use bullet lists for comparisons and multi-item impacts.
- End with a 2-3 sentence <p><strong>Özet:</strong> ...</p> block answering "Bu haber neden önemli?".

## Output Format
Return ONLY a valid JSON object — no markdown, no extra text:
{"title_tr": "...", "excerpt_tr": "...", "content_tr": "..."}
- title_tr: max 120 chars, SEO-optimized Turkish title
- excerpt_tr: max 200 chars, answers What+Who+Where+When
- content_tr: full translated body HTML including source-link at bottom, max 600 words"""

_USER_TEMPLATE = """\
Translate the following news article to Turkish.

Title: {title}
Excerpt: {excerpt}

Body HTML:
{body}

Source URL: {source_url}
Source Name: {source_name}"""

_TITLE_RE = re.compile(r"<title>(.*?)</title>", re.DOTALL)
_EXCERPT_RE = re.compile(r"<excerpt>(.*?)</excerpt>", re.DOTALL)
_BODY_RE = re.compile(r"<body>(.*?)</body>", re.DOTALL)
_JSON_RE = re.compile(r"\{.*\}", re.DOTALL)
_CODEBLOCK_RE = re.compile(r"^```(?:json)?\s*|\s*```$", re.MULTILINE)


def _safe_parse_json(text: str) -> dict[str, str] | None:
    """Parse JSON from AI response, handling markdown code blocks and unescaped HTML quotes."""
    # Strip markdown code block markers
    cleaned = _CODEBLOCK_RE.sub("", text).strip()

    # Try strict JSON first
    json_m = _JSON_RE.search(cleaned)
    if json_m:
        try:
            return json.loads(json_m.group(0))
        except (json.JSONDecodeError, ValueError):
            pass

    # Fallback: extract fields individually (handles unescaped HTML quotes in content_tr)
    result: dict[str, str] = {}

    for field in ("title_tr", "excerpt_tr"):
        m = re.search(rf'"{field}"\s*:\s*"((?:[^"\\]|\\.)*)"', cleaned)
        if m:
            result[field] = m.group(1).replace('\\"', '"')

    # content_tr may contain unescaped HTML — take everything between field marker and closing }
    m = re.search(r'"content_tr"\s*:\s*"', cleaned)
    if m:
        remaining = cleaned[m.end():]
        end = re.search(r'"\s*\n?\s*\}\s*$', remaining)
        if end:
            raw_content = remaining[: end.start()]
            raw_content = (
                raw_content.replace('\\"', '"')
                .replace("\\n", "\n")
                .replace("\\t", "\t")
                .replace("\\\\", "\\")
            )
            result["content_tr"] = raw_content

    return result if result.get("title_tr") else None


def _md5(text: str) -> str:
    return hashlib.md5(text.encode("utf-8")).hexdigest()


def _strip_em_dashes(text: str) -> str:
    return _EM_DASH_RE.sub(",", text)


_SUMMARIZE_SYSTEM = """\
Sen Türkçe bir haber editörüsün. Sana HTML formatında bir Türkçe haber metni verilecek.
Bu metni en fazla 550 kelimeye sıkıştır:
- En önemli gerçekleri, istatistikleri ve alıntıları koru
- Gazetecilik Türkçesini ve akıcı anlatımı koru
- HTML paragraf etiketlerini (<p>...</p>) koru
- Kaynak bağlantısını (<p class="source-link">...</p>) ÇIKARMA, sonunda bırak
- Açıklama veya not ekleme; yalnızca özetlenmiş metni yaz."""


def _plain_word_count(html: str) -> int:
    plain = re.sub(r"<[^>]+>", " ", html)
    return len(plain.split())


def _summarize_if_needed(body: str) -> str:
    """If body exceeds 600 words, ask AI to summarize. Falls back to sentence-boundary cut."""
    if _plain_word_count(body) <= 600:
        return body

    logger.info("translate: body %d words > 600, requesting AI summarization", _plain_word_count(body))
    raw = chat(
        [{"role": "user", "content": f"Aşağıdaki haber metnini en fazla 550 kelimeye özetle:\n\n{body}"}],
        model=GEMINI_FLASH_LITE,
        system=_SUMMARIZE_SYSTEM,
        temperature=0.2,
        max_tokens=2048,
    )

    if raw and _plain_word_count(raw.strip()) <= 620:
        return postprocess(_strip_em_dashes(raw.strip()))

    logger.warning("translate: AI summarization failed or still over limit, falling back to sentence cut")
    # Last-resort: cut at last sentence boundary before word 600
    source_match = re.search(r'<p class="source-link">.*?</p>', body, re.DOTALL)
    source_link = source_match.group(0) if source_match else ""
    body_core = body[:source_match.start()].rstrip() if source_match else body

    plain = re.sub(r"<[^>]+>", " ", body_core)
    plain = re.sub(r"\s+", " ", plain).strip()
    words = plain.split()
    region = " ".join(words[:620])
    cut = max(region.rfind("."), region.rfind("!"), region.rfind("?"))
    truncated = region[:cut + 1].strip() if cut > 0 else " ".join(words[:600])

    result = f"<p>{truncated}</p>"
    if source_link:
        result += "\n" + source_link
    return result


def _parse_response(text: str, original: dict, source_url: str = "", source_name: str = "") -> tuple[str, str, str] | None:
    title_raw = excerpt_raw = body_raw = ""

    # Try JSON parsing (handles markdown code blocks and malformed HTML quotes)
    parsed = _safe_parse_json(text)
    if parsed:
        title_raw = parsed.get("title_tr", "").strip()
        excerpt_raw = parsed.get("excerpt_tr", "").strip()
        body_raw = parsed.get("content_tr", "").strip()
    else:
        title_raw = excerpt_raw = body_raw = ""

    # Fallback to XML tag parsing
    if not title_raw:
        title_m = _TITLE_RE.search(text)
        if not title_m:
            return None
        title_raw = title_m.group(1).strip()
        excerpt_m = _EXCERPT_RE.search(text)
        excerpt_raw = excerpt_m.group(1).strip() if excerpt_m else ""
        body_m = _BODY_RE.search(text)
        body_raw = body_m.group(1).strip() if body_m else ""

    title = postprocess(_strip_em_dashes(title_raw))
    excerpt = postprocess(_strip_em_dashes(excerpt_raw or (original.get("excerpt_original") or "")))
    body = postprocess(_strip_em_dashes(body_raw or (original.get("content_original") or "")))

    # Enforce source link at end with new <small><a> format
    if source_url and "Kaynak:" not in body:
        name = source_name or source_url
        body = body.rstrip() + f'\n<p class="source-link"><small>Kaynak: <a href="{source_url}" target="_blank" rel="noopener">{name}</a></small></p>'

    body = _ensure_html_paragraphs(body)
    body = _summarize_if_needed(body)

    return title, excerpt, body


def _translate_one(article: dict[str, Any]) -> dict[str, Any]:
    title = article.get("title_original") or ""
    excerpt = article.get("excerpt_original") or ""
    body = article.get("content_original") or ""
    source_url = article.get("source_url") or ""
    source_name = article.get("source") or source_url

    user_message = _USER_TEMPLATE.format(
        title=title,
        excerpt=excerpt,
        body=body,
        source_url=source_url,
        source_name=source_name,
    )

    raw = chat(
        [{"role": "user", "content": user_message}],
        model=GEMINI_FLASH_LITE,
        system=_SYSTEM_PROMPT,
        temperature=0.2,
        max_tokens=4096,
    )

    if raw is None:
        logger.warning("Translation failed for %s", article.get("source_url"))
        article["title_tr"] = None
        article["excerpt_tr"] = None
        article["content_tr"] = None
        return article

    parsed = _parse_response(raw, article, source_url=source_url, source_name=source_name)
    if parsed is None:
        logger.warning(
            "Could not parse translation response for %s, raw: %.200s",
            article.get("source_url"), raw,
        )
        article["title_tr"] = None
        article["excerpt_tr"] = None
        article["content_tr"] = None
        return article

    title_tr, excerpt_tr, content_tr = parsed
    article["title_tr"] = title_tr
    article["excerpt_tr"] = excerpt_tr
    article["content_tr"] = content_tr
    return article


def translate_article(
    title: str,
    excerpt: str,
    body: str,
    source_url: str,
    source_name: str = "",
) -> tuple[str, str, str] | None:
    """Translate a single article. Returns (title_tr, excerpt_tr, content_tr) or None on failure."""
    article = {
        "title_original": title,
        "excerpt_original": excerpt,
        "content_original": body,
        "source_url": source_url,
        "source": source_name,
    }
    result = _translate_one(article)
    if result.get("title_tr") is None:
        return None
    return result["title_tr"], result["excerpt_tr"], result["content_tr"]


def translate_articles(articles: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Translate a list of article dicts. Returns the same list with
    title_tr, excerpt_tr, content_tr populated. Articles whose content_hash
    matches stored hash and already have title_tr are skipped."""

    to_translate = []
    skipped = []

    for article in articles:
        content = article.get("content_original") or ""
        new_hash = _md5(content)
        article["content_hash"] = new_hash

        if article.get("title_tr") and article.get("content_hash_stored") == new_hash:
            logger.info("Skipping unchanged article: %s", article.get("source_url"))
            skipped.append(article)
        else:
            to_translate.append(article)

    if not to_translate:
        return articles

    logger.info("Translating %d articles (%d skipped)", len(to_translate), len(skipped))

    results: list[dict[str, Any]] = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = {executor.submit(_translate_one, article): article for article in to_translate}
        for future in concurrent.futures.as_completed(futures):
            try:
                results.append(future.result())
            except Exception as exc:
                article = futures[future]
                logger.error("Translation thread failed for %s: %s", article.get("source_url"), exc)
                article["title_tr"] = None
                article["excerpt_tr"] = None
                article["content_tr"] = None
                results.append(article)

    return results + skipped
