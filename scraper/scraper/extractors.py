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
    # Newspaper-theme ad blocks (capital_ethiopia): td-a-rec, td_spot_img_all
    r"td-a-rec|td_spot|adsense|doubleclick|dfp-|ad-?container|"
    # Card/list widgets that embed OTHER articles inside the body container
    # (theafricareport: div.list-folder > article.card-horizontal).
    # "teaser" is deliberately NOT here: plenty of themes use it for the
    # article's own standfirst.
    r"list-folder|card-horizontal|card-list|"
    r"also-read|read-more|you-may|see-also|explore-more",
    re.I,
)

# Above this many inline images, the body container is almost certainly wrong.
_MAX_INLINE_IMAGES = 6

# The article's OWN header block, which must survive the "header" noise token.
_OWN_HEADER_RE = re.compile(r"\b(article|post|entry|story|single)[-_]{0,2}header\b", re.I)

# Headings that open a related-articles block rather than an article section.
# Prefix match, not full match: real widgets add a suffix ("Related Coverage:
# Features"). Multilingual because the FR and PT sources carry their own
# wording ("a lire aussi", "leia tambem").
_NOISE_HEADING_RE = re.compile(
    r"^\s*("
    r"also read|read also|read more|related\b|you may also like|more from|"
    r"recommended|trending|most read|editor'?s picks?|"
    r"share this|advertisement|sponsored|tags?|newsletter|subscribe"
    r"|à lire aussi|a lire aussi|lire aussi|voir aussi|sur le m[êe]me sujet"
    r"|leia tamb[ée]m|veja tamb[ée]m|mais not[íi]cias"
    r")\b",
    re.I,
)

# URL fragments that indicate non-editorial images
_NOISE_URL_PATTERN = re.compile(
    r"(logo|icon|avatar|spinner|placeholder|pixel|tracking|"
    r"1x1|spacer|author|profile|headshot|badge|flag|"
    # Follow/share call-to-action badges. medias24 puts a "GoogleNews.jpg"
    # button inside the article body itself, so it survives container scoping
    # and has to be matched by name.
    r"googlenews|google-news|follow-us|followus|whatsapp|telegram|"
    r"facebook|twitter|linkedin|instagram|subscribe)",
    re.I,
)

# WordPress and most CMSes encode the rendition size in the filename
# ("-150x150.jpg"). Anything whose shorter side is below this is a related-post
# or gallery thumbnail, never body art.
_MIN_NAMED_DIMENSION = 400
_NAMED_DIMENSION_RE = re.compile(r"-(\d{2,4})x(\d{2,4})\.(?:jpe?g|png|webp|gif)$", re.I)

# Standard IAB ad slot dimensions. capital_ethiopia serves a 300x250 house ad
# inside the article body on every article, under a hash filename that no name
# based rule can catch.
_AD_DIMENSIONS = {
    (300, 250), (336, 280), (728, 90), (970, 250), (970, 90),
    (160, 600), (300, 600), (320, 50), (320, 100), (468, 60), (250, 250),
}


def _is_noise_image(src: str, width: str = "", height: str = "") -> bool:
    """True when an image URL is furniture rather than article art."""
    if not src:
        return True
    if _NOISE_URL_PATTERN.search(src):
        return True

    named = _NAMED_DIMENSION_RE.search(src)
    if named:
        w, h = int(named.group(1)), int(named.group(2))
        if (w, h) in _AD_DIMENSIONS or min(w, h) < _MIN_NAMED_DIMENSION:
            return True

    try:
        if width and height and (int(width), int(height)) in _AD_DIMENSIONS:
            return True
    except (TypeError, ValueError):
        pass
    return False


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
        if not (_NOISE_PATTERN.search(classes) or _NOISE_PATTERN.search(tag_id)):
            continue
        # "header" is a noise token, but "article__header" is the article's own
        # title/standfirst block. Removing it cost 47 words of real copy on
        # theafricareport before this exception existed.
        if _OWN_HEADER_RE.search(classes) or _OWN_HEADER_RE.search(tag_id):
            continue
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


def _strip_noise_images(html: str) -> str:
    """Drop furniture images from already-extracted body HTML.

    extract_inline_images() filters the images it collects, but images that
    trafilatura leaves INSIDE the body were never checked, and StoragePipeline
    uploads every <img> it finds in content_original. That second, unfiltered
    path is how a "follow us on Google News" button ended up stored and rendered
    under six medias24 articles, and a 300x250 house ad under every
    capital_ethiopia one.
    """
    if not html or "<img" not in html:
        return html
    soup = BeautifulSoup(html, "html.parser")
    for img in soup.find_all("img"):
        src = _real_src(img)
        if _is_noise_image(src, img.get("width") or "", img.get("height") or ""):
            (img.find_parent("figure") or img).decompose()
    return str(soup)


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

    # A related-articles widget flattens into a heading ("Related Coverage",
    # "a lire aussi") followed by the linked articles' own titles as sibling
    # headings. Removing only the label leaves those titles behind, so the whole
    # tail goes: thebftonline appended 7 unrelated headlines to every article,
    # medias24 six. These blocks always sit after the body, so anything from the
    # label onwards is discarded.
    #
    # Empty headings go too: a stray <h2></h2> otherwise fixed the top level and
    # blocked the promotion below.
    top_level = soup if soup.find("body") is None else soup.find("body")
    for tag in list(top_level.find_all(re.compile(r"^h[1-6]$"))):
        text = tag.get_text(strip=True)
        if not text:
            tag.decompose()
            continue
        if _NOISE_HEADING_RE.match(text):
            for sibling in list(tag.next_siblings):
                sibling.extract()
            tag.decompose()

    headings = soup.find_all(re.compile(r"^h[1-6]$"))
    if not headings:
        return str(soup)

    top = min(int(t.name[1]) for t in headings)
    for tag in headings:
        tag.name = "h2" if int(tag.name[1]) == top else "h3"
    return str(soup)


# Containers that embed OTHER articles inside the body. Deliberately narrow:
# this runs on the WHOLE page before extraction, where the broader
# _NOISE_PATTERN is far too blunt (applied page-wide it took the article body
# with it, cutting The Conversation from 802 words to 21).
_EMBEDDED_ARTICLES_RE = re.compile(
    r"list-folder|card-horizontal|card-list|related-(articles?|posts?|stories)|"
    r"more-stories|you-may-also|also-read",
    re.I,
)


def _prestrip_embedded_articles(html: str) -> str:
    """Drop blocks that embed OTHER articles before trafilatura sees the page.

    theafricareport nests a div.list-folder of related stories INSIDE
    div.article__content, so container scoping cannot exclude it: four photos
    from unrelated British news stories were extracted, uploaded and rendered
    under an article about African pension funds, and the same photo turned up
    across several articles.

    Only the embedded-article containers go. Anything wider risks the body.
    """
    if not html or not _EMBEDDED_ARTICLES_RE.search(html):
        return html
    try:
        soup = BeautifulSoup(html, "html.parser")
        # Collect first: decomposing while iterating leaves detached nodes in
        # the generator and blows up on the next .get().
        doomed = [
            tag for tag in soup.find_all(True)
            if _EMBEDDED_ARTICLES_RE.search(
                " ".join(tag.get("class") or []) + " " + (tag.get("id") or "")
            )
        ]
        for tag in doomed:
            tag.decompose()
        return str(soup)
    except Exception as exc:  # never let cleanup cost us the article
        logger.warning("embedded-article pre-strip failed, using raw html: %s", exc)
        return html


def extract_content(response: Response, source: str = "") -> str:
    html = _prestrip_embedded_articles(_fix_lazy_images(response.text))

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
    result = _strip_noise_images(result)

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

        # Skip furniture: logos, follow badges, sized thumbnails, ad slots.
        if _is_noise_image(src, img.get("width") or "", img.get("height") or ""):
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
