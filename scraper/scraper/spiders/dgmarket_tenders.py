"""Spider for dgMarket tenders (Africa region)."""
import re
from datetime import datetime, timezone
from urllib.parse import urljoin

import scrapy
from scrapy.http import Response

from scraper.spiders.base_tender_spider import BaseTenderSpider

_BASE = "https://www.dgmarket.com"
_START = f"{_BASE}/tenders/adminRegion-Africa.do"

_DATE_FORMATS = ("%d-%b-%Y", "%Y-%m-%d", "%d/%m/%Y", "%B %d, %Y", "%d %B %Y")


def _parse_date(raw: str | None) -> datetime | None:
    if not raw:
        return None
    raw = raw.strip()
    for fmt in _DATE_FORMATS:
        try:
            return datetime.strptime(raw, fmt).replace(tzinfo=timezone.utc)
        except ValueError:
            continue
    return None


class DgMarketTendersSpider(BaseTenderSpider):
    name = "dgmarket_tenders"
    allowed_domains = ["dgmarket.com"]
    start_urls = [_START]
    source_key = "dgmarket"

    def parse(self, response: Response):
        # dgMarket has a tabular listing of tenders
        for row in response.css(
            "table.tender-list tbody tr, tr.tender-row, div.tender-item"
        ):
            link = row.css("a::attr(href)").get()
            if not link:
                continue
            url = urljoin(_BASE, link)

            deadline_text = row.css(
                "td.deadline::text, td:nth-child(5)::text, .closing::text"
            ).get()
            deadline_at = _parse_date(deadline_text)

            published_text = row.css(
                "td.published::text, td:nth-child(4)::text, .pub-date::text"
            ).get()
            published_at = _parse_date(published_text)

            if not self._is_in_window(deadline_at=deadline_at, published_at=published_at):
                continue

            yield response.follow(
                url,
                callback=self.parse_tender,
                meta={"deadline_at": deadline_at, "published_at": published_at},
            )

        # Pagination
        next_page = response.css(
            "a[rel='next']::attr(href), a.next::attr(href), li.next a::attr(href)"
        ).get()
        if next_page:
            yield response.follow(next_page, callback=self.parse)

    def parse_tender(self, response: Response):
        title = (
            response.css("h1.tender-title::text, h1::text").get()
            or response.css("meta[property='og:title']::attr(content)").get()
            or ""
        ).strip()
        if not title:
            return

        description = (
            " ".join(
                response.css(
                    "div.tender-description *::text, div.description *::text, div.notice-body *::text"
                ).getall()
            ).strip()
            or ""
        )

        reference_number = (
            response.css(
                ".reference::text, .notice-no::text, .tender-number::text"
            ).get() or ""
        ).strip()

        institution = (
            response.css(".procuring-entity::text, .institution::text, .organization::text").get()
            or ""
        ).strip()

        country = (
            response.css(".country::text, td.country::text, .location::text").get() or ""
        ).strip()

        raw_published = response.css(
            "time::attr(datetime), .publication-date::text, .published-date::text"
        ).get()
        published_at = _parse_date(raw_published) or response.meta.get("published_at")

        raw_deadline = response.css(
            ".deadline::text, .closing-date::text, .bid-deadline::text"
        ).get()
        deadline_at = _parse_date(raw_deadline) or response.meta.get("deadline_at")

        budget_text = (
            response.css(".budget::text, .contract-value::text, .estimated-cost::text").get() or ""
        ).strip()
        budget_usd = _parse_budget(budget_text)

        document_urls = [
            urljoin(_BASE, href)
            for href in response.css(
                "a[href$='.pdf']::attr(href), a[href$='.doc']::attr(href), a[href$='.docx']::attr(href)"
            ).getall()
        ]

        contact_email = _extract_email(
            response.css("a[href^='mailto']::attr(href), .contact-email::text").get() or ""
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
            "institution": institution,
            "country": country,
            "published_at": published_at.isoformat() if published_at else None,
            "deadline_at": deadline_at.isoformat() if deadline_at else None,
            "budget_usd": budget_usd,
            "document_urls": document_urls,
            "contact_email": contact_email,
        }


def _parse_budget(text: str) -> float | None:
    if not text:
        return None
    text = text.replace(",", "").replace("USD", "").replace("$", "").strip()
    m = re.search(r"[\d.]+", text)
    if m:
        try:
            val = float(m.group())
            if "million" in text.lower():
                val *= 1_000_000
            return val
        except ValueError:
            pass
    return None


def _extract_email(raw: str) -> str | None:
    if not raw:
        return None
    raw = raw.replace("mailto:", "").strip()
    if "@" in raw:
        return raw
    return None
