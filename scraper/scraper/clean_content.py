import logging
import re

from scraper.openrouter import chat, GEMINI_FLASH_LITE

logger = logging.getLogger(__name__)

_MONTHS_TR = (
    "Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|"
    "Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık"
)

# Patterns that look like author bylines or publication dates inside article HTML
_BYLINE_PATTERNS = [
    # "02 Mayıs 2026 • Güncelleme: 02 Mayıs 2026" or just "02 Mayıs 2026"
    re.compile(
        rf'<p>\s*\d{{1,2}}\s+(?:{_MONTHS_TR})\s+\d{{4}}[^<]*</p>',
        re.IGNORECASE,
    ),
    # "Yazar: Name" or "By Name" explicit label
    re.compile(r'<p>\s*(?:Yazar|By)\s*:?\s*[^<]{3,60}</p>', re.IGNORECASE),
    # "FirstName LastName" where words contain only ASCII letters (no Turkish noun suffixes)
    # e.g. "James Tasamba" but NOT "Malavi Kwachası" (ı suffix)
    re.compile(r'<p>\s*[A-Z][a-z]{1,14}(?:\s+[A-Z][a-z]{1,14}){1,2}\s*</p>'),
]


def strip_bylines(html: str) -> str:
    """Remove author bylines and standalone date lines from article HTML."""
    for pattern in _BYLINE_PATTERNS:
        html = pattern.sub("", html)
    # Collapse multiple blank lines left by removals
    html = re.sub(r'\n{3,}', '\n\n', html).strip()
    return html

_SYSTEM = """\
You are a content editor for a Turkish-language Africa business news site.

You will receive the body of a translated Turkish news article in HTML format.
Your task is to remove any content that does NOT belong to the main article body, such as:

- Recommended article links or teasers ("Önerilen makaleler", "Bunu kaçırmayın", "İlgili haberler", "Ayrıca okuyun")
- Newsletter or subscription prompts ("Bültene kaydolun", "Günlük güncelleme")
- Social media share prompts or follow-us text
- Author bylines, reporter names, or "Yazar:" lines (e.g. "James Tasamba", "By John Doe")
- Publication or update date lines (e.g. "02 Mayıs 2026 • Güncelleme: 02 Mayıs 2026")
- Author bio boxes that are not part of the article
- Cookie notices, privacy banners, or security verification text
- "Read also" / "See also" / "Don't miss" cross-promotions in any language
- Any UI element text, sidebar content, or promotional copy that is clearly not article journalism

Rules:
- Keep ALL actual news content intact. Do not summarize, shorten, or rewrite.
- Preserve all HTML tags exactly as they appear in the input.
- Do not add any new content.
- If the body is already clean with no boilerplate, return it unchanged.
- Return ONLY the cleaned HTML. No explanation, no commentary, no markdown fences."""


def clean_article_body(content_tr: str) -> str:
    """Remove off-topic promotional content and bylines from a translated Turkish article body.

    Returns the original content unchanged on API failure.
    """
    if not content_tr or len(content_tr) < 100:
        return content_tr

    content_tr = strip_bylines(content_tr)

    raw = chat(
        [{"role": "user", "content": content_tr}],
        model=GEMINI_FLASH_LITE,
        system=_SYSTEM,
        temperature=0.0,
        max_tokens=4096,
    )

    if not raw:
        logger.warning("clean_article_body: API failed, returning original")
        return content_tr

    cleaned = raw.strip()

    # Sanity check: result shouldn't be drastically shorter than original
    if len(cleaned) < len(content_tr) * 0.3:
        logger.warning(
            "clean_article_body: result suspiciously short (%d vs %d chars), keeping original",
            len(cleaned), len(content_tr),
        )
        return content_tr

    if cleaned != content_tr:
        logger.info("clean_article_body: removed boilerplate (%d -> %d chars)", len(content_tr), len(cleaned))

    return cleaned
