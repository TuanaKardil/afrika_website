import re
from datetime import datetime, timezone, timedelta
from urllib.parse import urljoin

import scrapy
from scrapy.http import Response

from scraper.extractors import extract_content
from scraper.items import ArticleItem

# Article URL pattern for BBC Africa
_ARTICLE_RE = re.compile(r"/news/(?:world-africa|articles)/[\w-]+-\d+|/news/articles/[\w-]+")

_CUTOFF_DAYS = 30


class BbcAfricaSpider(scrapy.Spider):
    name = "bbc_africa"
    allowed_domains = ["bbc.com", "bbc.co.uk"]

    start_urls = [
        "https://www.bbc.com/news/world/africa",
    ]

    def parse(self, response: Response):
        cutoff = datetime.now(timezone.utc) - timedelta(days=_CUTOFF_DAYS)

        for href in response.css("a::attr(href)").getall():
            if href and _ARTICLE_RE.search(href):
                url = urljoin("https://www.bbc.com", href)
                yield response.follow(url, callback=self.parse_article,
                                      meta={"cutoff": cutoff})

        # Follow pagination links if present
        next_page = response.css("a.lx-pagination__next::attr(href)").get()
        if next_page:
            yield response.follow(next_page, callback=self.parse,
                                  meta={"cutoff": cutoff})

    def parse_article(self, response: Response):
        cutoff: datetime = response.meta["cutoff"]

        # Published date
        datetime_str = (
            response.css("time[datetime]::attr(datetime)").get()
            or response.css("[data-testid='timestamp'] time::attr(datetime)").get()
        )
        if not datetime_str:
            return

        try:
            published_at = datetime.fromisoformat(datetime_str.replace("Z", "+00:00"))
        except ValueError:
            return

        if published_at < cutoff:
            return

        title = (
            response.css("h1::text").get()
            or response.css("[data-testid='headline']::text").get()
            or ""
        ).strip()
        if not title:
            return

        author = (
            response.css("[data-testid='byline-name']::text").get()
            or response.css(".ssrcss-68pt20-Text-TextContributorName::text").get()
            or ""
        ).strip()

        # Featured image
        featured_image_url = (
            response.css("figure img::attr(src)").get()
            or response.css("[data-testid='hero-image'] img::attr(src)").get()
            or ""
        )

        image_credit = (
            response.css("figure figcaption::text").get()
            or response.css("[data-testid='image-metadata-caption']::text").get()
            or ""
        ).strip()

        content_html = extract_content(response, source="bbc")

        # First 200 chars of plain text as excerpt
        plain_text = re.sub(r"<[^>]+>", "", content_html)
        excerpt = plain_text[:200].strip()

        item = ArticleItem(
            source="bbc",
            source_url=response.url,
            title_original=title,
            excerpt_original=excerpt,
            content_original=content_html,
            author_original=author,
            published_at=published_at.isoformat(),
            featured_image_source_url=featured_image_url,
            image_credit=image_credit,
            category_slug=None,  # classified in Phase 4
            region_slug="afrika",  # refined in Phase 4
            is_update=False,
        )
        yield item
