"""Backfill classification for articles with nav_tab_slug='diger' and empty sector_slugs.

Usage (from the scraper/ directory):
  python backfill_classify.py
  python backfill_classify.py --limit 50
  python backfill_classify.py --dry-run
"""
import argparse
import logging
import os
import time

from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

_DELAY = 0.6


def main() -> None:
    parser = argparse.ArgumentParser(description="Backfill classification for diger+empty-sector articles")
    parser.add_argument("--limit", type=int, default=0, help="Max articles to process (0 = all)")
    parser.add_argument("--dry-run", action="store_true", help="Preview only, no DB writes")
    args = parser.parse_args()

    from supabase import create_client
    from scraper.classify import classify_article

    url = os.environ["SUPABASE_URL"]
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    sb = create_client(url, key)

    query = (
        sb.table("articles")
        .select("id, title_original, content_original, nav_tab_slug, sector_slugs, region_slug")
        .eq("nav_tab_slug", "diger")
        .eq("sector_slugs", "{}")
        .not_.is_("title_original", "null")
        .order("published_at", desc=True)
    )
    if args.limit:
        query = query.limit(args.limit)

    rows = query.execute().data
    logger.info("Found %d articles to reclassify", len(rows))

    updated = skipped = errors = 0

    for row in rows:
        title = row.get("title_original") or ""
        content = row.get("content_original") or ""

        try:
            nav_tab, sectors, region = classify_article(title, content)
        except Exception as exc:
            logger.error("classify failed for %s: %s", row["id"], exc)
            errors += 1
            time.sleep(_DELAY)
            continue

        if nav_tab == "diger" and not sectors:
            logger.info("SKIP %s — still diger/no sectors", row["id"])
            skipped += 1
            time.sleep(_DELAY)
            continue

        logger.info(
            "UPDATE %s | nav=%s sectors=%s region=%s",
            row["id"], nav_tab, sectors, region,
        )

        if not args.dry_run:
            sb.table("articles").update({
                "nav_tab_slug": nav_tab,
                "sector_slugs": sectors,
                "region_slug": region,
            }).eq("id", row["id"]).execute()
            updated += 1

        time.sleep(_DELAY)

    logger.info("Done — updated=%d skipped=%d errors=%d", updated, skipped, errors)


if __name__ == "__main__":
    main()
