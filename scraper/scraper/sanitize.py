import re
import bleach
from bs4 import BeautifulSoup

ALLOWED_TAGS = [
    "h2", "h3", "p", "blockquote", "ul", "ol", "li",
    "strong", "em", "figure", "figcaption", "img",
]

ALLOWED_ATTRIBUTES = {
    "img": ["src", "alt", "width", "height"],
    "figure": ["class"],
    "figcaption": ["class"],
}

_EM_DASH_RE = re.compile(r"[\u2014\u2013]|--")

# Tags whose entire content (not just the tag) should be removed
_STRIP_WITH_CONTENT = {"script", "style", "noscript", "iframe", "svg"}

# Boilerplate patterns in both English and Turkish \u2014 matched against plain text of each block.
# Only applied to short blocks (< 500 chars) to avoid removing real article content.
BOILERPLATE_RE = re.compile(
    r"(newsletter|subscribe|sign[\s-]?up|b\u00fclten|kaydol|"
    r"security verification|g\u00fcvenlik do\u011frulama|captcha|"
    r"terms of (?:use|service)|privacy policy|kullan\u0131m ko\u015ful|gizlilik politika|"
    r"preferred source|tercih etti\u011finiz kaynak|"
    r"daily update|g\u00fcnl\u00fck g\u00fcncelleme|"
    r"set .{0,40} as your preferred|"
    r"never miss a moment|hi\u00e7bir an\u0131n\u0131 ka\u00e7\u0131rmay\u0131n|"
    r"straight to your inbox|gelen kutunuza|"
    r"breaking (?:news|business news) and insights|"
    r"don'?t miss|bunu ka\u00e7\u0131rmay\u0131n|ka\u00e7\u0131rmay\u0131n[\s:!]|"
    r"also read|read also|read more[\s:!]|see also|"
    r"you may also like|ilginizi \u00e7ekebilir|"
    r"ayr\u0131ca oku|okuyun[\s:!]|ilgili haber)",
    re.IGNORECASE,
)


def _prune_boilerplate(soup: BeautifulSoup) -> None:
    """Remove short block elements containing promotional/UI boilerplate text."""
    for tag in soup.find_all(["p", "div", "section", "aside", "h2", "h3"]):
        text = tag.get_text(" ", strip=True)
        if len(text) < 500 and BOILERPLATE_RE.search(text):
            tag.decompose()


def sanitize_html(raw_html: str) -> str:
    soup = BeautifulSoup(raw_html, "lxml")
    for tag in soup.find_all(_STRIP_WITH_CONTENT):
        tag.decompose()
    _prune_boilerplate(soup)
    pre_cleaned = str(soup)

    cleaned = bleach.clean(
        pre_cleaned,
        tags=ALLOWED_TAGS,
        attributes=ALLOWED_ATTRIBUTES,
        strip=True,
        strip_comments=True,
    )
    return _EM_DASH_RE.sub(",", cleaned)
