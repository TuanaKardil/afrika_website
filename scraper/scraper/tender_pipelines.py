"""Scrapy pipeline for tender items."""
import hashlib
import logging
import os
import re
import uuid
from datetime import datetime, timezone

from dotenv import load_dotenv
from scrapy.exceptions import DropItem

load_dotenv()

logger = logging.getLogger(__name__)


def _md5(text: str) -> str:
    return hashlib.md5(text.encode("utf-8")).hexdigest()


def _get_supabase():
    from supabase import create_client
    return create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_ROLE_KEY"],
    )


def _slugify(text: str) -> str:
    """Generate a URL-safe slug from text.

    Tries python-slugify first; falls back to a simple implementation.
    """
    try:
        from slugify import slugify
        return slugify(text)[:100]
    except ImportError:
        slug = text.lower()
        # Replace Turkish characters with ASCII equivalents
        _TR_MAP = str.maketrans(
            "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"
            "0123456789"
            "acegiosuAcegiosu",
            "abcdefghijklmnopqrstuvwxyzabcdefghijklmnopqrstuvwxyz"
            "0123456789"
            "acegiosuacegiosu",
        )
        # Map common Turkish chars
        for src, dst in [
            ("ç", "c"), ("ş", "s"), ("ı", "i"), ("ğ", "g"),
            ("ö", "o"), ("ü", "u"), ("â", "a"), ("î", "i"),
            ("û", "u"),
            ("Ç", "c"), ("Ş", "s"), ("İ", "i"), ("Ğ", "g"),
            ("Ö", "o"), ("Ü", "u"),
        ]:
            slug = slug.replace(src, dst)
        slug = re.sub(r"[^\w\s-]", "", slug)
        slug = re.sub(r"[\s_]+", "-", slug).strip("-")
        return slug[:100]


def _make_unique_slug(base_slug: str, existing_slugs: set[str]) -> str:
    slug = base_slug
    if slug in existing_slugs:
        slug = f"{base_slug}-{uuid.uuid4().hex[:6]}"
    return slug


def _parse_dt(value) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except (ValueError, TypeError):
        return None


class TenderPipeline:
    """Single pipeline that translates, classifies, filters, and stores tenders."""

    def __init__(self):
        self._supabase = None
        self._known_slugs: set[str] = set()

    def open_spider(self, spider):
        try:
            self._supabase = _get_supabase()
            rows = self._supabase.table("tenders").select("slug").execute()
            self._known_slugs = {r["slug"] for r in (rows.data or [])}
        except Exception as exc:
            logger.warning("Supabase unavailable in TenderPipeline: %s", exc)

    def process_item(self, item, spider):
        source_url = item.get("source_url", "")
        description = item.get("description_original", "")
        title = item.get("title_original", "")
        content_hash = _md5(description)

        # Dedup: skip if source_url exists with same content hash
        if self._supabase is not None:
            try:
                result = (
                    self._supabase.table("tenders")
                    .select("content_hash, id")
                    .eq("source_url", source_url)
                    .maybe_single()
                    .execute()
                )
                if result and result.data:
                    stored_hash = result.data.get("content_hash", "")
                    if stored_hash == content_hash:
                        raise DropItem(f"Unchanged tender content, skipping: {source_url}")
                    item["_is_update"] = True
                    item["_existing_id"] = result.data.get("id")
            except DropItem:
                raise
            except Exception as exc:
                logger.error("Dedup query failed for %s: %s", source_url, exc)

        # Turkey filter
        from scraper.tender_filter import should_suppress_tender
        is_suppressed = should_suppress_tender(title, description)
        item["is_suppressed"] = is_suppressed

        # AI classification
        from scraper.tender_classify import classify_tender
        classification = classify_tender(title, description)
        item["sector_slug"] = classification.get("sector_slug")
        item["region_slug"] = classification.get("region_slug", "afrika")
        item["category_slug"] = classification.get("category_slug", "diger")
        item["tender_type"] = classification.get("tender_type", "other")

        # Translation
        from scraper.tender_translate import translate_tender
        institution = item.get("institution", "")
        country = item.get("country", "")
        translation = translate_tender(title, description, institution, country)
        item["title_tr"] = translation.get("title_tr") or title
        item["description_tr"] = translation.get("description_tr") or description
        item["institution_tr"] = translation.get("institution_tr") or institution
        item["country_tr"] = translation.get("country_tr") or country

        # Parse timestamps
        published_at = _parse_dt(item.get("published_at"))
        deadline_at = _parse_dt(item.get("deadline_at"))
        now = datetime.now(timezone.utc)

        # Slug generation
        base_slug = _slugify(title or source_url)
        if not base_slug:
            base_slug = uuid.uuid4().hex[:12]
        slug = _make_unique_slug(base_slug, self._known_slugs)
        self._known_slugs.add(slug)

        tender_id = item.get("_existing_id") or str(uuid.uuid4())

        row = {
            "id": tender_id,
            "source": item.get("source", ""),
            "source_url": source_url,
            "slug": slug,
            "title_original": title,
            "title_tr": item["title_tr"],
            "description_original": description,
            "description_tr": item["description_tr"],
            "reference_number": item.get("reference_number") or None,
            "institution": institution or None,
            "institution_tr": item["institution_tr"] or None,
            "country": country or None,
            "country_tr": item["country_tr"] or None,
            "published_at": published_at.isoformat() if published_at else None,
            "deadline_at": deadline_at.isoformat() if deadline_at else None,
            "budget_usd": item.get("budget_usd"),
            "document_urls": item.get("document_urls") or [],
            "contact_email": item.get("contact_email") or None,
            "sector_slug": item["sector_slug"],
            "region_slug": item["region_slug"],
            "category_slug": item["category_slug"],
            "tender_type": item["tender_type"],
            "content_hash": content_hash,
            "is_suppressed": is_suppressed,
            "scraped_at": now.isoformat(),
        }

        if self._supabase is None:
            logger.warning("Supabase not available, skipping DB write for %s", source_url)
            return item

        try:
            if item.get("_is_update"):
                update_fields = {
                    k: v for k, v in row.items()
                    if k not in ("id", "slug")
                }
                update_fields["updated_at"] = now.isoformat()
                (
                    self._supabase.table("tenders")
                    .update(update_fields)
                    .eq("source_url", source_url)
                    .execute()
                )
                logger.info("Updated tender: %s", source_url)
            else:
                row["view_count"] = 0
                self._supabase.table("tenders").insert(row).execute()
                logger.info("Inserted tender: %s", source_url)
        except Exception as exc:
            logger.error("DB write failed for %s: %s", source_url, exc)

        return item
