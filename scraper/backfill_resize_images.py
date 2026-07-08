"""
Resize all existing article images in Supabase Storage to max 1200px width.

Downloads each image from Supabase, resizes it, and re-uploads to the same
path (overwrite). No DB changes needed — URLs stay the same.

Run from the scraper/ directory:
    python backfill_resize_images.py [--dry-run] [--limit N]
"""

import argparse
import io
import logging
import os
import sys
import time

import requests
from dotenv import load_dotenv
from PIL import Image

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
logger = logging.getLogger(__name__)

_MAX_WIDTH = 1200
_QUALITY = 80
_BUCKET = "article-images"
_REQUEST_TIMEOUT = 20


def _get_supabase():
    from supabase import create_client
    return create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_ROLE_KEY"],
    )


def _supabase_path_from_url(url: str) -> str | None:
    """Extract storage path from a Supabase public URL."""
    marker = f"/storage/v1/object/public/{_BUCKET}/"
    idx = url.find(marker)
    if idx == -1:
        return None
    return url[idx + len(marker):]


def _resize_jpeg(raw_bytes: bytes) -> bytes | None:
    try:
        buf = io.BytesIO(raw_bytes)
        img = Image.open(buf).convert("RGB")
        if img.width <= _MAX_WIDTH:
            return None  # Already small enough, skip
        new_height = int(img.height * _MAX_WIDTH / img.width)
        img = img.resize((_MAX_WIDTH, new_height), Image.LANCZOS)
        out = io.BytesIO()
        img.save(out, format="JPEG", quality=_QUALITY, optimize=True)
        return out.getvalue()
    except Exception as exc:
        logger.warning("Resize failed: %s", exc)
        return None


def _download(url: str) -> bytes | None:
    try:
        resp = requests.get(url, timeout=_REQUEST_TIMEOUT)
        resp.raise_for_status()
        return resp.content
    except Exception as exc:
        logger.warning("Download failed %s: %s", url[:80], exc)
        return None


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="Don't upload, just report")
    parser.add_argument("--limit", type=int, default=0, help="Process at most N images (0 = all)")
    args = parser.parse_args()

    sb = _get_supabase()
    rows = sb.table("articles").select("id,featured_image_url").not_.is_("featured_image_url", "null").execute()
    articles = rows.data or []
    logger.info("Found %d articles with images", len(articles))

    if args.limit:
        articles = articles[: args.limit]
        logger.info("Limited to %d articles", len(articles))

    resized = 0
    skipped = 0
    failed = 0

    for i, art in enumerate(articles, 1):
        url = art.get("featured_image_url") or ""
        if not url:
            continue

        path = _supabase_path_from_url(url)
        if not path:
            logger.warning("[%d/%d] Cannot extract path from URL: %s", i, len(articles), url[:80])
            failed += 1
            continue

        raw = _download(url)
        if not raw:
            failed += 1
            continue

        resized_bytes = _resize_jpeg(raw)
        if resized_bytes is None:
            logger.info("[%d/%d] Already ≤%dpx, skip: %s", i, len(articles), _MAX_WIDTH, path[:60])
            skipped += 1
            continue

        orig_kb = len(raw) // 1024
        new_kb = len(resized_bytes) // 1024
        saving = 100 - int(new_kb * 100 / orig_kb) if orig_kb else 0

        if args.dry_run:
            logger.info("[%d/%d] DRY-RUN: %s | %dKB → %dKB (-%d%%)", i, len(articles), path[:60], orig_kb, new_kb, saving)
            resized += 1
            continue

        try:
            sb.storage.from_(_BUCKET).update(
                path,
                resized_bytes,
                {
                    "content-type": "image/jpeg",
                    "upsert": "true",
                    "cache-control": "public, max-age=31536000, immutable",
                },
            )
            logger.info("[%d/%d] Resized: %s | %dKB → %dKB (-%d%%)", i, len(articles), path[:60], orig_kb, new_kb, saving)
            resized += 1
        except Exception as exc:
            logger.error("[%d/%d] Upload failed %s: %s", i, len(articles), path[:60], exc)
            failed += 1

        time.sleep(0.1)  # Avoid hammering Supabase Storage

    logger.info("Done. resized=%d skipped=%d failed=%d", resized, skipped, failed)


if __name__ == "__main__":
    main()
