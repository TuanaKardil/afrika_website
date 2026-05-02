import re

import trafilatura
from bs4 import BeautifulSoup
from scrapy.http import Response

# Minimum character threshold to accept trafilatura output
_MIN_LENGTH = 200

# Lazy-loading src attributes, ordered by preference
_LAZY_SRC_ATTRS = [
    "data-src",
    "data-lazy-src",
    "data-original",
    "data-delayed-url",
    "data-hi-res-src",
    "data-image-src",
]

# Per-source CSS selector fallbacks
_FALLBACK_SELECTORS: dict[str, list[str]] = {
    "business_insider": [
        ".content-lock-content",
        ".post-content",
        "article .content",
    ],
    "cnbc_africa": [
        ".entry-content",
        ".article-body",
        "article .content",
    ],
    "africa_report": [
        ".article-content",
        ".entry-content",
        "article .content",
    ],
    "aa_africa": [
        ".article-content",
        ".news-body",
        "article .content",
    ],
    "the_conversation": [
        ".content-body",
        "article .content",
        ".article__body",
    ],
}

# Selectors for article body container (tried in order, first match wins)
_ARTICLE_BODY_SELECTORS = [
    # Specific content containers (preferred)
    ".article__body",
    ".article-body",
    ".article-content",
    ".entry-content",
    ".post-content",
    ".content-body",
    ".content-lock-content",
    ".news-body",
    # Generic fallbacks
    "article",
    "main",
]

# Class/ID fragments that identify non-editorial noise sections
_NOISE_PATTERN = re.compile(
    r"recommend|relat|sidebar|trending|widget|advertisement|"
    r"promo|social|share|comment|newsletter|subscribe|"
    r"moreLike|section-element|author-bio|byline-block|"
    r"tag-list|breadcrumb|pagination|footer|header|"
    r"banner|popup|modal|overlay|sticky|ad-slot|"
    r"also-read|read-more|you-may|see-also|explore-more",
    re.I,
)

# URL fragments that indicate non-editorial images
_NOISE_URL_PATTERN = re.compile(
    r"(logo|icon|avatar|spinner|placeholder|pixel|tracking|"
    r"1x1|spacer|author|profile|headshot|badge|flag)",
    re.I,
)


def _real_src(img_tag) -> str:
    """Return the best available image URL from an <img> tag, handling lazy loading."""
    for attr in _LAZY_SRC_ATTRS:
        val = (img_tag.get(attr) or "").strip()
        if val and not val.startswith("data:") and len(val) > 10:
            return val

    for attr in ["data-srcset", "srcset"]:
        srcset = (img_tag.get(attr) or "").strip()
        if srcset:
            first = srcset.split(",")[0].split()[0].strip()
            if first and first.startswith("http"):
                return first

    src = (img_tag.get("src") or "").strip()
    if src and not src.startswith("data:") and len(src) > 10:
        return src

    return ""


def _fix_lazy_images(html: str) -> str:
    """Replace lazy-loading placeholder src values with the real image URL."""
    soup = BeautifulSoup(html, "lxml")
    changed = False
    for img in soup.find_all("img"):
        real = _real_src(img)
        current_src = (img.get("src") or "").strip()
        if real and real != current_src:
            img["src"] = real
            changed = True
    return str(soup) if changed else html


def _remove_noise_elements(container) -> None:
    """Strip non-editorial sub-elements (related articles, sidebars, widgets) in-place."""
    # Remove structural noise tags unconditionally
    for tag in container.find_all(["aside", "nav", "footer", "header", "script", "style", "noscript"]):
        tag.decompose()

    # Collect noise elements by class/id pattern (iterate separately to avoid mutation issues)
    to_remove = []
    for tag in container.find_all(True):
        classes = " ".join(tag.get("class") or [])
        tag_id = tag.get("id") or ""
        if _NOISE_PATTERN.search(classes) or _NOISE_PATTERN.search(tag_id):
            to_remove.append(tag)

    for tag in to_remove:
        try:
            tag.decompose()
        except Exception:
            pass


def extract_content(response: Response, source: str = "") -> str:
    html = _fix_lazy_images(response.text)

    result = trafilatura.extract(
        html,
        include_images=True,
        include_links=True,
        output_format="html",
        no_fallback=False,
    )

    if result and len(result) >= _MIN_LENGTH:
        return result

    # CSS selector fallback: concatenate matched block HTML
    selectors = _FALLBACK_SELECTORS.get(source, [])
    for selector in selectors:
        blocks = response.css(selector)
        if blocks:
            return " ".join(block.get() for block in blocks)

    # Last resort: raw body text wrapped in a paragraph
    return f"<p>{response.css('body').xpath('string()').get('').strip()}</p>"


def extract_inline_images(response) -> list[str]:
    """Extract editorial inline image URLs from the article body only.

    Strips related-article widgets, sidebars, author bios, and other noise
    before scanning so only content images are returned.
    Returns a deduplicated list of absolute HTTP URLs.
    """
    soup = BeautifulSoup(response.text, "lxml")

    # Find the most specific article body container
    container = None
    for sel in _ARTICLE_BODY_SELECTORS:
        container = soup.select_one(sel)
        if container:
            break
    if container is None:
        container = soup.find("body")
    if container is None:
        return []

    # Remove noise sections (related articles, sidebars, widgets, etc.)
    _remove_noise_elements(container)

    urls: list[str] = []
    seen: set[str] = set()

    for img in container.find_all("img"):
        src = _real_src(img)
        if not src or not src.startswith("http") or src in seen:
            continue

        # Skip tiny images (icons, tracking pixels, spacers)
        try:
            w = int(img.get("width") or 0)
            h = int(img.get("height") or 0)
            if (w and w < 100) or (h and h < 100):
                continue
        except (ValueError, TypeError):
            pass

        # Skip non-editorial URLs (logos, avatars, author photos, etc.)
        if _NOISE_URL_PATTERN.search(src):
            continue

        seen.add(src)
        urls.append(src)

    return urls
