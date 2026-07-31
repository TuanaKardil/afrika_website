"""HTML index acquisition strategy.

Walks one or more section/index pages, collects links matching the registry's
article_re, and optionally paginates. Pagination is opt-in per source because
some sites (new_times_rwanda) disallow */page/* in robots.txt.

There is no date filter here: an index page rarely exposes a reliable timestamp,
so the cutoff is enforced in parse_article after the fetch.
"""
from __future__ import annotations

import logging
from urllib.parse import urljoin

from scrapy.http import Response

from scraper.spiders.base_news_spider import BaseNewsSpider

logger = logging.getLogger(__name__)


class HtmlIndexNewsSpider(BaseNewsSpider):
    def entry_urls(self) -> list[str]:
        return list(self.src.strategy.index_urls)

    def start_requests(self):
        for url in self.entry_urls():
            yield self.index_request(url, base=url, page=1)

    def index_request(self, url: str, base: str, page: int):
        import scrapy

        return scrapy.Request(
            url,
            callback=self.parse_entry,
            meta={"index_base": base, "index_page": page},
        )

    def parse_entry(self, response: Response):
        strategy = self.src.strategy
        found = 0
        seen: set[str] = set()

        for href in response.css("a[href]::attr(href)").getall():
            url = urljoin(response.url, href.strip())
            if url in seen or not self.is_article_url(url):
                continue
            seen.add(url)
            found += 1
            yield self.article_request(url)

        logger.info("%s: %d article links on %s", self.name, found, response.url)

        page = response.meta.get("index_page", 1)
        base = response.meta.get("index_base", response.url)
        # Only paginate while pages keep producing articles, so an out-of-range
        # page number does not spawn an endless chain.
        if strategy.page_param and found and page < strategy.max_pages:
            yield self.index_request(
                f"{base}{strategy.page_param}{page + 1}", base=base, page=page + 1
            )
