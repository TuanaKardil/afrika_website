import re
from datetime import datetime, timezone, timedelta
from email.utils import parsedate_to_datetime
from urllib.parse import urljoin

import scrapy
from scrapy.http import Response

from scraper.extractors import extract_content
from scraper.items import ArticleItem

_CUTOFF_DAYS = 7
_RSS_URL = "https://www.theafricareport.com/feed/"


class AfricaReportSpider(scrapy.Spider):
    name = "africa_report"
    allowed_domains = ["theafricareport.com"]

    def start_requests(self):
        cutoff = datetime.now(timezone.utc) - timedelta(days=_CUTOFF_DAYS)
        yield scrapy.Request(
            _RSS_URL,
            callback=self.parse_rss,
            meta={"cutoff": cutoff},
        )

    def parse_rss(self, response: Response):
        cutoff: datetime = response.meta["cutoff"]

        for item in response.xpath("//item"):
            link = item.xpath("link/text()").get("").strip()
            if not link:
                link = item.xpath("guid/text()").get("").strip()
            if not link or not link.startswith("http"):
                continue

            pub_date_str = item.xpath("pubDate/text()").get("").strip()
            try:
                pub_dt = parsedate_to_datetime(pub_date_str)
                if pub_dt.tzinfo is None:
                    pub_dt = pub_dt.replace(tzinfo=timezone.utc)
                if pub_dt < cutoff:
                    continue
            except Exception:
                pass

            yield scrapy.Request(
                link,
                callback=self.parse_article,
                meta={"published_at_rss": pub_date_str},
            )

    def parse_article(self, response: Response):
        datetime_str = (
            response.css("meta[property='article:published_time']::attr(content)").get()
            or response.css("time[datetime]::attr(datetime)").get()
            or response.css("time::attr(datetime)").get()
        )

        if datetime_str:
            try:
                published_at = datetime.fromisoformat(datetime_str.replace("Z", "+00:00"))
            except ValueError:
                published_at = _parse_rss_fallback(response.meta.get("published_at_rss", ""))
        else:
            published_at = _parse_rss_fallback(response.meta.get("published_at_rss", ""))

        if published_at is None:
            return

        if published_at.tzinfo is None:
            published_at = published_at.replace(tzinfo=timezone.utc)

        title = (
            response.css("h1.entry-title::text, h1.article-title::text").get()
            or response.css("h1::text").get()
            or ""
        ).strip()
        if not title:
            return

        author = (
            response.css(".author-name a::text, .byline-name::text").get()
            or response.css("[rel='author']::text").get()
            or ""
        ).strip()

        featured_image_url = (
            response.css("meta[property='og:image']::attr(content)").get()
            or response.css(".article-featured-image img::attr(src)").get()
            or response.css("figure img::attr(src)").get()
            or ""
        )

        image_credit = (
            response.css("figcaption::text, .image-credit::text").get()
            or ""
        ).strip()

        content_html = extract_content(response, source="africa_report")

        plain = re.sub(r"<[^>]+>", "", content_html)
        excerpt = plain[:200].strip()

        yield ArticleItem(
            source="africa_report",
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


def _parse_rss_fallback(pub_date_str: str) -> datetime | None:
    if not pub_date_str:
        return None
    try:
        dt = parsedate_to_datetime(pub_date_str)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception:
        return None


def _is_article(url: str) -> bool:
    return bool(re.search(r"theafricareport\.com/\d+/", url))
