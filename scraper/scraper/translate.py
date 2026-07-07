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
You are a senior Turkish news editor and translator covering African business, policy, and economics for a Turkish audience. Your task is to translate English news articles into journalistic Turkish that is simultaneously optimized for traditional search (SEO), AI engine citation (GEO), and answer-based discovery (AEO). Only add a Turkey-specific angle when it is explicitly supported by the source text or by verified supporting context provided in the prompt.

## Translation Rules (Non-Negotiable)

1. LENGTH: The translated article MUST NOT exceed 600 words in Turkish. If the original exceeds 1000 words, condense and summarize while preserving all key facts, quotes, and data points. If the original is 600-1000 words, compress to 600 words by removing redundant background paragraphs, repetitive examples, and non-essential anecdotes. Count: title + body only. Source link and image captions are excluded.

2. HTML: Preserve all HTML tags exactly as they appear. Allowed tags: h2, h3, p, blockquote, ul, ol, li, strong, em, figure, figcaption, img, a. Strip all other tags.

3. NO EM DASHES: Do not use em dashes (—), en dashes (–), or double hyphens (--) anywhere. Use commas, periods, or rephrase sentences instead.

4. PROPER NOUNS: Country names, city names, institution names must use Turkish conventions:
   Nigeria→Nijerya, South Africa→Güney Afrika, Egypt→Mısır, Ethiopia→Etiyopya,
   Ghana→Gana, Cameroon→Kamerun, Congo→Kongo, Zimbabwe→Zimbabve, Tanzania→Tanzanya,
   Rwanda→Ruanda, Somalia→Somali, Sudan→Sudan, Uganda→Uganda, Kenya→Kenya.
   African Union→Afrika Birliği, AfCFTA→Afrika Kıtası Serbest Ticaret Alanı (AfCFTA),
   African Development Bank→Afrika Kalkınma Bankası (AfDB).
   Turkish Airlines→Türk Hava Yolları. Other company names: keep original spelling.
   Proper noun + Turkish suffix → always apostrophe: Kamerun'da, Afrika'da, ABD'den.

5. SOURCE LINK: At the very end of the article, add exactly:
   <p class="source-link"><small>Kaynak: <a href="{source_url}" target="_blank" rel="noopener">{source_name}</a></small></p>
   This is mandatory. Never omit it.

6. SOURCE PRIORITY: Never use model memory to fill missing dates, years, figures, or causal explanations. Trust order: (a) primary/official source, (b) the reported article, (c) reputable secondary coverage.

## Turkey Relevance Classification — Silent, Apply Before Writing

Before writing, silently classify the article as exactly one of: Direct Relevance, Indirect Relevance, or No Relevance. Do not output the label.

- **Direct Relevance**: The source text explicitly mentions Turkey, a Turkish company, a Turkish institution, Turkish exporters, Turkish investors, a Turkey-Africa bilateral relationship, or a direct effect on Turkey. Turkey may appear in the title, lead, H2s, body, and summary — but only within the source-supported scope.

- **Indirect Relevance**: The source text does not mention Turkey, but verified supporting context provided in the same prompt establishes a concrete Turkey connection to the same country, sector, program, or transaction. If indirect: keep the title and lead source-centered; add at most ONE cautious sentence in the body; do not create a Turkey-focused H2 unless the supporting context is explicit, attributed, and strong.

- **No Relevance**: Neither the source text nor the provided supporting context establishes a concrete Turkey connection. Do NOT mention Turkey, Turkish companies, Turkish exporters, Ankara, bilateral trade, or "what this means for Turkey" anywhere. If a Turkey link is merely plausible but not proven, classify as No Relevance.

## Forbidden Behaviors

- Never invent a Turkey connection not explicitly supported by the source or verified supporting context.
- Never invent dates, years, figures, exchange values, percentages, rankings, or timelines.
- Never convert a general sector trend into a Turkey-specific impact without evidence.
- Never make speculative causal claims such as "this will benefit Turkey", "this could boost Turkish exports", or "this creates a major opportunity for Turkish firms" unless clearly supported and attributed.
- Never introduce a new country, company, or stakeholder in the title, excerpt, or summary that was not established by the source or verified supporting context.

## Safe Fallback Phrasing (Indirect Relevance only, max one sentence)

- "Bu gelişme, Afrika'daki [sektör/ülke] dinamiklerini göstermesi bakımından önem taşıyor."
- "Kaynak metin Türkiye'ye doğrudan bir etkiden söz etmiyor; olası yansımalar ayrı verilerle değerlendirilebilir."
- "Haberde Türkiye bağlantısı kurulmadığı için analiz, kaynağın aktardığı çerçeveyle sınırlandırılmıştır."

## SEO Optimization

- Title must include the primary country/region name and core topic (max 120 chars). Example: "Nijerya'da Yeni Maden Yatırımı Bakır Üretimini Artırabilir" not "Önemli Gelişme".
- First paragraph (lead) must answer Who, What, Where, When in 1-2 sentences (meta description candidate).
- Use descriptive H2/H3 headings with natural keywords. Avoid generic headings like "Detaylar". Use specific ones like "Nijerya'nın Yeni Maden Politikası Nedir?". Only use a Turkey-focused H2 if Direct Relevance or strongly supported Indirect Relevance.

## GEO Optimization

- Use full entity names on first mention; avoid pronouns ("bu ülke", "söz konusu anlaşma").
- Include specific numbers, dates, dollar amounts, and percentages only when present in the source.
- Attribute quotes clearly: "Nijerya Merkez Bankası Başkanı'nın açıklamasına göre..." not "yetkililer söyledi".
- Add one sentence connecting news to Turkey-Africa context ONLY IF the source text or verified supporting context establishes a concrete Turkey connection. If no reliable Turkey relevance exists, do not add any Turkey sentence.

## AEO Optimization

- Include at least one question-based H2 relevant to the source. Example: "Nijerya Nairası Neden Değer Kaybediyor?" or "AfCFTA Bölgesel Ticareti Nasıl Etkiler?"
- After each question H2, provide a 40-60 word direct answer block before expanding.
- Use bullet lists for comparisons and multi-item impacts.
- End with a 2-3 sentence <p><strong>Özet:</strong> ...</p> block answering "Bu haber neden önemli?" The closing summary must stay within the article's sourced context and must not introduce Turkey or a new implication unless already established by the source or verified supporting context.

## Silent Self-Check Before Finalizing

- If No Relevance: scan for and remove "Türkiye", "Türk", "Ankara", "Turkish", "bilateral", or any Turkey-specific implication.
- Verify every year, date, percentage, currency amount, and ranking appears in the source.
- Verify the title, excerpt, H2s, and Özet do not introduce any new country, company, effect, or conclusion the source did not establish.
- Verify the article remains within 600 Turkish words excluding source line and image captions.

## Output Format

Return ONLY a valid JSON object — no markdown code fences, no explanatory text before or after:
{"title_tr": "...", "excerpt_tr": "...", "content_tr": "..."}
- title_tr: max 120 chars, SEO-optimized Turkish title
- excerpt_tr: max 200 chars, answers What+Who+Where+When
- content_tr: full translated body HTML with all optimizations applied, source-link at bottom, max 600 words"""

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
- Tüm HTML etiketlerini koru: <h2>, <h3>, <p>, <ul>, <ol>, <li>, <strong>, <em>, <blockquote>
- Soru bazlı <h2> başlıklarını MUTLAKA koru; bunlar SEO için zorunlu
- Kaynak bağlantısını (<p class="source-link">...</p>) ÇIKARMA, sonunda bırak
- <p><strong>Özet:</strong> ...</p> bloğunu koru
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
    _SOURCE_LABELS = {
        "business_insider": "Business Insider Africa",
        "cnbc_africa": "CNBC Africa",
        "africa_report": "The Africa Report",
        "the_conversation": "The Conversation Africa",
        "aa_africa": "Anadolu Agency",
    }
    raw_source = article.get("source") or ""
    source_name = _SOURCE_LABELS.get(raw_source) or raw_source or source_url

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


# ---------------------------------------------------------------------------
# Image alt text translation — completely separate from article translation
# ---------------------------------------------------------------------------

_MEANINGLESS_ALT_RE = re.compile(
    r"^(photo|image|picture|img|banner|file photo|ap photo|reuters|afp|epa|"
    r"getty|handout|archive|file|stock photo|stock|generic|illustration|logo|"
    r"video|thumbnail|cover|hero|featured|\d+[\w\s]*)$",
    re.I,
)

_ALT_SYSTEM = (
    "Translate the image alt text to Turkish. "
    "Rules: "
    "(1) MAXIMUM 10 WORDS — this is a short image description, NOT an article. "
    "(2) Use Turkish country/city name conventions: Nigeria→Nijerya, South Africa→Güney Afrika, "
    "Egypt→Mısır, Ethiopia→Etiyopya, Ghana→Gana, Kenya→Kenya. "
    "(3) No em dashes. "
    "(4) Return ONLY valid JSON with a single key: "
    '{"image_alt_tr": "translated text"} '
    "or "
    '{"image_alt_tr": null} '
    "if the text is generic/meaningless (e.g. just 'photo', 'image', 'banner', "
    "an agency name alone, or a number)."
)


def _is_meaningless_alt(text: str) -> bool:
    t = text.strip()
    if not t or len(t) < 5:
        return True
    words = t.split()
    if len(words) <= 2 and _MEANINGLESS_ALT_RE.match(t):
        return True
    return False


def translate_image_alt(alt_en: str) -> str | None:
    """Translate image alt text to Turkish (max 10 words). Returns None if generic/meaningless.
    This is a separate API call — never mixed with article translation."""
    if _is_meaningless_alt(alt_en):
        return None

    raw = chat(
        [{"role": "user", "content": f"Image alt text to translate: {alt_en}"}],
        model=GEMINI_FLASH_LITE,
        system=_ALT_SYSTEM,
        temperature=0.1,
        max_tokens=80,
    )

    if not raw:
        return None

    try:
        cleaned = _CODEBLOCK_RE.sub("", raw).strip()
        parsed = json.loads(cleaned)
        result = parsed.get("image_alt_tr")
        if not result:
            return None
        # Hard cap: 15 words as safety net
        words = str(result).split()
        if len(words) > 15:
            result = " ".join(words[:15])
        return str(result).strip() or None
    except (json.JSONDecodeError, AttributeError, TypeError):
        return None


# ---------------------------------------------------------------------------
# Meta description generation — separate from article translation
# ---------------------------------------------------------------------------

def _load_meta_description_prompt() -> str:
    """Load the meta description system prompt from prompts/metadescription.md."""
    import pathlib
    prompt_path = pathlib.Path(__file__).parent.parent.parent / "prompts" / "metadescription.md"
    try:
        return prompt_path.read_text(encoding="utf-8").strip()
    except OSError:
        return (
            "Generate a single SEO-optimized Turkish meta description for the news article. "
            "140-155 characters. Plain text only, no explanation."
        )


_META_DESC_SYSTEM: str | None = None


def generate_meta_description(title_tr: str, content_tr: str) -> str | None:
    """Generate a Turkish SEO meta description for a translated article.

    Uses GEMINI_FLASH_LITE (same model as article translation).
    Returns a plain-text string of 140-155 chars, or None on failure.
    This is a separate API call — never mixed with article translation.
    """
    global _META_DESC_SYSTEM
    if _META_DESC_SYSTEM is None:
        _META_DESC_SYSTEM = _load_meta_description_prompt()

    if not title_tr or not content_tr:
        return None

    plain = re.sub(r"<[^>]+>", " ", content_tr)
    plain = re.sub(r"\s+", " ", plain).strip()[:800]

    user_message = f"Title (Turkish): {title_tr}\n\nArticle text (Turkish): {plain}"

    raw = chat(
        [{"role": "user", "content": user_message}],
        model=GEMINI_FLASH_LITE,
        system=_META_DESC_SYSTEM,
        temperature=0.1,
        max_tokens=200,
    )

    if not raw:
        return None

    result = raw.strip()
    result = _EM_DASH_RE.sub(",", result)
    result = result.strip('"').strip("'").strip()

    if len(result) < 80 or len(result) > 200:
        logger.warning("meta_description_tr out of range (%d chars): %.100s", len(result), result)
        return None

    return result


def _load_add_h2_prompt() -> str:
    """Load the H2-remediation system prompt from prompts/add_h2.md."""
    import pathlib
    prompt_path = pathlib.Path(__file__).parent.parent.parent / "prompts" / "add_h2.md"
    try:
        text = prompt_path.read_text(encoding="utf-8")
    except OSError:
        return (
            "Insert 2-3 question-format Turkish <h2> headings into the article "
            "body below at natural section boundaries. Do NOT change, shorten, or "
            "reorder any existing text. Return only the HTML body."
        )
    marker = "## System Prompt"
    if marker in text:
        text = text.split(marker, 1)[1]
    return text.strip()


_ADD_H2_SYSTEM: str | None = None


def _parse_h2_plan(raw: str) -> list[dict[str, Any]]:
    """Extract the [{"before": int, "h2": str}, ...] plan from a model reply."""
    import json
    text = raw.strip()
    text = re.sub(r"^```[a-zA-Z]*\n?", "", text)
    text = re.sub(r"\n?```$", "", text).strip()
    start, end = text.find("["), text.rfind("]")
    if start == -1 or end == -1 or end < start:
        return []
    try:
        data = json.loads(text[start : end + 1])
    except (ValueError, TypeError):
        return []
    plan = []
    for entry in data if isinstance(data, list) else []:
        if not isinstance(entry, dict):
            continue
        before, h2 = entry.get("before"), entry.get("h2")
        if isinstance(before, int) and isinstance(h2, str) and h2.strip():
            plan.append({"before": before, "h2": h2.strip()})
    return plan


def _paragraphize(soup) -> None:
    """Split a single wall-of-text <p> into several <p> in place.

    Some early translations collapsed a substantial article into one giant
    paragraph (no <p> breaks), which reads as a wall of text and leaves
    add_h2_headings no anchors. This regroups the paragraph's sentences into
    ~4-6 paragraphs. Content-safe: it only acts when there is exactly one long
    content paragraph with NO inline markup, and never edits any word.
    """
    content_ps = [p for p in soup.find_all("p") if "source-link" not in (p.get("class") or [])]
    if len(content_ps) != 1:
        return
    big = content_ps[0]
    if big.find(True) is not None:  # has child tags (a/strong/em) — don't risk it
        return
    text = big.get_text().strip()
    if len(text.split()) < 180:
        return
    sentences = [s.strip() for s in re.split(r"(?<=[.!?…])\s+", text) if s.strip()]
    if len(sentences) < 4:
        return
    per = max(3, -(-len(sentences) // 5))  # aim for ~5 paragraphs
    paras, cur = [], []
    for s in sentences:
        cur.append(s)
        if len(cur) >= per:
            paras.append(" ".join(cur))
            cur = []
    if cur:
        paras.append(" ".join(cur))
    for p_text in paras:
        p = soup.new_tag("p")
        p.string = p_text
        big.insert_before(p)
    big.extract()


def add_h2_headings(title_tr: str, content_tr: str) -> str | None:
    """Insert question-format <h2> headings into a body that lacks them.

    Used by QualityCheckPipeline to enforce the mandatory H2/AEO structure. The
    model only proposes headings and insertion points (JSON); the body text is
    never sent back through it, so content is preserved by construction. The
    <h2> tags are spliced in programmatically. Returns HTML containing at least
    one <h2>, or None if no valid heading could be placed (caller then drops the
    article so nothing publishes without an H2).
    """
    global _ADD_H2_SYSTEM
    if _ADD_H2_SYSTEM is None:
        _ADD_H2_SYSTEM = _load_add_h2_prompt()

    if not content_tr:
        return None

    from bs4 import BeautifulSoup
    soup = BeautifulSoup(content_tr, "html.parser")
    # Rescue wall-of-text bodies (one giant <p>) into real paragraphs first.
    _paragraphize(soup)
    # Anchor on content <p> paragraphs (exclude the trailing source-link).
    blocks = [p for p in soup.find_all("p") if "source-link" not in (p.get("class") or [])]
    # Need at least intro + one middle + closing to have a legal slot.
    if len(blocks) < 3:
        return None

    numbered = "\n".join(
        f"{i + 1}. {b.get_text(' ', strip=True)[:200]}" for i, b in enumerate(blocks)
    )
    user_message = f"Title (Turkish): {title_tr}\n\nParagraphs:\n{numbered}"

    # Valid slots: after the intro, before the closing paragraph. Clamp slightly
    # off positions into range rather than dropping the heading. One per spot.
    # Retry once on an empty/garbled plan (the model is occasionally flaky).
    used_positions: set[int] = set()
    inserted = 0
    for attempt in range(2):
        raw = chat(
            [{"role": "user", "content": user_message}],
            model=GEMINI_FLASH_LITE,
            system=_ADD_H2_SYSTEM,
            temperature=0.2 if attempt == 0 else 0.4,
            max_tokens=800,
        )
        for entry in sorted(_parse_h2_plan(raw or ""), key=lambda e: e["before"]):
            before = max(2, min(entry["before"], len(blocks) - 1))
            if before in used_positions:
                continue
            heading = postprocess(_strip_em_dashes(entry["h2"])).strip(" ?") + "?"
            h2 = soup.new_tag("h2")
            h2.string = heading
            blocks[before - 1].insert_before(h2)
            used_positions.add(before)
            inserted += 1
            if inserted >= 3:
                break
        if inserted > 0:
            break

    if inserted == 0:
        logger.warning("add_h2_headings: model proposed no valid heading positions")
        return None

    result_html = str(soup)
    # Reserialization safety: no existing content tag may be lost.
    for tag in ("<p", "<a", "<img", "<li", "<ul", "<ol", "<blockquote", "<figure"):
        if content_tr.count(tag) > result_html.count(tag):
            logger.warning("add_h2_headings: '%s' tag count dropped, discarding", tag)
            return None

    return result_html


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
