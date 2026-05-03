"""Spider for Ghana e-Procurement System (GhanEPS) tenders.

European Dynamics Java EE platform, server-rendered. All active tenders
(currently ~65) fit on a single page at T01_ps=100.
Source: https://www.ghaneps.gov.gh/epps/quickSearchAction.do?searchSelect=6&T01_ps=100
"""
from datetime import datetime, timezone
from urllib.parse import urljoin

from scrapy.http import Response

from scraper.spiders.base_tender_spider import BaseTenderSpider

_BASE = "https://www.ghaneps.gov.gh"
_START = f"{_BASE}/epps/quickSearchAction.do?searchSelect=6&T01_ps=100"

_BROWSER_UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)

# Actual format from live page: "21/05/2026 10:00:00"
_DATE_FORMATS = (
    "%d/%m/%Y %H:%M:%S",
    "%d/%m/%Y",
    "%a %b %d %H:%M:%S GMT %Y",
    "%B %d, %Y",
    "%Y-%m-%d",
)


def _parse_date(raw: str | None) -> datetime | None:
    if not raw:
        return None
    raw = raw.strip()
    # Normalize multiple spaces
    raw = " ".join(raw.split())
    for fmt in _DATE_FORMATS:
        try:
            return datetime.strptime(raw, fmt).replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    return None


class GhanaTendersSpider(BaseTenderSpider):
    name = "ghana_tenders"
    allowed_domains = ["www.ghaneps.gov.gh"]
    start_urls = [_START]
    source_key = "ghana"

    custom_settings = {
        "DOWNLOAD_DELAY": 2,
        "CONCURRENT_REQUESTS_PER_DOMAIN": 1,
        "USER_AGENT": _BROWSER_UA,
        "ROBOTSTXT_OBEY": True,
    }

    def parse(self, response: Response):
        # Skip header row (first tr), parse all data rows
        for row in response.css("table#T01 tr:not(:first-child)"):
            cells = row.css("td")
            if len(cells) < 5:
                continue

            link = cells[1].css("a::attr(href)").get()
            title = (cells[1].css("a::text").get() or "").strip()
            if not title or not link:
                continue

            url = urljoin(_BASE, link)
            institution = (cells[2].css("::text").get() or "").strip()
            deadline_raw = " ".join(cells[4].css("::text").getall()).strip()
            deadline_at = _parse_date(deadline_raw)
            status = " ".join(cells[6].css("::text").getall()).strip() if len(cells) > 6 else ""
            published_raw = " ".join(cells[8].css("::text").getall()).strip() if len(cells) > 8 else ""
            published_at = _parse_date(published_raw)

            # PDF notice link
            pdf_href = cells[7].css("a::attr(href)").get() if len(cells) > 7 else None
            pdf_url = urljoin(_BASE, pdf_href) if pdf_href else None

            if not self._is_in_window(deadline_at=deadline_at, published_at=published_at):
                continue

            yield response.follow(
                url,
                callback=self.parse_tender,
                meta={
                    "title": title,
                    "institution": institution,
                    "deadline_at": deadline_at,
                    "published_at": published_at,
                    "status": status,
                    "pdf_url": pdf_url,
                },
            )

        # Pagination (DisplayTag): only if more than 100 results
        next_page = response.css("div.Pagination a:last-child::attr(href)").get()
        if next_page and "p=" in next_page:
            yield response.follow(next_page, callback=self.parse)

    def parse_tender(self, response: Response):
        # Prefer the title we already scraped from the listing; detail page title is often the site name
        title = (
            response.meta.get("title")
            or response.css("h1::text, h2.tender-title::text").get()
            or response.css("meta[property='og:title']::attr(content)").get()
            or ""
        ).strip()
        if not title:
            return

        description = " ".join(
            response.css("div.tender-description *::text, td.notice-content *::text, div.content *::text").getall()
        ).strip()

        reference_number = (
            response.css(".reference::text, .notice-ref::text, td.ref::text").get() or ""
        ).strip()

        institution = response.meta.get("institution") or (
            response.css(".procuring-entity::text").get() or ""
        ).strip()

        deadline_at = response.meta.get("deadline_at")
        published_at = response.meta.get("published_at")
        pdf_url = response.meta.get("pdf_url")

        document_urls = [pdf_url] if pdf_url else [
            urljoin(_BASE, href)
            for href in response.css("a[href$='.pdf']::attr(href)").getall()
        ]

        contact_email_raw = response.css("a[href^='mailto']::attr(href)").get() or ""
        contact_email = contact_email_raw.replace("mailto:", "").strip() or None

        source_url = response.url
        if not self._should_process(source_url, description or title):
            return

        yield {
            "source": self.source_key,
            "source_url": source_url,
            "title_original": title,
            "description_original": description,
            "reference_number": reference_number,
            "institution": institution,
            "country": "Ghana",
            "published_at": published_at.isoformat() if published_at else None,
            "deadline_at": deadline_at.isoformat() if deadline_at else None,
            "budget_usd": None,
            "document_urls": document_urls,
            "contact_email": contact_email,
        }
