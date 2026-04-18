import re
from datetime import datetime, timezone, timedelta
from urllib.parse import urljoin
import xml.etree.ElementTree as ET

import scrapy
from scrapy.http import Response

from scraper.extractors import extract_content
from scraper.items import ArticleItem

# Article URL pattern for BBC Africa
_ARTICLE_RE = re.compile(r"/news/(?:world-africa|articles)/[\w-]+-\d+|/news/articles/[\w-]+")

_CUTOFF_DAYS = 60

# BBC Africa RSS feeds covering the full region
_RSS_FEEDS = [
    "https://feeds.bbci.co.uk/news/world/africa/rss.xml",
]


class BbcAfricaSpider(scrapy.Spider):
    name = "bbc_africa"
    allowed_domains = ["bbc.com", "bbc.co.uk", "feeds.bbci.co.uk"]

    def start_requests(self):
        cutoff = datetime.now(timezone.utc) - timedelta(days=_CUTOFF_DAYS)
        # RSS feeds first (reliable, no JS needed)
        for feed_url in _RSS_FEEDS:
            yield scrapy.Request(feed_url, callback=self.parse_rss, meta={"cutoff": cutoff})
        # Main Africa hub page as fallback for articles not in RSS
        yield scrapy.Request(
            "https://www.bbc.com/news/world/africa",
            callback=self.parse_hub,
            meta={"cutoff": cutoff},
        )

    def parse_rss(self, response: Response):
        cutoff: datetime = response.meta["cutoff"]
        try:
            root = ET.fromstring(response.text)
        except ET.ParseError:
            return
        ns = {"atom": "http://www.w3.org/2005/Atom"}
        for item in root.iter("item"):
            link_el = item.find("link")
            if link_el is None or not link_el.text:
                continue
            url = link_el.text.strip()
            if _ARTICLE_RE.search(url):
                yield response.follow(url, callback=self.parse_article, meta={"cutoff": cutoff})

    def parse_hub(self, response: Response):
        cutoff: datetime = response.meta["cutoff"]
        for href in response.css("a::attr(href)").getall():
            if href and _ARTICLE_RE.search(href):
                url = urljoin("https://www.bbc.com", href)
                yield response.follow(url, callback=self.parse_article, meta={"cutoff": cutoff})

    def parse_article(self, response: Response):
        cutoff: datetime = response.meta["cutoff"]

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

        featured_image_url = (
            response.css("meta[property='og:image']::attr(content)").get()
            or response.css("figure img[src*='ichef.bbci']::attr(src)").get()
            or response.css("[data-testid='hero-image'] img::attr(src)").get()
            or ""
        )

        image_credit = (
            response.css("figure figcaption::text").get()
            or response.css("[data-testid='image-metadata-caption']::text").get()
            or ""
        ).strip()

        content_html = extract_content(response, source="bbc")

        plain_text = re.sub(r"<[^>]+>", "", content_html)
        excerpt = plain_text[:200].strip()

        yield ArticleItem(
            source="bbc",
            source_url=response.url,
            title_original=title,
            excerpt_original=excerpt,
            content_original=content_html,
            author_original=author,
            published_at=published_at.isoformat(),
            featured_image_source_url=featured_image_url,
            image_credit=image_credit,
            category_slug=None,
            region_slug="afrika",
            is_update=False,
        )
