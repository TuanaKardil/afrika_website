"""
Backfill responsive WebP variants for existing article images.

For every article that has a featured_image_url but no image_srcset, this
downloads the already-processed JPEG from Supabase Storage, generates WebP
variants at the standard ladder widths (<= source width, never upscaled),
uploads them next to the JPEG as `<name>-<w>.webp`, and writes the resulting
srcset string to articles.image_srcset.

Idempotent: re-running only touches rows where image_srcset IS NULL.

Run from the scraper/ directory:
    python backfill_webp_variants.py [--dry-run] [--limit N] [--workers 4]
"""

import argparse
import io
import logging
import os
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed

import requests
from dotenv import load_dotenv
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from scraper.storage import (  # noqa: E402
    _BUCKET,
    _variant_widths,
    _webp_bytes,
    _public_url,
    _get_supabase,
)

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
logger = logging.getLogger(__name__)

_REQUEST_TIMEOUT = 20


def _path_from_url(url: str) -> str | None:
    marker = f"/storage/v1/object/public/{_BUCKET}/"
    idx = url.find(marker)
    if idx == -1:
        return None
    return url[idx + len(marker):]


def _process_one(row: dict, dry_run: bool) -> tuple[str, str | None, str]:
    """Returns (article_id, srcset_or_None, status)."""
    article_id = row["id"]
    url = row["featured_image_url"]
    path = _path_from_url(url)
    if not path or not path.lower().endswith((".jpg", ".jpeg", ".png", ".webp")):
        return article_id, None, "skip:bad-path"

    try:
        resp = requests.get(url, timeout=_REQUEST_TIMEOUT)
        resp.raise_for_status()
        img = Image.open(io.BytesIO(resp.content)).convert("RGB")
    except Exception as exc:
        return article_id, None, f"error:download:{exc}"

    stem = path.rsplit(".", 1)[0]  # storage path without extension
    entries: list[str] = []
    try:
        sb = _get_supabase()
        for width in _variant_widths(img.width):
            webp_path = f"{stem}-{width}.webp"
            if not dry_run:
                sb.storage.from_(_BUCKET).upload(
                    webp_path,
                    _webp_bytes(img, width),
                    {"content-type": "image/webp", "upsert": "true",
                     "cache-control": "public, max-age=31536000, immutable"},
                )
            entries.append(f"{_public_url(webp_path)} {width}w")
    except Exception as exc:
        return article_id, None, f"error:upload:{exc}"

    srcset = ", ".join(entries)
    if not dry_run:
        try:
            _get_supabase().table("articles").update(
                {"image_srcset": srcset}
            ).eq("id", article_id).execute()
        except Exception as exc:
            return article_id, srcset, f"error:db:{exc}"

    return article_id, srcset, f"ok:{len(entries)}w"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--limit", type=int, default=None)
    ap.add_argument("--workers", type=int, default=4)
    args = ap.parse_args()

    sb = _get_supabase()
    q = (
        sb.table("articles")
        .select("id,featured_image_url")
        .not_.is_("featured_image_url", "null")
        .is_("image_srcset", "null")
        .order("published_at", desc=True)
    )
    if args.limit:
        q = q.limit(args.limit)
    rows = q.execute().data or []
    logger.info("%d articles need WebP variants%s", len(rows), " (dry run)" if args.dry_run else "")

    ok = err = 0
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futs = {pool.submit(_process_one, r, args.dry_run): r for r in rows}
        for i, fut in enumerate(as_completed(futs), 1):
            aid, srcset, status = fut.result()
            if status.startswith("ok"):
                ok += 1
            else:
                err += 1
                logger.warning("[%d/%d] %s -> %s", i, len(rows), aid, status)
            if i % 25 == 0:
                logger.info("progress %d/%d (ok=%d err=%d)", i, len(rows), ok, err)

    logger.info("DONE ok=%d err=%d total=%d", ok, err, len(rows))
    return 0 if err == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
