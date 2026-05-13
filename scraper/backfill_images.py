"""Backfill featured images for articles missing them (Pexels HD, Wikipedia fallback)."""
import logging
import os
import time
from datetime import datetime, timezone

from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]


def main():
    from supabase import create_client
    from scraper.image_fallback import fetch_fallback_image
    from scraper.storage import upload_image

    sb = create_client(SUPABASE_URL, SUPABASE_KEY)

    # Collect all URLs already in use so we never reuse them
    existing = (
        sb.table("articles")
        .select("featured_image_url")
        .not_.is_("featured_image_url", "null")
        .execute()
        .data or []
    )
    used_urls: set[str] = {r["featured_image_url"] for r in existing if r.get("featured_image_url")}
    logger.info("Existing image URLs loaded: %d", len(used_urls))

    rows = (
        sb.table("articles")
        .select("id,title_original,title_tr,region_slug,source,published_at")
        .is_("featured_image_url", "null")
        .execute()
        .data or []
    )
    logger.info("Articles missing images: %d", len(rows))

    for row in rows:
        article_id = row["id"]
        title_original = row.get("title_original") or ""
        title_tr = row.get("title_tr") or ""
        region = row.get("region_slug") or "africa"
        source = row.get("source") or "unknown"
        published_raw = row.get("published_at")

        try:
            published_at = datetime.fromisoformat(published_raw.replace("Z", "+00:00")) if published_raw else datetime.now(timezone.utc)
        except Exception:
            published_at = datetime.now(timezone.utc)

        logger.info("Processing: %s", title_tr[:70])

        image_url = fetch_fallback_image(
            title_original=title_original,
            region_slug=region,
            exclude_urls=used_urls,
        )
        if not image_url:
            logger.warning("  No image found for article %s", article_id)
            continue

        logger.info("  Found image: %s", image_url[:80])

        stored_url = upload_image(image_url, article_id, "pexels", published_at)
        if not stored_url:
            logger.warning("  Upload failed, skipping")
            continue

        used_urls.add(stored_url)
        sb.table("articles").update({"featured_image_url": stored_url}).eq("id", article_id).execute()
        logger.info("  Updated article %s", article_id)
        time.sleep(0.5)

    logger.info("Done.")


if __name__ == "__main__":
    main()
