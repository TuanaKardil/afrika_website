import concurrent.futures
import hashlib
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
You are a professional Turkish news translator specializing in African affairs. \
Translate the provided content from English to Turkish using natural, journalistic Turkish.

=== SEO / GEO / AEO THREE-LAYER TRANSLATION RULES ===

1. SEO Layer (Search Engine Optimization):
   - Headline: punchy, keyword-rich, under 70 chars if possible.
   - Include primary keyword (country/sector name) near the start.

2. GEO Layer (Generative Engine Optimization):
   - Use full entity names on first mention (e.g. "Nijerya Merkez Bankası (CBN)").
   - Convert foreign currencies to TRY (Turkish Lira) using approximate rates.
   - Convert imperial units to metric (miles->km, feet->m, pounds->kg, acres->hectare).
   - Use Turkish date format: 15 Haziran 2025.
   - Use Turkish number format: 1.234.567,89.

3. AEO Layer (Answer Engine Optimization):
   - First paragraph must directly answer: Who did what, where, when, why it matters.
   - Include a 2-3 sentence "TL;DR" feel in the opening.
   - Use short paragraphs (2-4 sentences) for voice/search snippet compatibility.

=== HARD RULES ===
- Preserve all HTML tags exactly as they appear. Do not add, remove, or modify any HTML tags.
- Do not use em dashes (-- or Unicode em dash/en dash) anywhere. Use commas or rephrase instead.
- Preserve proper nouns in Turkish-accepted forms: \
Nigeria->Nijerya, Kenya->Kenya, Cairo->Kahire, Ethiopia->Etiyopya, Egypt->Mısır, \
Ghana->Gana, Sudan->Sudan, Somalia->Somali, Cameroon->Kamerun, Congo->Kongo, \
Zimbabwe->Zimbabve, Tanzania->Tanzanya, Uganda->Uganda, Rwanda->Ruanda.
- When adding Turkish case suffixes to proper nouns, ALWAYS use an apostrophe: \
Kamerun'da (not "Kamerunda"), Afrika'da (not "Afrikada"), ABD'den (not "ABDden").
- Translate "Mass" (Catholic religious service) as "Ayin" not "Kütle".
- Translate "pontiff" as "Papa", "Popemobile" as "Papamobil".
- Translate "firebrand" as "kışkırtıcı" or "ateşli muhalefet figürü".
- Translate "sedated" as "uyuşturuldu" or "anestezi uygulandı".
- Do not leave any English words untranslated in the output.
- WORD LIMIT: The translated <body> must not exceed 600 words. If the original body is longer, \
summarize it to fit within 600 words while keeping the most important facts, \
key quotes, and journalistic structure. Do not truncate mid-sentence.
- SOURCE LINK: Append the original source URL at the very end as a separate paragraph: \
<p class="source-link">Kaynak: {source_url}</p>
- Do not add commentary, notes, or translator remarks.
- Output only the translated content using the exact delimiter tags provided."""

_USER_TEMPLATE = """\
Translate the following news article to Turkish.

<title>{title}</title>
<excerpt>{excerpt}</excerpt>
<body>{body}</body>

<source_url>{source_url}</source_url>"""

_TITLE_RE = re.compile(r"<title>(.*?)</title>", re.DOTALL)
_EXCERPT_RE = re.compile(r"<excerpt>(.*?)</excerpt>", re.DOTALL)
_BODY_RE = re.compile(r"<body>(.*?)</body>", re.DOTALL)


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


def _parse_response(text: str, original: dict, source_url: str = "") -> tuple[str, str, str] | None:
    title_m = _TITLE_RE.search(text)
    if not title_m:
        return None
    title = postprocess(_strip_em_dashes(title_m.group(1).strip()))

    excerpt_m = _EXCERPT_RE.search(text)
    excerpt_raw = excerpt_m.group(1).strip() if excerpt_m else (original.get("excerpt_original") or "")
    excerpt = postprocess(_strip_em_dashes(excerpt_raw))

    body_m = _BODY_RE.search(text)
    body_raw = body_m.group(1).strip() if body_m else (original.get("content_original") or "")
    body = postprocess(_strip_em_dashes(body_raw))

    # Enforce source link at end
    if source_url and "Kaynak:" not in body:
        body = body.rstrip() + f'\n<p class="source-link">Kaynak: {source_url}</p>'

    # Ensure HTML paragraph structure
    body = _ensure_html_paragraphs(body)

    # If AI translated more than 600 words, ask AI to summarize properly
    body = _summarize_if_needed(body)

    return title, excerpt, body


def _translate_one(article: dict[str, Any]) -> dict[str, Any]:
    title = article.get("title_original") or ""
    excerpt = article.get("excerpt_original") or ""
    body = article.get("content_original") or ""
    source_url = article.get("source_url") or ""

    user_message = _USER_TEMPLATE.format(
        title=title,
        excerpt=excerpt,
        body=body,
        source_url=source_url,
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

    parsed = _parse_response(raw, article, source_url=source_url)
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
