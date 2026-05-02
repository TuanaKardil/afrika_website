"""Backfill inline images for all existing articles.

For each article:
  1. Re-fetches the original source page
  2. Extracts editorial inline images (lazy-load aware)
  3. Uploads them to Supabase Storage
  4. Rewrites img src in content_original / content_tr
  5. Injects images not already in content as <figure> blocks
  6. Writes back to Supabase

Usage (from the scraper/ directory):
  python backfill_inline_images.py
  python backfill_inline_images.py --limit 20   # process only first 20 articles
  python backfill_inline_images.py --source aa_africa  # one source only
"""
import argparse
import logging
import os
import time
from collections import defaultdict
from datetime import datetime, timezone

import requests
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

_USER_AGENT = "AfrikaHaberleriBot/1.0 (+https://github.com/TuanaKardil/afrika_website)"
_REQUEST_TIMEOUT = 20
_DELAY = 1.5  # seconds between fetches (per domain)


# ─── helpers ─────────────────────────────────────────────────────────────────

def _fetch_html(url: str) -> str | None:
    try:
        resp = requests.get(
            url,
            headers={"User-Agent": _USER_AGENT},
            timeout=_REQUEST_TIMEOUT,
            allow_redirects=True,
        )
        if resp.status_code == 200:
            return resp.text
        logger.warning("  HTTP %d for %s", resp.status_code, url[:80])
        return None
    except Exception as exc:
        logger.warning("  Fetch failed for %s: %s", url[:80], exc)
        return None


class _FakeResponse:
    """Minimal stub so extract_inline_images() works without a live Scrapy response."""
    def __init__(self, text: str):
        self.text = text


def _parse_dt(raw: str | None) -> datetime:
    if not raw:
        return datetime.now(timezone.utc)
    try:
        return datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except Exception:
        return datetime.now(timezone.utc)


# ─── main ────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description="Backfill inline images for all articles")
    parser.add_argument("--limit", type=int, default=0, help="Max articles to process (0 = all)")
    parser.add_argument("--source", type=str, default="", help="Filter by source slug")
    args = parser.parse_args()

    from supabase import create_client
    from scraper.extractors import extract_inline_images
    from scraper.storage import upload_image, rewrite_image_srcs

    sb = create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_ROLE_KEY"],
    )

    # Load articles
    query = sb.table("articles").select(
        "id,source_url,source,published_at,"
        "content_original,content_tr,"
        "featured_image_source_url"
    )
    if args.source:
        query = query.eq("source", args.source)

    rows = query.execute().data or []

    if args.limit:
        rows = rows[:args.limit]

    total = len(rows)
    logger.info("Articles to process: %d", total)

    counters = defaultdict(int)
    domain_last_fetch: dict[str, float] = {}

    for i, row in enumerate(rows, 1):
        article_id = row["id"]
        source_url = row.get("source_url") or ""
        source = row.get("source") or "unknown"

        if not source_url:
            counters["skipped_no_url"] += 1
            continue

        logger.info("[%d/%d] %s", i, total, source_url[-80:])

        # Per-domain rate limiting
        try:
            from urllib.parse import urlparse
            domain = urlparse(source_url).netloc
        except Exception:
            domain = source_url[:30]
        last = domain_last_fetch.get(domain, 0.0)
        wait = _DELAY - (time.time() - last)
        if wait > 0:
            time.sleep(wait)

        html = _fetch_html(source_url)
        domain_last_fetch[domain] = time.time()

        if not html:
            counters["fetch_failed"] += 1
            continue

        # Extract inline images
        fake_resp = _FakeResponse(html)
        inline_urls = extract_inline_images(fake_resp)

        # Remove the featured image from inline list (shown separately as hero)
        featured_src = row.get("featured_image_source_url") or ""
        if featured_src in inline_urls:
            inline_urls.remove(featured_src)

        if not inline_urls:
            logger.info("  No editorial inline images found")
            counters["no_images"] += 1
            continue

        logger.info("  Found %d inline image(s)", len(inline_urls))

        published_at = _parse_dt(row.get("published_at"))

        # Upload each image
        url_map: dict[str, str] = {}
        for j, src in enumerate(inline_urls):
            new_url = upload_image(
                image_url=src,
                article_id=f"{article_id}-backfill{j}",
                source=source,
                published_at=published_at,
            )
            if new_url:
                url_map[src] = new_url
                logger.info("  + %s", new_url[-70:])
            else:
                logger.warning("  Upload failed: %s", src[:80])

        if not url_map:
            counters["upload_failed"] += 1
            continue

        # Rewrite existing img srcs in content
        content_original = rewrite_image_srcs(row.get("content_original") or "", url_map)
        content_tr = rewrite_image_srcs(row.get("content_tr") or "", url_map)

        # Inject images not already referenced in content
        figures = ""
        for supabase_url in url_map.values():
            if supabase_url and supabase_url not in content_tr and supabase_url not in content_original:
                figures += f'<figure><img src="{supabase_url}" alt="" /></figure>\n'

        if figures:
            if content_original:
                content_original += "\n" + figures
            if content_tr:
                content_tr += "\n" + figures

        # Persist to Supabase
        try:
            sb.table("articles").update({
                "content_original": content_original,
                "content_tr": content_tr,
            }).eq("id", article_id).execute()
            counters["updated"] += 1
            logger.info("  Saved %d image(s) for article %s", len(url_map), article_id)
        except Exception as exc:
            logger.error("  DB update failed for %s: %s", article_id, exc)
            counters["db_error"] += 1

    logger.info(
        "Done. updated=%d  no_images=%d  fetch_failed=%d  upload_failed=%d  db_error=%d  skipped=%d",
        counters["updated"],
        counters["no_images"],
        counters["fetch_failed"],
        counters["upload_failed"],
        counters["db_error"],
        counters["skipped_no_url"],
    )


if __name__ == "__main__":
    main()
