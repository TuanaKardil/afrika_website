import re
import bleach
from bs4 import BeautifulSoup

ALLOWED_TAGS = [
    "h2", "h3", "p", "blockquote", "ul", "ol", "li",
    "strong", "em", "figure", "figcaption", "img", "a",
]

ALLOWED_ATTRIBUTES = {
    "a": ["href", "title"],
    "img": ["src", "alt", "width", "height"],
    "figure": ["class"],
    "figcaption": ["class"],
}

_EM_DASH_RE = re.compile(r"[\u2014\u2013]|--")

# Tags whose entire content (not just the tag) should be removed
_STRIP_WITH_CONTENT = {"script", "style", "noscript", "iframe", "svg"}


def sanitize_html(raw_html: str) -> str:
    # Remove dangerous tags along with their inner content before bleach
    soup = BeautifulSoup(raw_html, "lxml")
    for tag in soup.find_all(_STRIP_WITH_CONTENT):
        tag.decompose()
    pre_cleaned = str(soup)

    cleaned = bleach.clean(
        pre_cleaned,
        tags=ALLOWED_TAGS,
        attributes=ALLOWED_ATTRIBUTES,
        strip=True,
        strip_comments=True,
    )
    return _EM_DASH_RE.sub(",", cleaned)
