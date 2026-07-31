import csv
import io
import logging
import re
import ssl
import urllib.request

import trafilatura
from bs4 import BeautifulSoup
from scrapy.http import Response

from scraper import sources

logger = logging.getLogger(__name__)

# Matches Datawrapper chart CDN URLs: datawrapper.dwcdn.net/{id}/{version}/
_DATAWRAPPER_RE = re.compile(r'datawrapper\.dwcdn\.net/([A-Za-z0-9]+)/(\d+)/')
_DATAWRAPPER_TIMEOUT = 8  # seconds

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

# Per-source CSS selector fallbacks now live in scraper/sources.py
# (Source.body_selectors), so they cannot drift from the rest of a source's
# configuration.

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

# Above this many inline images, the body container is almost certainly wrong.
_MAX_INLINE_IMAGES = 6

# Headings that are widget furniture rather than article sections.
_NOISE_HEADING_RE = re.compile(
    r"\s*(also read|read also|read more|related( (articles?|posts?|news|stories))?|"
    r"you may also like|more from|recommended( for you)?|trending|"
    r"share this|advertisement|sponsored|tags?|newsletter|subscribe)\s*[:.]?\s*",
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


def _strip_leading_bullets(html: str) -> str:
    """Remove a leading <ul> key-takeaways block that appears before the article body."""
    soup = BeautifulSoup(html, "lxml")
    body = soup.find("body") or soup
    children = [t for t in body.children if hasattr(t, "name") and t.name]
    if children and children[0].name == "ul":
        children[0].decompose()
        return str(soup)
    return html


def _fetch_datawrapper_tables(html: str) -> str:
    """Find Datawrapper embeds in page HTML and return their data as HTML tables.

    Business Insider Africa embeds ranking lists as Datawrapper charts.
    The CSV data is publicly available at dwcdn.net/{id}/{version}/dataset.csv.
    Returns an HTML string of one or more <table> blocks, or empty string if none found.
    """
    seen: set[str] = set()
    tables: list[str] = []

    for chart_id, version in _DATAWRAPPER_RE.findall(html):
        key = f"{chart_id}/{version}"
        if key in seen:
            continue
        seen.add(key)

        url = f"https://datawrapper.dwcdn.net/{chart_id}/{version}/dataset.csv"
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            ctx = ssl.create_default_context()
            ctx.check_hostname = False
            ctx.verify_mode = ssl.CERT_NONE
            with urllib.request.urlopen(req, timeout=_DATAWRAPPER_TIMEOUT, context=ctx) as resp:
                raw = resp.read().decode("utf-8", errors="replace")
        except Exception as exc:
            logger.warning("Datawrapper fetch failed for %s: %s", url, exc)
            continue

        rows = list(csv.reader(io.StringIO(raw), delimiter="\t"))
        if len(rows) < 2:
            continue

        # Strip emoji flag codes like ":ZA:" from cell values
        def clean(cell: str) -> str:
            return re.sub(r':[A-Z]{2}:\s*', '', cell).strip()

        header, *data_rows = rows
        th = "".join(f"<th>{clean(h)}</th>" for h in header)
        trs = "".join(
            "<tr>" + "".join(f"<td>{clean(c)}</td>" for c in row) + "</tr>"
            for row in data_rows if any(c.strip() for c in row)
        )
        tables.append(f"<table><thead><tr>{th}</tr></thead><tbody>{trs}</tbody></table>")
        logger.info("Fetched Datawrapper table %s (%d rows)", key, len(data_rows))

    return "\n".join(tables)


def _normalise_headings(html: str) -> str:
    """Remap source headings onto the h2/h3 pair the sanitizer allows.

    sanitize.ALLOWED_TAGS permits only h2 and h3, and bleach runs with
    strip=True, so any other heading loses its tag and KEEPS its text. A source
    that writes section headings as <h4> (Nairametrics does) therefore produced
    bare ALL-CAPS lines floating between paragraphs. Worse, the body then
    contained no headings at all, so add_h2_headings() invented its own H2s,
    which restated the very lines that had just been flattened: the article
    ended up saying each heading twice.

    The shallowest heading level actually present becomes h2 and everything
    below it becomes h3, so a document whose only headings are <h4> gets real
    H2s (satisfying MIN_H2 and suppressing AI remediation) while a document with
    a genuine h2/h4 hierarchy keeps two distinct levels.
    """
    if not html or not re.search(r"<h[1-6]\b", html, re.I):
        return html

    soup = BeautifulSoup(html, "html.parser")

    # Widget labels ("Also Read") ride along as headings. They are not article
    # content, and left in place they also break the level detection below: a
    # stray <h2>Also Read</h2> made 2 the top level, so the real <h4> section
    # headings were demoted to h3 and the body ended up with no H2 at all.
    for tag in soup.find_all(re.compile(r"^h[1-6]$")):
        text = tag.get_text(strip=True)
        if not text or _NOISE_HEADING_RE.fullmatch(text):
            tag.decompose()

    headings = soup.find_all(re.compile(r"^h[1-6]$"))
    if not headings:
        return str(soup)

    top = min(int(t.name[1]) for t in headings)
    for tag in headings:
        tag.name = "h2" if int(tag.name[1]) == top else "h3"
    return str(soup)


def extract_content(response: Response, source: str = "") -> str:
    html = _fix_lazy_images(response.text)

    result = trafilatura.extract(
        html,
        include_images=True,
        include_links=True,
        output_format="html",
        no_fallback=False,
        # Without this, trafilatura discards <strong>/<em>, so a source heading
        # written as <h4><strong>TEXT</strong></h4> arrives as plain TEXT and
        # every emphasis in the body is lost.
        include_formatting=True,
    )

    src = sources.get(source)

    if result and len(result) >= _MIN_LENGTH:
        if src is not None and src.strip_leading_bullets:
            result = _strip_leading_bullets(result)
    else:
        # CSS selector fallback: concatenate matched block HTML.
        selectors = list(src.body_selectors) if src else []
        result = ""
        for selector in selectors:
            blocks = response.css(selector)
            if blocks:
                result = " ".join(block.get() for block in blocks)
                break
        if not result:
            result = f"<p>{response.css('body').xpath('string()').get('').strip()}</p>"

    result = _normalise_headings(result)

    # Append any Datawrapper chart tables found in the page HTML.
    # These are JS-rendered embeds (ranking lists, tables) not captured by trafilatura.
    dw_tables = _fetch_datawrapper_tables(response.text)
    if dw_tables:
        result = result + "\n" + dw_tables

    return result


def extract_inline_images(response, source: str = "") -> list[str]:
    """Extract editorial inline image URLs from the article body only.

    Strips related-article widgets, sidebars, author bios, and other noise
    before scanning so only content images are returned.
    Returns a deduplicated list of absolute HTTP URLs.

    `source` scopes the search to that source's registered body container. This
    is not optional polish: when no selector matches, the search falls back to
    the whole <body>, and on Joomla (ecofin, business_in_cameroon) that pulled
    in the "most read" sidebar thumbnails, so every article ended up with the
    same ~11 junk images appended to it and uploaded to Storage.
    """
    soup = BeautifulSoup(response.text, "lxml")

    # Registry selectors first (per-source, precise), then the generic list.
    src_cfg = sources.get(source)
    selectors = list(src_cfg.body_selectors) if src_cfg else []
    selectors += [s for s in _ARTICLE_BODY_SELECTORS if s not in selectors]

    container = None
    for sel in selectors:
        container = soup.select_one(sel)
        if container:
            break
    if container is None:
        logger.warning(
            "No article body container matched for source=%r at %s; "
            "skipping inline images rather than scanning the whole page",
            source, getattr(response, "url", "")[:100],
        )
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

    # Backstop against a wrong body selector on a future source. A news article
    # carrying more than this many inline photos is rare; a container that
    # accidentally includes a sidebar produces exactly this signature (Ecofin
    # yielded 11 identical widget thumbnails on every article, which were then
    # uploaded to Storage and appended to every body). Dropping them is the safe
    # side: the featured image is unaffected and the body text is untouched.
    if len(urls) > _MAX_INLINE_IMAGES:
        logger.error(
            "INLINE IMAGE FLOOD: source=%r yielded %d inline images at %s, "
            "which almost always means the body selector is matching a sidebar. "
            "Dropping them; fix Source.body_selectors for this source.",
            source, len(urls), getattr(response, "url", "")[:100],
        )
        return []

    return urls
