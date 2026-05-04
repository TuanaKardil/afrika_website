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

        # AI semantic duplicate check (new articles only)
        if not item.get("is_update"):
            from scraper.duplicate import is_duplicate
            title = item.get("title_original", "")
            excerpt = item.get("excerpt_original", "")
            if is_duplicate(title, excerpt, self._supabase):
                raise DropItem(f"AI duplicate detected, skipping: {source_url}")

        return item


class SanitizationPipeline:
    def process_item(self, item, spider):
        raw = item.get("content_original") or ""
        item["content_original"] = sanitize_html(raw)
        raw_tr = item.get("content_tr") or ""
        if raw_tr:
            item["content_tr"] = sanitize_html(raw_tr)
        return item


MIN_AFRICA_SCORE = 4


class ScorePipeline:
    """Drop articles scoring below MIN_AFRICA_SCORE on Africa relevance (1-10)."""

    def process_item(self, item, spider):
        from scraper.score import score_article
        from scrapy.exceptions import DropItem as _DropItem

        title = item.get("title_original", "")
        content = item.get("content_original", "")
        score = score_article(title, content)
        item["score"] = score

        if score < MIN_AFRICA_SCORE:
            raise _DropItem(
                f"Africa score {score}/10 < {MIN_AFRICA_SCORE}, dropping: {title[:80]}"
            )

        return item


class TranslationPipeline:
    """Translate English content to Turkish for articles scoring 4 or higher.
    Articles below 4 skip translation (title_tr/excerpt_tr/content_tr remain None).
    Uses Gemini 2.5 Flash-Lite via OpenRouter.
    """

    def process_item(self, item, spider):
        from scraper.translate import translate_article

        score = item.get("score", 0)
        if score < 4:
            item["title_tr"] = None
            item["excerpt_tr"] = None
            item["content_tr"] = None
            logger.info("Translation skipped (score %d < 4): %s", score, item.get("source_url", ""))
            return item

        result = translate_article(
            title=item.get("title_original", ""),
            excerpt=item.get("excerpt_original", ""),
            body=item.get("content_original", ""),
            source_url=item.get("source_url", ""),
            source_name=item.get("source", ""),
        )
        if result is None:
            logger.warning("Translation failed for %s", item.get("source_url", ""))
            item["title_tr"] = None
            item["excerpt_tr"] = None
            item["content_tr"] = None
            return item

        title_tr, excerpt_tr, content_tr = result
        item["title_tr"] = title_tr
        item["excerpt_tr"] = excerpt_tr
        item["content_tr"] = content_tr
        logger.info("Translated (score %d): %s", score, item.get("source_url", ""))
        return item


class ContentCleanPipeline:
    """Remove off-topic promotional content from translated body."""

    def process_item(self, item, spider):
        content_tr = item.get("content_tr") or ""
        if content_tr:
            from scraper.clean_content import clean_article_body
            item["content_tr"] = clean_article_body(content_tr)
        return item


class TurkeyFilterPipeline:
    """Drop articles with negative Turkey framing before expensive translation."""

    def process_item(self, item, spider):
        from scraper.turkey_filter import should_suppress

        title = item.get("title_original", "")
        content = item.get("content_original", "")
        suppressed = should_suppress(title, content)
        item["turkey_filter_result"] = "SUPPRESS" if suppressed else "PUBLISH"
        if suppressed:
            raise DropItem(f"Turkey filter: suppressing article: {title[:80]}")
        return item


class StoragePipeline:
    def __init__(self):
        self._supabase = None
        self._known_slugs: set[str] = set()
        self._used_image_urls: set[str] = set()

    def open_spider(self, spider):
        try:
            self._supabase = _get_supabase()
            rows = self._supabase.table("articles").select("slug,featured_image_url").execute()
            self._known_slugs = {r["slug"] for r in (rows.data or [])}
            self._used_image_urls = {
                r["featured_image_url"]
                for r in (rows.data or [])
                if r.get("featured_image_url")
            }
        except Exception as exc:
            logger.warning("Supabase unavailable in StoragePipeline: %s", exc)

    def process_item(self, item, spider):
        from scraper.classify import classify_article
        from scraper.hashtags import assign_hashtags
        from scraper.storage import upload_image, rewrite_image_srcs

        source = item.get("source", "")
        title = item.get("title_original", "")
        content = item.get("content_original", "")
        source_url = item.get("source_url", "")

        # AI classification: nav_tab_slug, sector_slugs, region_slug
        nav_tab_slug, sector_slugs, region_slug = classify_article(title, content)
        item["nav_tab_slug"] = nav_tab_slug
        item["sector_slugs"] = sector_slugs
        item["region_slug"] = region_slug

        # Hashtag assignment
        hashtags = assign_hashtags(title, content)
        if not hashtags:
            logger.warning("assign_hashtags returned empty for %s", source_url)
        item["hashtags"] = hashtags

        # Parse published_at
        try:
            published_at = datetime.fromisoformat(
                str(item.get("published_at", "")).replace("Z", "+00:00")
            )
        except (ValueError, TypeError):
            published_at = datetime.now(timezone.utc)

        article_id = str(uuid.uuid4())

        # Upload featured image
        featured_image_url = upload_image(
            image_url=item.get("featured_image_source_url") or "",
            article_id=article_id,
            source=source,
            published_at=published_at,
        )

        # Image fallback when source had no image
        if not featured_image_url:
            from scraper.image_fallback import fetch_fallback_image
            fallback_url = fetch_fallback_image(
                title_original=title,
                region_slug=region_slug,
                exclude_urls=self._used_image_urls,
            )
            if fallback_url:
                featured_image_url = upload_image(
                    image_url=fallback_url,
                    article_id=article_id,
                    source="pexels",
                    published_at=published_at,
                )
                if featured_image_url:
                    self._used_image_urls.add(featured_image_url)

        # Compute featured image fingerprint for dedup against inline images
        featured_fp = ""
        featured_src_url = item.get("featured_image_source_url") or ""
        if featured_src_url:
            from scraper.storage import compute_image_fingerprint
            featured_fp = compute_image_fingerprint(featured_src_url)

        def _is_featured_duplicate(src: str) -> bool:
            if not featured_fp or not src:
                return False
            from scraper.storage import compute_image_fingerprint as _cfp
            fp = _cfp(src)
            return bool(fp and fp == featured_fp)

        # Build full image URL list: inline imgs already in content HTML + explicit inline_image_urls
        url_map: dict[str, str] = {}
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(content, "lxml")
        for i, img in enumerate(soup.find_all("img")):
            src = img.get("src", "")
            if src and src not in url_map:
                if _is_featured_duplicate(src):
                    logger.info("Skipping visually identical inline image: %s", src[:80])
                    continue
                new_url = upload_image(
                    image_url=src,
                    article_id=f"{article_id}-img{i}",
                    source=source,
                    published_at=published_at,
                )
                if new_url:
                    url_map[src] = new_url

        # Also upload explicit inline_image_urls (handles lazy-loaded images not in content HTML)
        for j, src in enumerate(item.get("inline_image_urls") or []):
            if src and src not in url_map:
                if _is_featured_duplicate(src):
                    logger.info("Skipping visually identical inline image: %s", src[:80])
                    continue
                new_url = upload_image(
                    image_url=src,
                    article_id=f"{article_id}-body{j}",
                    source=source,
                    published_at=published_at,
                )
                if new_url:
                    url_map[src] = new_url

        if url_map:
            item["content_original"] = rewrite_image_srcs(item.get("content_original", ""), url_map)
            content_tr = item.get("content_tr") or ""
            if content_tr:
                item["content_tr"] = rewrite_image_srcs(content_tr, url_map)

            # Inject images that are not yet present in content_tr as <figure> blocks
            content_tr_final = item.get("content_tr") or item.get("content_original") or ""
            figures = ""
            for orig_src, supabase_url in url_map.items():
                if supabase_url and supabase_url not in content_tr_final:
                    figures += f'<figure><img src="{supabase_url}" alt="" /></figure>\n'
            if figures:
                if item.get("content_tr"):
                    item["content_tr"] = item["content_tr"] + "\n" + figures
                if item.get("content_original"):
                    item["content_original"] = item["content_original"] + "\n" + figures

        # Fallback: if pipeline translation didn't run (score < 5 or API failure),
        # keep the None values so retranslate.py can pick them up later
        if item.get("title_tr") is None:
            item["title_tr"] = None  # explicit None, not original English
        if item.get("excerpt_tr") is None:
            item["excerpt_tr"] = None
        if item.get("content_tr") is None:
            item["content_tr"] = None

        content_hash = _md5(item.get("content_original") or "")
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
            "nav_tab_slug": nav_tab_slug,
            "sector_slugs": sector_slugs,
            "region_slug": region_slug,
            "hashtags": hashtags,
            "score": item.get("score"),
            "turkey_filter_result": item.get("turkey_filter_result"),
            "is_suppressed": False,
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
                update_fields = {k: v for k, v in row.items()
                                 if k not in ("id", "view_count", "is_featured",
                                              "title_tr", "excerpt_tr", "content_tr")}
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
