import concurrent.futures
import hashlib
import logging
import re
from typing import Any

from scraper.openrouter import chat

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


_SYSTEM_PROMPT = """\
You are a professional Turkish news translator specializing in African affairs. \
Translate the provided content from English to Turkish using natural, journalistic Turkish.

Rules:
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
- Do not summarize, condense, or omit any content. Translate the full text faithfully.
- Do not add commentary, notes, or translator remarks.
- Output only the translated content using the exact delimiter tags provided."""

_USER_TEMPLATE = """\
Translate the following news article to Turkish.

<title>{title}</title>
<excerpt>{excerpt}</excerpt>
<body>{body}</body>"""

_TITLE_RE = re.compile(r"<title>(.*?)</title>", re.DOTALL)
_EXCERPT_RE = re.compile(r"<excerpt>(.*?)</excerpt>", re.DOTALL)
_BODY_RE = re.compile(r"<body>(.*?)</body>", re.DOTALL)


def _md5(text: str) -> str:
    return hashlib.md5(text.encode("utf-8")).hexdigest()


def _strip_em_dashes(text: str) -> str:
    return _EM_DASH_RE.sub(",", text)


def _parse_response(text: str, original: dict) -> tuple[str, str, str] | None:
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

    return title, excerpt, body


def _translate_one(article: dict[str, Any]) -> dict[str, Any]:
    title = article.get("title_original") or ""
    excerpt = article.get("excerpt_original") or ""
    body = article.get("content_original") or ""

    user_message = _USER_TEMPLATE.format(title=title, excerpt=excerpt, body=body)

    raw = chat(
        [{"role": "user", "content": user_message}],
        system=_SYSTEM_PROMPT,
        temperature=0.0,
        max_tokens=8192,
    )

    if raw is None:
        logger.warning("Translation failed for %s", article.get("source_url"))
        article["title_tr"] = None
        article["excerpt_tr"] = None
        article["content_tr"] = None
        return article

    parsed = _parse_response(raw, article)
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
