import re
from datetime import datetime, timezone, timedelta
from urllib.parse import urljoin

import scrapy
from scrapy.http import Response

from scraper.extractors import extract_content
from scraper.items import ArticleItem

_CUTOFF_DAYS = 2
_MAX_PAGES = 3

_SECTIONS = ["business", "politics", "health", "technology", "environment"]

_BASE = "https://theconversation.com"


class ConversationAfricaSpider(scrapy.Spider):
    name = "conversation_africa"
    allowed_domains = ["theconversation.com"]

    def start_requests(self):
        cutoff = datetime.now(timezone.utc) - timedelta(days=_CUTOFF_DAYS)
        for section in _SECTIONS:
            url = f"{_BASE}/africa/{section}"
            yield scrapy.Request(
                url,
                callback=self.parse_section,
                meta={"cutoff": cutoff, "page": 1, "section": section},
            )

    def parse_section(self, response: Response):
        cutoff: datetime = response.meta["cutoff"]
        page: int = response.meta["page"]
        section: str = response.meta["section"]

        found_any = False

        for link in response.css("a[href]::attr(href)").getall():
            url = urljoin(_BASE, link)
            if theconversation_is_article(url):
                found_any = True
                yield response.follow(
                    url,
                    callback=self.parse_article,
                    meta={"cutoff": cutoff},
                )

        if found_any and page < _MAX_PAGES:
            next_url = f"{_BASE}/africa/{section}?page={page + 1}"
            yield scrapy.Request(
                next_url,
                callback=self.parse_section,
                meta={"cutoff": cutoff, "page": page + 1, "section": section},
            )

    def parse_article(self, response: Response):
        cutoff: datetime = response.meta["cutoff"]

        datetime_str = (
            response.css("time.entry-date::attr(datetime)").get()
            or response.css("time[itemprop='datePublished']::attr(datetime)").get()
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

        title = " ".join(
            response.css("h1.entry-title *::text, h1[itemprop='headline'] *::text").getall()
        ).strip() or " ".join(response.css("h1 *::text").getall()).strip()
        if not title:
            return

        author = (
            response.css(".fn.author-name::text").get()
            or response.css("[itemprop='name']::text").get()
            or response.css(".author-name a::text").get()
            or ""
        ).strip()

        featured_image_url = (
            response.css("meta[property='og:image']::attr(content)").get()
            or response.css(".ultra-wide-lead-image picture img::attr(src)").get()
            or response.css("figure img::attr(src)").get()
            or ""
        )

        image_credit = (
            response.css(".ultra-wide-lead-image figcaption::text").get()
            or response.css("figure figcaption::text").get()
            or ""
        ).strip()

        content_html = extract_content(response, source="the_conversation")

        plain_text = re.sub(r"<[^>]+>", "", content_html)
        excerpt = plain_text[:200].strip()

        yield ArticleItem(
            source="the_conversation",
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


def theconversation_is_article(url: str) -> bool:
    return bool(re.search(r"theconversation\.com/[\w-]+-\d+$", url))
