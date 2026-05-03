"""Spider for Mali government tenders (DGMP).

All ~1700 rows are pre-rendered in a single DataTables page.
Links go directly to documents (no detail page).
Source: https://dgmp.gouv.ml/?q=node/71
"""
from datetime import datetime, timezone, timedelta
from urllib.parse import urljoin

from scrapy.http import Response

from scraper.spiders.base_tender_spider import BaseTenderSpider

_BASE = "https://dgmp.gouv.ml"
_START = f"{_BASE}/?q=node/71"

_BROWSER_UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)


def _parse_date(raw: str | None) -> datetime | None:
    if not raw:
        return None
    raw = raw.strip()
    for fmt in ("%d/%m/%Y", "%Y-%m-%d", "%d-%m-%Y"):
        try:
            return datetime.strptime(raw, fmt).replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    return None


class MaliTendersSpider(BaseTenderSpider):
    name = "mali_tenders"
    allowed_domains = ["dgmp.gouv.ml"]
    start_urls = [_START]
    source_key = "mali"

    custom_settings = {
        "DOWNLOAD_DELAY": 3,
        "CONCURRENT_REQUESTS_PER_DOMAIN": 1,
        "USER_AGENT": _BROWSER_UA,
        "ROBOTSTXT_OBEY": True,
    }

    def parse(self, response: Response):
        # Mali updates infrequently and has no deadline field; use 30-day window
        cutoff = datetime.now(timezone.utc) - timedelta(days=30)

        # All rows are rendered in table.DataTable; first row is the header
        for row in response.css("table.DataTable tr"):
            cells = row.css("td")
            if not cells:
                continue

            institution = (cells[0].css("::text").get() or "").strip()
            service = (cells[1].css("::text").get() or "").strip()
            title = (cells[2].css("::text").get() or "").strip()
            date_raw = (cells[3].css("::text").get() or "").strip()
            published_at = _parse_date(date_raw)

            if not title:
                continue

            # Filter to last 7 days only (no deadline field on this source)
            if published_at and published_at < cutoff:
                continue

            doc_href = cells[4].css("a::attr(href)").get() if len(cells) > 4 else None
            doc_url = urljoin(_BASE, doc_href) if doc_href else None

            source_url = doc_url or f"{_BASE}/?q=node/71#{title[:40]}"
            if not self._should_process(source_url, title):
                continue

            full_institution = f"{institution} — {service}".strip(" —") if service else institution

            yield {
                "source": self.source_key,
                "source_url": source_url,
                "title_original": title,
                "description_original": "",
                "reference_number": "",
                "institution": full_institution,
                "country": "Mali",
                "published_at": published_at.isoformat() if published_at else None,
                "deadline_at": None,
                "budget_usd": None,
                "document_urls": [doc_url] if doc_url else [],
                "contact_email": None,
            }
