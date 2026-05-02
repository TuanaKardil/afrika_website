"""Re-download and reprocess existing BBC featured images to remove watermark."""
import logging
import os
import re as _re
import requests as _requests
from datetime import datetime, timezone
import time as _time

from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

_USER_AGENT = "AfrikaHaberleriBot/1.0 (+https://github.com/TuanaKardil/afrika_website)"


def _upload_direct(supabase_url: str, service_key: str, bucket: str, path: str, data: bytes) -> bool:
    """Upload via direct HTTP request with x-upsert header to bypass Python client quirks."""
    url = f"{supabase_url}/storage/v1/object/{bucket}/{path}"
    resp = _requests.post(
        url,
        data=data,
        headers={
            "Authorization": f"Bearer {service_key}",
            "Content-Type": "image/jpeg",
            "x-upsert": "true",
        },
        timeout=30,
    )
    if resp.status_code in (200, 201):
        return True
    logger.error("Upload HTTP %d for %s: %s", resp.status_code, path, resp.text[:200])
    return False


def main() -> None:
    from supabase import create_client
    from scraper.storage import _download_image, _to_jpeg_bytes, _storage_path, _BUCKET

    supabase_url = os.environ["SUPABASE_URL"]
    service_key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

    sb = create_client(supabase_url, service_key)

    rows = sb.table("articles").select(
        "id,source,published_at,featured_image_source_url"
    ).eq("source", "bbc").not_.is_("featured_image_source_url", "null").execute()

    updated = 0
    failed = 0

    for row in (rows.data or []):
        source_url = row.get("featured_image_source_url", "")
        if not source_url:
            continue

        result = _download_image(source_url)
        if result is None:
            failed += 1
            continue

        raw_bytes, filename = result
        stem = _re.sub(r"\.[^.]+$", "", filename) or "image"
        jpeg_filename = f"{stem}.jpg"

        try:
            jpeg_bytes = _to_jpeg_bytes(raw_bytes, source="bbc")
        except Exception as exc:
            logger.warning("Failed to process image for article %s: %s", row["id"], exc)
            failed += 1
            continue

        try:
            published_at = datetime.fromisoformat(
                str(row.get("published_at", "")).replace("Z", "+00:00")
            )
        except (ValueError, TypeError):
            published_at = datetime.now(timezone.utc)

        # Use a unique path each run to avoid upsert RLS conflict on existing objects
        ts = int(_time.time())
        clean_filename = f"{stem}-wf{ts}.jpg"
        path = _storage_path("bbc", published_at, row["id"], clean_filename)
        public_url = f"{supabase_url}/storage/v1/object/public/{_BUCKET}/{path}"

        if _upload_direct(supabase_url, service_key, _BUCKET, path, jpeg_bytes):
            # Update the article's featured_image_url to the new watermark-free image
            sb.table("articles").update(
                {"featured_image_url": public_url}
            ).eq("id", row["id"]).execute()
            updated += 1
            logger.info("Reprocessed: %s", row["id"])
        else:
            failed += 1

    logger.info("Image reprocessing complete: %d updated, %d failed", updated, failed)


if __name__ == "__main__":
    main()
