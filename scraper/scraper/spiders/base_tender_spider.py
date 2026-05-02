"""Abstract base class for all tender spiders."""
import hashlib
import logging
import os
from abc import ABC, abstractmethod
from datetime import datetime, timezone, timedelta

import scrapy

logger = logging.getLogger(__name__)

_USER_AGENT = "AfrikaHaberleriBot/1.0 (+https://github.com/TuanaKardil/afrika_website)"
# Tenders window: deadline in the future OR published within last 7 days
_LOOKBACK_DAYS = 7


def _md5(text: str) -> str:
    return hashlib.md5(text.encode("utf-8")).hexdigest()


def _get_supabase():
    from supabase import create_client
    return create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_ROLE_KEY"],
    )


class BaseTenderSpider(scrapy.Spider, ABC):
    """Base class providing dedup, change-detection, and shared settings for tender spiders."""

    # Scrapy settings applied at spider level (overridden via tender_settings.py as well)
    custom_settings = {
        "DOWNLOAD_DELAY": 2,
        "CONCURRENT_REQUESTS_PER_DOMAIN": 2,
        "USER_AGENT": _USER_AGENT,
        "ROBOTSTXT_OBEY": True,
    }

    # -- Abstract properties --------------------------------------------------

    @property
    @abstractmethod
    def source_key(self) -> str:
        """Short identifier stored in the tenders.source column."""

    # start_urls is already inherited from scrapy.Spider as a list attribute;
    # subclasses must set it as a class attribute.

    # -- Helpers --------------------------------------------------------------

    def _cutoff(self) -> datetime:
        return datetime.now(timezone.utc) - timedelta(days=_LOOKBACK_DAYS)

    def _supabase(self):
        if not hasattr(self, "_sb_client"):
            try:
                self._sb_client = _get_supabase()
            except Exception as exc:
                logger.warning("Supabase unavailable in spider %s: %s", self.name, exc)
                self._sb_client = None
        return self._sb_client

    def _is_known(self, source_url: str) -> bool:
        """Return True if source_url already exists in the tenders table with same hash."""
        sb = self._supabase()
        if sb is None:
            return False
        try:
            result = (
                sb.table("tenders")
                .select("id")
                .eq("source_url", source_url)
                .maybe_single()
                .execute()
            )
            return bool(result and result.data)
        except Exception as exc:
            logger.error("Dedup check failed for %s: %s", source_url, exc)
            return False

    def _has_changed(self, source_url: str, description: str) -> bool:
        """Return True if the content hash differs from what is stored (needs update)."""
        sb = self._supabase()
        if sb is None:
            return True
        new_hash = _md5(description)
        try:
            result = (
                sb.table("tenders")
                .select("content_hash")
                .eq("source_url", source_url)
                .maybe_single()
                .execute()
            )
            if result and result.data:
                return result.data.get("content_hash") != new_hash
            return True
        except Exception as exc:
            logger.error("Change-detection query failed for %s: %s", source_url, exc)
            return True

    def _should_process(self, source_url: str, description: str) -> bool:
        """Return True if this tender should be yielded (new or changed content)."""
        if not self._is_known(source_url):
            return True
        return self._has_changed(source_url, description)

    def _is_in_window(self, deadline_at=None, published_at=None) -> bool:
        """Return True if the tender is within the scraping window.

        Accepts if deadline_at is in the future OR published_at is within last 7 days.
        Both arguments should be timezone-aware datetimes or None.
        """
        now = datetime.now(timezone.utc)
        cutoff = self._cutoff()

        if deadline_at is not None:
            if isinstance(deadline_at, datetime):
                dt = deadline_at if deadline_at.tzinfo else deadline_at.replace(tzinfo=timezone.utc)
                if dt > now:
                    return True

        if published_at is not None:
            if isinstance(published_at, datetime):
                pub = published_at if published_at.tzinfo else published_at.replace(tzinfo=timezone.utc)
                if pub >= cutoff:
                    return True

        # If we have neither date, include it by default (best-effort)
        if deadline_at is None and published_at is None:
            return True

        return False
