"""Spider for Liberia PPCC procurement notices.

Drupal 10, server-rendered. Links go directly to documents (no detail page).
Currently ~6 items, no pagination.
Source: https://ppcc.gov.lr/opportunities/opportunities/procurement-notices
"""
from datetime import datetime, timezone
from urllib.parse import urljoin

from scrapy.http import Response

from scraper.spiders.base_tender_spider import BaseTenderSpider

_BASE = "https://ppcc.gov.lr"
_START = f"{_BASE}/opportunities/opportunities/procurement-notices"

_BROWSER_UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)


def _parse_date(raw: str | None) -> datetime | None:
    if not raw:
        return None
    raw = raw.strip()
    try:
        return datetime.fromisoformat(raw.replace("Z", "+00:00")).astimezone(timezone.utc)
    except ValueError:
        pass
    for fmt in ("%B %d, %Y", "%Y-%m-%d", "%d/%m/%Y"):
        try:
            return datetime.strptime(raw, fmt).replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    return None


class LiberiaTendersSpider(BaseTenderSpider):
    name = "liberia_tenders"
    allowed_domains = ["ppcc.gov.lr"]
    start_urls = [_START]
    source_key = "liberia"

    custom_settings = {
        "DOWNLOAD_DELAY": 2,
        "CONCURRENT_REQUESTS_PER_DOMAIN": 1,
        "USER_AGENT": _BROWSER_UA,
        "ROBOTSTXT_OBEY": True,
    }

    def parse(self, response: Response):
        for item in response.css("li.row-item-list"):
            # Closing date from ISO datetime attribute
            deadline_raw = item.css("div.eoi-date time::attr(datetime)").get()
            deadline_at = _parse_date(deadline_raw)

            # Title and doc link — the <a> inside the li
            link = item.css("a::attr(href)").get()
            title = (item.css("a::text").get() or "").strip()

            if not title and not link:
                continue

            doc_url = urljoin(_BASE, link) if link else None
            source_url = doc_url or f"{_START}#{title[:40]}"

            if not self._is_in_window(deadline_at=deadline_at, published_at=None):
                continue

            if not self._should_process(source_url, title):
                continue

            yield {
                "source": self.source_key,
                "source_url": source_url,
                "title_original": title,
                "description_original": "",
                "reference_number": "",
                "institution": "Public Procurement and Concessions Commission (PPCC)",
                "country": "Liberia",
                "published_at": None,
                "deadline_at": deadline_at.isoformat() if deadline_at else None,
                "budget_usd": None,
                "document_urls": [doc_url] if doc_url else [],
                "contact_email": None,
            }

        # Follow pagination if present
        next_page = response.css(
            "a[rel='next']::attr(href), li.pager__item--next a::attr(href)"
        ).get()
        if next_page:
            yield response.follow(next_page, callback=self.parse)
