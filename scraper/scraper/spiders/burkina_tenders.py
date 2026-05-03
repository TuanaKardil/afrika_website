"""Spider for Burkina Faso tenders (joffres.net).

Server-rendered Laravel app. 10 items per page with pagination via ?page=N.
Source: https://www.joffres.net/les_appeloffre/filtre?mot_cle=
"""
import re
from datetime import datetime, timezone
from urllib.parse import urljoin

from scrapy.http import Response

from scraper.spiders.base_tender_spider import BaseTenderSpider

_BASE = "https://www.joffres.net"
_START = f"{_BASE}/les_appeloffre/filtre?mot_cle="

_BROWSER_UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)

_DATE_RE = re.compile(r"(\d{2}-\d{2}-\d{4})")


def _parse_deadline(raw: str | None) -> datetime | None:
    """Parse 'Expire le 25-05-2026' -> datetime."""
    if not raw:
        return None
    m = _DATE_RE.search(raw)
    if m:
        try:
            return datetime.strptime(m.group(1), "%d-%m-%Y").replace(tzinfo=timezone.utc)
        except ValueError:
            pass
    return None


def _extract_email(raw: str) -> str | None:
    if not raw:
        return None
    raw = raw.replace("mailto:", "").strip()
    return raw if "@" in raw else None


class BurkinaTendersSpider(BaseTenderSpider):
    name = "burkina_tenders"
    allowed_domains = ["joffres.net"]
    start_urls = [_START]
    source_key = "burkina"

    custom_settings = {
        "DOWNLOAD_DELAY": 2,
        "CONCURRENT_REQUESTS_PER_DOMAIN": 1,
        "USER_AGENT": _BROWSER_UA,
        "ROBOTSTXT_OBEY": True,
    }

    def parse(self, response: Response):
        cards = response.css("div.job")
        any_in_window = False

        for card in cards:
            link = card.css("a.job-title::attr(href)").get()
            if not link:
                continue
            url = urljoin(_BASE, link)

            title = (card.css("a.job-title::text").get() or "").strip()
            deadline_raw = " ".join(card.css("small.expire-date::text").getall()).strip()
            deadline_at = _parse_deadline(deadline_raw)
            institution = (card.css("small.societe::text").get() or "").strip()
            location = (card.css("small.offre-localisation::text").get() or "Burkina Faso").strip()

            if not self._is_in_window(deadline_at=deadline_at, published_at=None):
                continue

            any_in_window = True
            yield response.follow(
                url,
                callback=self.parse_tender,
                meta={
                    "title": title,
                    "deadline_at": deadline_at,
                    "institution": institution,
                    "country": location or "Burkina Faso",
                },
            )

        # Paginate via ?page=N as long as there are items in the window
        if any_in_window:
            next_page = response.css("a[rel='next']::attr(href), ul.pagination li.active + li a::attr(href)").get()
            if next_page:
                yield response.follow(next_page, callback=self.parse)
            else:
                # Try incrementing page parameter
                current_url = response.url
                m = re.search(r"[?&]page=(\d+)", current_url)
                current_p = int(m.group(1)) if m else 0
                if current_p < 20:
                    sep = "&" if "?" in current_url else "?"
                    yield response.follow(
                        f"{current_url}{sep}page={current_p + 1}",
                        callback=self.parse,
                    )

    def parse_tender(self, response: Response):
        title = (
            response.css("h1::text, h2.job-title::text").get()
            or response.css("meta[property='og:title']::attr(content)").get()
            or response.meta.get("title")
            or ""
        ).strip()
        if not title:
            return

        description = " ".join(
            response.css("div.job-description *::text, div.content *::text, article *::text").getall()
        ).strip()

        reference_number = ""
        ref_match = re.search(r"N[°o][\s\-]*([\w\-/]+)", description)
        if ref_match:
            reference_number = ref_match.group(0).strip()

        deadline_at = response.meta.get("deadline_at")
        institution = response.meta.get("institution") or (
            response.css(".societe::text, .company::text").get() or ""
        ).strip()
        country = response.meta.get("country", "Burkina Faso")

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
            "published_at": None,
            "deadline_at": deadline_at.isoformat() if deadline_at else None,
            "budget_usd": None,
            "document_urls": document_urls,
            "contact_email": contact_email,
        }
