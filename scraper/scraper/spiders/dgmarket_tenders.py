"""Spider for dgMarket tenders (Africa region).

URL corrected to list.do?sub=tenders-in-Africa (adminRegion-Africa.do returns 400).
dgMarket requires a session cookie obtained via a redirect chain through
web3-login.dgmarket.com; COOKIES_ENABLED must be True (set in custom_settings).
"""
import re
from datetime import datetime, timezone
from urllib.parse import urljoin, urlparse, parse_qs, urlencode, urlunparse

from scrapy.http import Response

from scraper.spiders.base_tender_spider import BaseTenderSpider

_BASE = "https://www.dgmarket.com"
_START = f"{_BASE}/tenders/list.do?sub=tenders-in-Africa&locationISO=_s"
_MAX_PAGES = 15  # ~300 tenders; stops before scanning all 1000+ pages

_DATE_FORMATS = ("%B %d, %Y", "%d-%b-%Y", "%Y-%m-%d", "%d/%m/%Y", "%d %B %Y")


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


def _extract_email(raw: str) -> str | None:
    if not raw:
        return None
    raw = raw.replace("mailto:", "").strip()
    return raw if "@" in raw else None


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


def _next_page_url(current_url: str, page: int) -> str:
    parsed = urlparse(current_url)
    qs = parse_qs(parsed.query, keep_blank_values=True)
    qs["selPageNumber"] = [str(page)]
    qs["d-446978-p"] = [str(page)]
    new_query = urlencode({k: v[0] for k, v in qs.items()})
    return urlunparse(parsed._replace(query=new_query))


class DgMarketTendersSpider(BaseTenderSpider):
    name = "dgmarket_tenders"
    allowed_domains = ["dgmarket.com", "web3-login.dgmarket.com"]
    start_urls = [_START]
    source_key = "dgmarket"

    custom_settings = {
        "DOWNLOAD_DELAY": 2,
        "CONCURRENT_REQUESTS_PER_DOMAIN": 1,
        "USER_AGENT": "AfrikaHaberleriBot/1.0 (+https://github.com/TuanaKardil/afrika_website)",
        "ROBOTSTXT_OBEY": False,
        "COOKIES_ENABLED": True,
    }

    def parse(self, response: Response):
        qs = parse_qs(urlparse(response.url).query)
        current_page = int(qs.get("selPageNumber", ["1"])[0])

        rows = response.css("tr.gridViewTableRow")
        any_in_window = False

        for row in rows:
            link = row.css("div.ln_notice_title a::attr(href)").get()
            if not link:
                continue
            url = urljoin(_BASE, link)

            title = (row.css("div.ln_notice_title a::text").get() or "").strip()

            published_raw = row.css("div.ln_date::text").get()
            published_at = _parse_date(published_raw)

            country = (
                row.css("a[href*='tenders-in-']::text").get() or ""
            ).strip()

            tender_type = ""
            for p in row.css("p"):
                if "type_icon" in (p.css("span::attr(class)").get() or ""):
                    tender_type = (p.css("span.ln_listing::text").get() or "").strip()
                    break

            if not self._is_in_window(deadline_at=None, published_at=published_at):
                continue

            any_in_window = True
            yield response.follow(
                url,
                callback=self.parse_tender,
                meta={
                    "title": title,
                    "published_at": published_at,
                    "country": country,
                    "tender_type": tender_type,
                },
            )

        if any_in_window and current_page < _MAX_PAGES:
            next_url = _next_page_url(response.url, current_page + 1)
            yield response.follow(next_url, callback=self.parse)

    def parse_tender(self, response: Response):
        title = (
            response.css("h1.notice-title::text, h1::text").get()
            or response.css("meta[property='og:title']::attr(content)").get()
            or response.meta.get("title")
            or ""
        ).strip()
        if not title:
            return

        description = " ".join(
            response.css(
                "div.notice-body *::text, div.tender-description *::text, div.notice-content *::text, div.main-content *::text"
            ).getall()
        ).strip()

        reference_number = (
            response.css(".notice-no::text, .reference::text, .tender-number::text").get() or ""
        ).strip()

        institution = (
            response.css(".procuring-entity::text, .organization::text, .buyer-name::text").get() or ""
        ).strip()

        country = response.meta.get("country") or (
            response.css(".country::text, .location::text").get() or ""
        ).strip()

        published_at = response.meta.get("published_at")

        raw_deadline = response.css(
            ".closing-date::text, .deadline::text, .bid-deadline::text"
        ).get()
        deadline_at = _parse_date(raw_deadline)

        budget_usd = _parse_budget(
            (response.css(".budget::text, .contract-value::text, .estimated-cost::text").get() or "").strip()
        )

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
        if not self._should_process(source_url, description or title):
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
