import json
import re
from datetime import datetime, timezone, timedelta
from urllib.parse import urljoin

import scrapy
from scrapy.http import Response

from scraper.items import ArticleItem

_CUTOFF_DAYS = 1
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

        image_alt_en = (
            response.css("meta[property='og:image:alt']::attr(content)").get()
            or ""
        ).strip()

        yield ArticleItem(
            source="cnbc_africa",
            source_url=response.url,
            title_original=title,
            excerpt_original=excerpt,
            content_original=content_html,
            author_original="",
            published_at=published_at.isoformat(),
            featured_image_source_url=featured_image_url,
            image_credit="",
            image_alt_en=image_alt_en,
            is_update=False,
        )


_BODY_SELECTORS = [
    "div.article-body p",
    "div.post-content p",
    "div.entry-content p",
    "article p",
]

_MIN_BODY_PARAGRAPHS = 3
_MIN_BODY_CHARS = 200


def _extract_body(response: Response) -> str | None:
    """Try CSS selectors in order and return joined <p> tags if enough content found.

    Returns None if no selector produces >= 3 paragraphs with >= 200 total characters,
    so the caller can fall back to og:description.
    """
    for selector in _BODY_SELECTORS:
        paragraphs = [p.strip() for p in response.css(f"{selector}::text").getall() if p.strip()]
        if len(paragraphs) >= _MIN_BODY_PARAGRAPHS:
            total_text = " ".join(paragraphs)
            if len(total_text) >= _MIN_BODY_CHARS:
                return "".join(f"<p>{p}</p>" for p in paragraphs)
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


def _is_article(url: str) -> bool:
    return bool(re.search(r"cnbcafrica\.com/20\d{2}/[a-z0-9-]+/?$", url))
