"""Sitemap acquisition strategy.

Handles both shapes:
  * <urlset> with the Google-News namespace (news:publication_date gives the
    date without fetching the article, which is the whole point)
  * <sitemapindex>, which needs one hop to reach the children. Children are
    filtered and capped, because an archive sitemap would otherwise be walked
    end to end.

scrapy.spiders.SitemapSpider is deliberately not used: it wants to own
start_requests/_parse_sitemap and conflicts with BaseNewsSpider's flow.
"""
from __future__ import annotations

import logging

from scrapy.http import Response
from scrapy.utils.gz import gunzip

from scraper.spiders.base_news_spider import BaseNewsSpider

logger = logging.getLogger(__name__)


class SitemapNewsSpider(BaseNewsSpider):
    def entry_urls(self) -> list[str]:
        return [self.src.strategy.sitemap_url]

    @staticmethod
    def _selector(response: Response):
        """Return a namespace-free selector, transparently gunzipping .gz feeds."""
        if response.url.endswith(".gz"):
            body = gunzip(response.body)
            response = response.replace(body=body)
        response.selector.remove_namespaces()
        return response.selector

    def parse_entry(self, response: Response):
        sel = self._selector(response)

        # <sitemapindex> -> follow children (bounded), then re-enter here.
        children = sel.xpath("//sitemap/loc/text()").getall()
        if children:
            limit = getattr(self.src.strategy, "max_children", 3)
            # Sitemaps are append-ordered, so the freshest URLs live in the LAST
            # child (thebftonline: articles-0 is entirely from a 2026-05 bulk
            # re-index, only articles-2 carries today's articles). Walking in
            # reverse means the in-window articles are found first instead of
            # after megabytes of archive.
            ordered = list(reversed(children))[:limit]
            for child in ordered:
                yield response.follow(child.strip(), callback=self.parse_entry)
            if len(children) > limit:
                logger.info(
                    "%s: sitemap index has %d children, following newest %d",
                    self.name, len(children), limit,
                )
            return

        count = 0
        for node in sel.xpath("//url"):
            loc = (node.xpath("loc/text()").get() or "").strip()
            if not loc:
                continue

            raw_date = (
                node.xpath("news/publication_date/text()").get()
                or node.xpath("lastmod/text()").get()
                or ""
            ).strip()
            # Unlike RSS, a sitemap entry with no date is NOT followed: sitemaps
            # routinely list the whole archive, so "no date" means "unbounded".
            if not self.within_window(self.parse_date(raw_date)):
                continue

            if not self.is_article_url(loc):
                continue

            count += 1
            yield self.article_request(loc, published_hint=raw_date)

        logger.info("%s: %d in-window articles from %s", self.name, count, response.url)
