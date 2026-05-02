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

_MIN_DESC_LEN = 80


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
        content_html = f"<p>{description}</p>"

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
            is_update=False,
        )


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
    return bool(
        re.search(r"cnbcafrica\.com/media/\d+/[a-z0-9-]+/?$", url)
        or re.search(r"cnbcafrica\.com/20\d{2}/[a-z0-9-]+/?$", url)
    )
