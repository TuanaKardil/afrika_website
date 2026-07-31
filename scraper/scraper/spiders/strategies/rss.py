"""RSS/Atom acquisition strategy.

The feed's own date is applied against the cutoff BEFORE the article request is
issued, so an old feed entry costs nothing. The feed date is also forwarded as a
hint so extract_published_at has a fallback when the article page has no usable
date markup.
"""
from __future__ import annotations

import logging

from scrapy.http import Response

from scraper.spiders.base_news_spider import BaseNewsSpider

logger = logging.getLogger(__name__)


class RssNewsSpider(BaseNewsSpider):
    def entry_urls(self) -> list[str]:
        return [self.src.strategy.feed_url]

    def parse_entry(self, response: Response):
        response.selector.remove_namespaces()
        entries = response.xpath("//item") or response.xpath("//entry")
        if not entries:
            logger.warning("%s: no entries in feed %s", self.name, response.url)
            return

        seen: set[str] = set()
        for entry in entries:
            link = (
                entry.xpath("link/text()").get()
                or entry.xpath("link/@href").get()
                or entry.xpath("guid/text()").get()
                or ""
            ).strip()
            if not link.startswith("http") or link in seen:
                continue
            seen.add(link)
            if not self.is_article_url(link):
                continue

            raw_date = (
                entry.xpath("pubDate/text()").get()
                or entry.xpath("date/text()").get()
                or entry.xpath("published/text()").get()
                or entry.xpath("updated/text()").get()
                or ""
            ).strip()

            # A feed entry with no parseable date is still worth fetching: the
            # article page usually carries one, and parse_article re-checks.
            feed_date = self.parse_date(raw_date)
            if feed_date is not None and not self.within_window(feed_date):
                continue

            yield self.article_request(link, published_hint=raw_date)
