import re
from datetime import datetime, timezone, timedelta
from urllib.parse import urljoin

import scrapy
from scrapy.http import Response

from scraper.extractors import extract_content
from scraper.items import ArticleItem

_CUTOFF_DAYS = 2
_BASE = "https://africa.businessinsider.com"


class BusinessInsiderAfricaSpider(scrapy.Spider):
    name = "business_insider"
    allowed_domains = ["africa.businessinsider.com"]

    def start_requests(self):
        cutoff = datetime.now(timezone.utc) - timedelta(days=_CUTOFF_DAYS)
        yield scrapy.Request(
            _BASE,
            callback=self.parse_index,
            meta={"cutoff": cutoff},
        )

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

        datetime_str = (
            response.css("time[datetime]::attr(datetime)").get()
            or response.css("meta[property='article:published_time']::attr(content)").get()
            or response.css("time::attr(datetime)").get()
        )
        if not datetime_str:
            return

        try:
            published_at = datetime.fromisoformat(datetime_str.replace("Z", "+00:00"))
        except ValueError:
            return

        if published_at.tzinfo is None:
            published_at = published_at.replace(tzinfo=timezone.utc)

        if published_at < cutoff:
            return

        title = (
            response.css("h1.post-title::text, h1[data-e2e='article-title']::text").get()
            or " ".join(response.css("h1 *::text").getall()).strip()
            or " ".join(response.css("h1::text").getall()).strip()
            or ""
        ).strip()
        if not title:
            return

        author = (
            response.css(".author-name::text, .byline-author-name::text").get()
            or response.css("[rel='author']::text").get()
            or ""
        ).strip()

        featured_image_url = (
            response.css("meta[property='og:image']::attr(content)").get()
            or response.css(".hero-image img::attr(src)").get()
            or response.css("figure img::attr(src)").get()
            or ""
        )

        image_credit = (
            response.css(".image-caption::text, .hero-image figcaption::text").get()
            or ""
        ).strip()

        content_html = extract_content(response, source="business_insider")

        plain = re.sub(r"<[^>]+>", "", content_html)
        excerpt = plain[:200].strip()

        yield ArticleItem(
            source="business_insider",
            source_url=response.url,
            title_original=title,
            excerpt_original=excerpt,
            content_original=content_html,
            author_original=author,
            published_at=published_at.isoformat(),
            featured_image_source_url=featured_image_url,
            image_credit=image_credit,
            is_update=False,
        )


def _is_article(url: str) -> bool:
    return bool(re.search(r"africa\.businessinsider\.com/local/[a-z-]+/[a-z0-9-]+/[a-z0-9]+$", url))
