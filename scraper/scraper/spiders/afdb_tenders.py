"""Spider for African Development Bank (AfDB) tenders."""
import re
from datetime import datetime, timezone
from urllib.parse import urljoin

import scrapy
from scrapy.http import Response

from scraper.spiders.base_tender_spider import BaseTenderSpider

_BASE = "https://projectsportal.afdb.org"
_START = f"{_BASE}/dataportal/VProject/show"

# AfDB date format is typically "DD-MMM-YYYY" or ISO-like
_DATE_FORMATS = ("%d-%b-%Y", "%Y-%m-%d", "%d/%m/%Y")


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


class AfdbTendersSpider(BaseTenderSpider):
    name = "afdb_tenders"
    allowed_domains = ["projectsportal.afdb.org"]
    start_urls = [_START]
    source_key = "afdb"

    def parse(self, response: Response):
        # Each row in the procurement table links to a project/tender detail
        for row in response.css("table.projects-table tbody tr, tr.project-row"):
            link = row.css("a::attr(href)").get()
            if not link:
                continue
            url = urljoin(_BASE, link)
            # Grab a rough deadline from the listing row if available
            deadline_text = row.css("td:nth-child(5)::text, .deadline::text").get()
            deadline_at = _parse_date(deadline_text)
            published_text = row.css("td:nth-child(4)::text, .published::text").get()
            published_at = _parse_date(published_text)

            if not self._is_in_window(deadline_at=deadline_at, published_at=published_at):
                continue

            yield response.follow(
                url,
                callback=self.parse_tender,
                meta={"deadline_at": deadline_at, "published_at": published_at},
            )

        # Follow pagination
        next_page = response.css("a.next-page::attr(href), a[rel='next']::attr(href)").get()
        if next_page:
            yield response.follow(next_page, callback=self.parse)

    def parse_tender(self, response: Response):
        title = (
            response.css("h1.project-title::text, h1::text").get()
            or response.css("meta[property='og:title']::attr(content)").get()
            or ""
        ).strip()
        if not title:
            return

        description = (
            " ".join(response.css("div.project-description *::text, div.description *::text").getall()).strip()
            or " ".join(response.css("main p::text").getall()).strip()
            or ""
        )

        reference_number = (
            response.css(".reference-number::text, .contract-ref::text, td.ref::text").get() or ""
        ).strip()

        institution = "African Development Bank"

        country = (
            response.css(".country::text, td.country::text, .project-country::text").get() or ""
        ).strip()

        raw_published = (
            response.css(".published-date::text, .date-published::text, time::attr(datetime)").get()
            or response.meta.get("published_at")
        )
        published_at = _parse_date(raw_published) if isinstance(raw_published, str) else response.meta.get("published_at")

        raw_deadline = (
            response.css(".deadline-date::text, .closing-date::text, .submission-deadline::text").get()
            or response.meta.get("deadline_at")
        )
        deadline_at = _parse_date(raw_deadline) if isinstance(raw_deadline, str) else response.meta.get("deadline_at")

        budget_text = (
            response.css(".budget::text, .project-cost::text, .estimated-cost::text").get() or ""
        ).strip()
        budget_usd = _parse_budget(budget_text)

        document_urls = [
            urljoin(_BASE, href)
            for href in response.css("a[href$='.pdf']::attr(href), a[href$='.doc']::attr(href), a[href$='.docx']::attr(href)").getall()
        ]

        contact_email = _extract_email(
            response.css(".contact-email::text, a[href^='mailto']::attr(href)").get() or ""
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
            if "million" in text.lower() or "M" in text:
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
