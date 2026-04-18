import hashlib
import logging
import os
import re
import uuid
from datetime import datetime, timezone

from dotenv import load_dotenv
from scrapy.exceptions import DropItem

from scraper.sanitize import sanitize_html

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


def _make_slug(title: str, existing_slugs: set[str]) -> str:
    base = title.lower()
    base = re.sub(r"[^\w\s-]", "", base)
    base = re.sub(r"[\s_]+", "-", base).strip("-")
    base = base[:80]
    slug = base
    if slug in existing_slugs:
        slug = f"{base}-{uuid.uuid4().hex[:6]}"
    return slug


class DeduplicationPipeline:
    def __init__(self):
        self._supabase = None

    def open_spider(self, spider):
        try:
            self._supabase = _get_supabase()
        except Exception as exc:
            logger.warning("Supabase unavailable, dedup disabled: %s", exc)

    def process_item(self, item, spider):
        if self._supabase is None:
            return item

        source_url = item.get("source_url", "")
        content = item.get("content_original", "")
        new_hash = _md5(content)

        try:
            result = (
                self._supabase.table("articles")
                .select("content_hash")
                .eq("source_url", source_url)
                .maybe_single()
                .execute()
            )
        except Exception as exc:
            logger.error("Dedup query failed for %s: %s", source_url, exc)
            return item

        if result and result.data:
            stored_hash = result.data.get("content_hash", "")
            if stored_hash == new_hash:
                raise DropItem(f"Unchanged content, skipping: {source_url}")
            item["is_update"] = True

        return item


class SanitizationPipeline:
    def process_item(self, item, spider):
        raw = item.get("content_original") or ""
        item["content_original"] = sanitize_html(raw)
        return item


class StoragePipeline:
    def __init__(self):
        self._supabase = None
        self._known_slugs: set[str] = set()

    def open_spider(self, spider):
        try:
            self._supabase = _get_supabase()
            rows = self._supabase.table("articles").select("slug").execute()
            self._known_slugs = {r["slug"] for r in (rows.data or [])}
        except Exception as exc:
            logger.warning("Supabase unavailable in StoragePipeline: %s", exc)

    def process_item(self, item, spider):
        from scraper.classify import classify_article
        from scraper.storage import upload_image, rewrite_image_srcs

        source = item.get("source", "bbc")
        title = item.get("title_original", "")
        content = item.get("content_original", "")
        source_url = item.get("source_url", "")

        # Classify -- The Conversation category already set; only classify region
        if source == "the_conversation":
            _, region_slug = classify_article(title, content)
            item["region_slug"] = region_slug
        else:
            category_slug, region_slug = classify_article(title, content)
            item["category_slug"] = category_slug
            item["region_slug"] = region_slug

        # Parse published_at
        try:
            published_at = datetime.fromisoformat(
                str(item.get("published_at", "")).replace("Z", "+00:00")
            )
        except (ValueError, TypeError):
            published_at = datetime.now(timezone.utc)

        # Generate article ID for storage path (stable across updates)
        article_id = str(uuid.uuid4())

        # Upload featured image
        featured_image_url = upload_image(
            image_url=item.get("featured_image_source_url") or "",
            article_id=article_id,
            source=source,
            published_at=published_at,
        )

        # Upload inline images and rewrite srcs
        url_map: dict[str, str] = {}
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(content, "lxml")
        for i, img in enumerate(soup.find_all("img")):
            src = img.get("src", "")
            if src and src not in url_map:
                new_url = upload_image(
                    image_url=src,
                    article_id=f"{article_id}-img{i}",
                    source=source,
                    published_at=published_at,
                )
                if new_url:
                    url_map[src] = new_url

        if url_map:
            item["content_original"] = rewrite_image_srcs(content, url_map)

        # Translation runs as a separate step (retranslate.py) after all spiders finish.
        # Store originals as fallback so the article is immediately visible on the site.
        item["title_tr"] = item.get("title_original")
        item["excerpt_tr"] = item.get("excerpt_original")
        item["content_tr"] = item.get("content_original")

        # Content hash (of sanitized original)
        content_hash = _md5(item.get("content_original") or "")

        # Slug
        slug = _make_slug(title, self._known_slugs)
        self._known_slugs.add(slug)

        row = {
            "id": article_id,
            "source": source,
            "source_url": source_url,
            "slug": slug,
            "title_original": title,
            "title_tr": item.get("title_tr"),
            "excerpt_original": item.get("excerpt_original"),
            "excerpt_tr": item.get("excerpt_tr"),
            "content_original": item.get("content_original"),
            "content_tr": item.get("content_tr"),
            "content_hash": content_hash,
            "featured_image_url": featured_image_url,
            "featured_image_source_url": item.get("featured_image_source_url"),
            "image_credit": item.get("image_credit"),
            "category_slug": item.get("category_slug"),
            "region_slug": item.get("region_slug"),
            "published_at": published_at.isoformat(),
            "author_original": item.get("author_original"),
            "view_count": 0,
            "is_featured": False,
        }

        if self._supabase is None:
            logger.warning("Supabase not available, skipping DB write for %s", source_url)
            return item

        try:
            if item.get("is_update"):
                # Update existing row, preserve id and view_count
                update_fields = {k: v for k, v in row.items()
                                 if k not in ("id", "view_count", "is_featured")}
                update_fields["updated_at"] = datetime.now(timezone.utc).isoformat()
                (
                    self._supabase.table("articles")
                    .update(update_fields)
                    .eq("source_url", source_url)
                    .execute()
                )
                logger.info("Updated article: %s", source_url)
            else:
                self._supabase.table("articles").insert(row).execute()
                logger.info("Inserted article: %s", source_url)
        except Exception as exc:
            logger.error("DB write failed for %s: %s", source_url, exc)

        return item
