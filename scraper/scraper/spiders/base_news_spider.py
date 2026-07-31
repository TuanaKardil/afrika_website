"""Abstract base class for news spiders, mirroring BaseTenderSpider.

Every news spider used to re-implement the same eight extraction steps (date,
title, author, image, alt, credit, body, excerpt) plus ArticleItem construction.
That logic lives here once; a strategy subclass only has to answer "where do the
article URLs come from", and a concrete source only has to name its slug:

    class NairametricsSpider(RssNewsSpider):
        name = "nairametrics"
        source_slug = "nairametrics"

Per-site quirks are handled by overriding a single extract_* method rather than
by copying the whole file.
"""
from __future__ import annotations

import json
import logging
import re
from abc import ABC, abstractmethod
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime

import scrapy
from dateutil import parser as dateparser
from scrapy.http import Response

from scraper import sources
from scraper.extractors import extract_content, extract_inline_images
from scraper.items import ArticleItem

logger = logging.getLogger(__name__)


class BaseNewsSpider(scrapy.Spider, ABC):
    """Shared article parsing for all news sources."""

    #: Key into scraper.sources.SOURCES. The only thing a trivial subclass sets.
    source_slug: str = ""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if not self.source_slug:
            raise ValueError(f"{type(self).__name__} must set source_slug")
        src = sources.get(self.source_slug)
        if src is None:
            raise ValueError(f"Unknown source slug: {self.source_slug!r}")
        self.src = src
        self.allowed_domains = list(src.allowed_domains)
        self.cutoff = datetime.now(timezone.utc) - timedelta(days=src.cutoff_days)

    @classmethod
    def update_settings(cls, settings):
        """Apply the registry's per-source download delay before the crawl starts."""
        super().update_settings(settings)
        src = sources.get(getattr(cls, "source_slug", "") or "")
        if src is not None and src.download_delay is not None:
            settings.set("DOWNLOAD_DELAY", src.download_delay, priority="spider")

    # -- strategy hook --------------------------------------------------------

    def start_requests(self):
        for url in self.entry_urls():
            yield scrapy.Request(url, callback=self.parse_entry)

    @abstractmethod
    def entry_urls(self) -> list[str]:
        """Feed/sitemap/index URLs the crawl starts from."""

    @abstractmethod
    def parse_entry(self, response: Response):
        """Turn an index/feed/sitemap page into requests to parse_article."""

    # -- shared helpers -------------------------------------------------------

    def is_article_url(self, url: str) -> bool:
        if self.src.exclude_url_re and re.search(self.src.exclude_url_re, url):
            return False
        pattern = getattr(self.src.strategy, "article_re", "")
        return bool(re.search(pattern, url)) if pattern else True

    def within_window(self, dt: datetime | None) -> bool:
        if dt is None:
            return False
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt >= self.cutoff

    def article_request(self, url: str, published_hint: str = "", **meta):
        """Build a request for an article page, carrying a date hint forward."""
        return scrapy.Request(
            url,
            callback=self.parse_article,
            meta={"published_hint": published_hint, **meta},
        )

    @staticmethod
    def parse_date(value: str | None) -> datetime | None:
        """Parse ISO-8601, RFC-2822, or prose ("Saturday, 25 July 2026 17:47").

        Always returns tz-aware UTC, or None. dateutil is the last resort
        because it is happy to interpret nonsense; the strict parsers go first.
        """
        if not value:
            return None
        text = value.strip()
        if not text:
            return None

        dt: datetime | None = None
        try:
            dt = datetime.fromisoformat(text.replace("Z", "+00:00"))
        except ValueError:
            try:
                dt = parsedate_to_datetime(text)
            except (TypeError, ValueError):
                try:
                    dt = dateparser.parse(text, fuzzy=True)
                except (ValueError, OverflowError, TypeError):
                    return None
        if dt is None:
            return None
        return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)

    def extract_date_from_selectors(self, response: Response) -> datetime | None:
        """Parse a human-readable date out of the registry's date_selectors."""
        for selector in self.src.date_selectors:
            for node in response.css(selector):
                text = " ".join(node.css("::text").getall()).strip()
                dt = self.parse_date(text)
                if dt is not None:
                    return dt
        return None

    @staticmethod
    def ld_json(response: Response) -> dict:
        """First JSON-LD object on the page, unwrapping @graph and top-level lists."""
        for raw in response.css("script[type='application/ld+json']::text").getall():
            try:
                data = json.loads(raw)
            except (ValueError, TypeError):
                continue
            candidates = data if isinstance(data, list) else [data]
            for entry in candidates:
                if not isinstance(entry, dict):
                    continue
                if "@graph" in entry and isinstance(entry["@graph"], list):
                    for node in entry["@graph"]:
                        if isinstance(node, dict) and node.get("datePublished"):
                            return node
                    continue
                return entry
        return {}

    # -- per-field extraction (override one of these for a site quirk) --------

    def extract_published_at(self, response: Response) -> datetime | None:
        ld = self.ld_json(response)
        for value in (
            response.css("meta[property='article:published_time']::attr(content)").get(),
            ld.get("datePublished"),
            ld.get("uploadDate"),
            response.css("time[datetime]::attr(datetime)").get(),
            response.css("time::attr(datetime)").get(),
            self.meta_hint(response),
        ):
            dt = self.parse_date(value)
            if dt is not None:
                return dt
        # Sites with no date markup at all (Joomla) keep it in page text.
        return self.extract_date_from_selectors(response)

    @staticmethod
    def meta_hint(response: Response) -> str:
        """response.meta["published_hint"], safe on responses with no request.

        Response.meta raises when the response is not tied to a request, which
        is the case for fixture-built responses in offline checks.
        """
        try:
            return response.meta.get("published_hint") or ""
        except AttributeError:
            return ""

    def extract_title(self, response: Response) -> str:
        ld = self.ld_json(response)
        return (
            response.css("meta[property='og:title']::attr(content)").get()
            or ld.get("headline")
            or ld.get("name")
            or " ".join(response.css("h1 *::text, h1::text").getall())
            or ""
        ).strip()

    def extract_author(self, response: Response) -> str:
        return (
            response.css(".author-name a::text, .byline-name::text").get()
            or response.css("[rel='author']::text").get()
            or response.css("meta[name='author']::attr(content)").get()
            or ""
        ).strip()

    def extract_featured_image(self, response: Response) -> str:
        url = (
            response.css("meta[property='og:image']::attr(content)").get()
            or response.css("figure img::attr(src)").get()
            or ""
        ).strip()
        return self.upgrade_image_url(url)

    def upgrade_image_url(self, url: str) -> str:
        """Swap a CMS thumbnail for its full-size rendition, per the registry.

        The WebP ladder in storage.py never upscales, so a thumbnail source caps
        every variant the site can serve. Joomla links the 290px "_S" rendition;
        without this rewrite the article hero was a 290px image stretched across
        a 1600px box.
        """
        rewrite = self.src.featured_image_rewrite
        if not url or not rewrite:
            return url
        pattern, replacement = rewrite
        return re.sub(pattern, replacement, url)

    def extract_image_alt(self, response: Response) -> str:
        for selector in self.src.image_alt_selectors:
            value = response.css(selector).get()
            if value and value.strip():
                return value.strip()
        return ""

    def extract_image_credit(self, response: Response) -> str:
        return (
            response.css("figcaption::text, .image-credit::text").get() or ""
        ).strip()

    def extract_body(self, response: Response) -> str:
        return extract_content(response, source=self.source_slug)

    # -- the shared article path ---------------------------------------------

    def parse_article(self, response: Response):
        published_at = self.extract_published_at(response)
        if not self.within_window(published_at):
            return

        title = self.extract_title(response)
        if not title:
            return

        content_html = self.extract_body(response)
        excerpt = re.sub(r"<[^>]+>", "", content_html)[:200].strip()
        inline_images = extract_inline_images(response, source=self.source_slug)

        # Some sites (capital_ethiopia) publish no og:image at all. The first
        # editorial inline image is a better featured image than nothing, and
        # extract_inline_images has already stripped logos and widget noise.
        featured = self.extract_featured_image(response)
        if not featured and inline_images:
            featured = inline_images[0]

        yield ArticleItem(
            source=self.source_slug,
            source_lang=self.src.lang,
            source_url=response.url,
            title_original=title,
            excerpt_original=excerpt,
            content_original=content_html,
            author_original=self.extract_author(response),
            published_at=published_at.isoformat(),
            featured_image_source_url=featured,
            image_credit=self.extract_image_credit(response),
            image_alt_source=self.extract_image_alt(response),
            inline_image_urls=inline_images,
            is_update=False,
        )
