"""Spider for African Union (AU) tenders.

Start URL corrected to /en/bids (the /en/tenders path returns 404).
HTML is Drupal 7 server-rendered; no JS required.
"""
from datetime import datetime, timezone
from urllib.parse import urljoin

from scrapy.http import Response

from scraper.spiders.base_tender_spider import BaseTenderSpider

_BASE = "https://au.int"
_START = f"{_BASE}/en/bids"

_DATE_FORMATS = ("%d %B %Y", "%B %d, %Y", "%Y-%m-%d", "%d/%m/%Y", "%d-%b-%Y")


def _parse_date(raw: str | None) -> datetime | None:
    if not raw:
        return None
    raw = raw.strip()
    # The content= attribute on span.date-display-single is ISO 8601 with tz offset
    try:
        dt = datetime.fromisoformat(raw)
        return dt.astimezone(timezone.utc).replace(tzinfo=timezone.utc)
    except ValueError:
        pass
    for fmt in _DATE_FORMATS:
        try:
            return datetime.strptime(raw, fmt).replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    return None


def _extract_email(raw: str) -> str | None:
    if not raw:
        return None
    raw = raw.replace("mailto:", "").strip()
    return raw if "@" in raw else None


_BROWSER_UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/124.0.0.0 Safari/537.36"
)


class AfricanUnionTendersSpider(BaseTenderSpider):
    name = "african_union_tenders"
    allowed_domains = ["au.int"]
    start_urls = [_START]
    source_key = "african_union"

    custom_settings = {
        "DOWNLOAD_DELAY": 3,
        "CONCURRENT_REQUESTS_PER_DOMAIN": 1,
        "USER_AGENT": _BROWSER_UA,
        "ROBOTSTXT_OBEY": True,
    }

    def parse(self, response: Response):
        # Drupal Views table: table.views-table tbody tr
        rows = response.css("table.views-table tbody tr")
        for row in rows:
            link = row.css("td.views-field-title a::attr(href)").get()
            if not link:
                continue
            url = urljoin(_BASE, link)

            # Display text ("May 18, 2026") is the actual deadline;
            # the content= RDF attribute holds the creation date, not the deadline.
            deadline_raw = row.css(
                "td.views-field-field-date span.date-display-single::text"
            ).get()
            deadline_at = _parse_date(deadline_raw)

            reference_number = (
                row.css("td.views-field-field-text-bidnumber::text").get() or ""
            ).strip()

            bid_type = (
                row.css("td.views-field-field-tags-documents a::text").get() or ""
            ).strip()

            if not self._is_in_window(deadline_at=deadline_at, published_at=None):
                continue

            yield response.follow(
                url,
                callback=self.parse_tender,
                meta={
                    "deadline_at": deadline_at,
                    "reference_number": reference_number,
                    "bid_type": bid_type,
                },
            )

        # The AU bids page shows all current bids on a single page
        # but follow pagination if it appears
        next_page = response.css(
            "li.pager__item--next a::attr(href), a[rel='next']::attr(href)"
        ).get()
        if next_page:
            yield response.follow(next_page, callback=self.parse)

    def parse_tender(self, response: Response):
        title = (
            response.css("h1.page-header::text, h1.node__title::text, h1::text").get()
            or response.css("meta[property='og:title']::attr(content)").get()
            or ""
        ).strip()
        if not title:
            return

        description = " ".join(
            response.css(
                "div.field--name-body *::text, div.node__content *::text, div.content *::text"
            ).getall()
        ).strip()

        reference_number = response.meta.get("reference_number") or (
            response.css(
                ".field--name-field-reference::text, .reference-number::text"
            ).get() or ""
        ).strip()

        deadline_at = response.meta.get("deadline_at")

        document_urls = [
            urljoin(_BASE, href)
            for href in response.css(
                "a[href$='.pdf']::attr(href), a[href$='.doc']::attr(href), a[href$='.docx']::attr(href)"
            ).getall()
        ]

        contact_email = _extract_email(
            response.css("a[href^='mailto']::attr(href)").get() or ""
        )

        source_url = response.url
        if not self._should_process(source_url, description):
            return

        yield {
            "source": self.source_key,
            "source_url": source_url,
            "title_original": title,
            "description_original": description,
            "reference_number": reference_number,
            "institution": "African Union Commission",
            "country": "Africa",
            "published_at": None,
            "deadline_at": deadline_at.isoformat() if deadline_at else None,
            "budget_usd": None,
            "document_urls": document_urls,
            "contact_email": contact_email,
        }
