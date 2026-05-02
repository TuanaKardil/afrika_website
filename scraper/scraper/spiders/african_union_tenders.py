"""Spider for African Union (AU) tenders."""
import re
from datetime import datetime, timezone
from urllib.parse import urljoin

import scrapy
from scrapy.http import Response

from scraper.spiders.base_tender_spider import BaseTenderSpider

_BASE = "https://au.int"
_START = f"{_BASE}/en/tenders"

_DATE_FORMATS = ("%d %B %Y", "%B %d, %Y", "%Y-%m-%d", "%d/%m/%Y", "%d-%b-%Y")


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


class AfricanUnionTendersSpider(BaseTenderSpider):
    name = "african_union_tenders"
    allowed_domains = ["au.int"]
    start_urls = [_START]
    source_key = "african_union"

    def parse(self, response: Response):
        # AU tenders listing page: rows or cards
        for item in response.css(
            "div.views-row, article.tender, li.tender-item, div.node--type-tender"
        ):
            link = item.css("a::attr(href)").get()
            if not link:
                continue
            url = urljoin(_BASE, link)

            deadline_text = item.css(
                ".field--name-field-deadline::text, .deadline::text, .closing-date::text"
            ).get()
            deadline_at = _parse_date(deadline_text)

            published_text = item.css(
                ".date-display-single::text, time::attr(datetime), .published::text"
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
            "a[rel='next']::attr(href), li.pager__item--next a::attr(href)"
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

        description = (
            " ".join(
                response.css(
                    "div.field--name-body *::text, div.node__content *::text, div.content *::text"
                ).getall()
            ).strip()
            or ""
        )

        reference_number = (
            response.css(
                ".field--name-field-reference::text, .reference-number::text"
            ).get() or ""
        ).strip()

        institution = "African Union Commission"

        country = "Africa"  # AU tenders are continent-wide by default

        raw_published = response.css(
            "time::attr(datetime), .date-display-single::text, .publication-date::text"
        ).get()
        published_at = _parse_date(raw_published) or response.meta.get("published_at")

        raw_deadline = response.css(
            ".field--name-field-deadline::text, .deadline::text, .closing-date::text"
        ).get()
        deadline_at = _parse_date(raw_deadline) or response.meta.get("deadline_at")

        budget_text = (
            response.css(
                ".field--name-field-budget::text, .budget::text, .contract-value::text"
            ).get() or ""
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
