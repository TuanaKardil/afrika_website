import json
import re
from datetime import datetime, timezone, timedelta
from urllib.parse import urljoin

import scrapy
from scrapy.http import Response

from scraper import sources
from scraper.items import ArticleItem

_SOURCE_SLUG = "cnbc_africa"
_CUTOFF_DAYS = sources.get(_SOURCE_SLUG).cutoff_days
_BASE = "https://www.cnbcafrica.com"
_START_URLS = [
    f"{_BASE}/",
    f"{_BASE}/tag/africa/",
    f"{_BASE}/tag/economy/",
]

_MIN_DESC_LEN = 100


class CNBCAfricaSpider(scrapy.Spider):
    name = "cnbc_africa"
    allowed_domains = ["cnbcafrica.com"]

    def start_requests(self):
        cutoff = datetime.now(timezone.utc) - timedelta(days=_CUTOFF_DAYS)
        for url in _START_URLS:
            yield scrapy.Request(url, callback=self.parse_index, meta={"cutoff": cutoff})

    def parse_index(self, response: Response):
        cutoff: datetime = response.meta["cutoff"]
        seen: set[str] = set()

        for href in response.css("a[href]::attr(href)").getall():
            url = urljoin(_BASE, href)
            if url in seen:
                continue
            if _is_article(url):
                seen.add(url)
                yield response.follow(
                    url,
                    callback=self.parse_article,
                    meta={"cutoff": cutoff},
                )

    def parse_article(self, response: Response):
        cutoff: datetime = response.meta["cutoff"]

        ld_json = _extract_ld_json(response)

        if "video" in (ld_json.get("@type") or "").lower():
            return

        pub_time_str = (
            response.css("meta[property='article:published_time']::attr(content)").get()
            or (ld_json.get("uploadDate") if ld_json else None)
            or response.css("time[datetime]::attr(datetime)").get()
        )
        if not pub_time_str:
            return

        try:
            published_at = datetime.fromisoformat(pub_time_str.replace("Z", "+00:00"))
        except ValueError:
            return

        if published_at.tzinfo is None:
            published_at = published_at.replace(tzinfo=timezone.utc)

        if published_at < cutoff:
            return

        title = (
            response.css("meta[property='og:title']::attr(content)").get()
            or (ld_json.get("name") if ld_json else None)
            or response.css("h1::text").get()
            or ""
        ).strip()
        if not title:
            return

        description = (
            response.css("meta[property='og:description']::attr(content)").get()
            or (ld_json.get("description") if ld_json else None)
            or ""
        ).strip()

        if len(description) < _MIN_DESC_LEN:
            return

        featured_image_url = (
            response.css("meta[property='og:image']::attr(content)").get()
            or (ld_json.get("thumbnailUrl") if ld_json else None)
            or ""
        )

        excerpt = description[:200]

        # Try to extract the real article body before falling back to og:description stub.
        # CNBC Africa is semi-paywalled; some pages expose body paragraphs in the HTML.
        content_html = _extract_body(response) or f"<p>{description}</p>"

        raw_caption = (
            response.css("figcaption::text").get()
            or response.css("meta[property='og:image:alt']::attr(content)").get()
            or ""
        ).strip()
        image_alt_source = _strip_caption_credit(raw_caption)

        yield ArticleItem(
            source=_SOURCE_SLUG,
            source_lang=sources.get(_SOURCE_SLUG).lang,
            source_url=response.url,
            title_original=title,
            excerpt_original=excerpt,
            content_original=content_html,
            author_original="",
            published_at=published_at.isoformat(),
            featured_image_source_url=featured_image_url,
            image_credit="",
            image_alt_source=image_alt_source,
            is_update=False,
        )


_BODY_CONTAINERS = [
    "div.article-body",
    "div.post-content",
    "div.entry-content",
    "article",
]

# Substance does not live in <p> alone. CNBC Africa routinely puts the core of
# a story in a bulleted list after a lead-in like "In a statement, Li said:".
# A p-only scrape stored that lead-in as the final sentence, so the article read
# as though it had been cut off mid-thought.
_BLOCK_SELECTOR = "p, blockquote, li"

_MIN_BODY_PARAGRAPHS = 3
_MIN_BODY_CHARS = 200


def _extract_body(response: Response) -> str | None:
    """Try each container in order and return its block-level content as HTML.

    Returns None if no container yields >= 3 blocks with >= 200 total characters,
    so the caller can fall back to the og:description stub.
    """
    for container in _BODY_CONTAINERS:
        root = response.css(container)
        if not root:
            continue

        blocks: list[tuple[str, str]] = []
        for node in root.css(_BLOCK_SELECTOR):
            # string(.) keeps text nested in <a>/<strong>/<em>; "::text" would
            # return only the direct text nodes and silently drop link text.
            text = " ".join((node.xpath("string(.)").get() or "").split())
            if text:
                blocks.append((node.root.tag, text))

        if len(blocks) < _MIN_BODY_PARAGRAPHS:
            continue
        if len(" ".join(t for _, t in blocks)) < _MIN_BODY_CHARS:
            continue

        # Re-emit in document order, grouping consecutive <li> back into a <ul>.
        html: list[str] = []
        in_list = False
        for tag, text in blocks:
            if tag == "li":
                if not in_list:
                    html.append("<ul>")
                    in_list = True
                html.append(f"<li>{text}</li>")
                continue
            if in_list:
                html.append("</ul>")
                in_list = False
            html.append(f"<p>{text}</p>")
        if in_list:
            html.append("</ul>")
        return "".join(html)
    return None


def _extract_ld_json(response: Response) -> dict:
    for script in response.css("script[type='application/ld+json']::text").getall():
        try:
            data = json.loads(script)
            if isinstance(data, list):
                data = data[0]
            if isinstance(data, dict):
                return data
        except Exception:
            pass
    return {}


_CREDIT_RE = re.compile(
    r"\s*[.\|]\s*(REUTERS|AFP|AP Photo|AP|Getty Images?|EPA|NurPhoto|Bloomberg|"
    r"Shutterstock|File Photo|©\s*\w+)[^$]*$",
    re.I,
)


def _strip_caption_credit(text: str) -> str:
    """Remove agency credits from figcaption, keeping only the visual description."""
    return _CREDIT_RE.sub("", text).strip().rstrip(",").strip()


def _is_article(url: str) -> bool:
    return bool(re.search(r"cnbcafrica\.com/20\d{2}/[a-z0-9-]+/?$", url))
