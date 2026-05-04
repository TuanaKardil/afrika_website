"""Backfill hashtags for articles that have an empty hashtags array.

Usage (from the scraper/ directory):
  python backfill_hashtags.py
  python backfill_hashtags.py --limit 50
  python backfill_hashtags.py --dry-run
"""
import argparse
import logging
import os
import time

from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

_DELAY = 0.5  # seconds between API calls


def main() -> None:
    parser = argparse.ArgumentParser(description="Backfill hashtags for articles with empty hashtags")
    parser.add_argument("--limit", type=int, default=0, help="Max articles to process (0 = all)")
    parser.add_argument("--dry-run", action="store_true", help="Preview only, no DB writes")
    args = parser.parse_args()

    from supabase import create_client
    from scraper.hashtags import assign_hashtags

    sb = create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_ROLE_KEY"],
    )

    rows = (
        sb.table("articles")
        .select("id,title_original,content_original,hashtags")
        .execute()
        .data or []
    )

    # Filter to articles with empty or null hashtags
    to_fix = [r for r in rows if not r.get("hashtags")]
    logger.info("Articles with empty hashtags: %d", len(to_fix))

    if args.limit:
        to_fix = to_fix[:args.limit]

    updated = 0
    failed = 0

    for i, row in enumerate(to_fix, 1):
        article_id = row["id"]
        title = row.get("title_original") or ""
        content = row.get("content_original") or ""

        logger.info("[%d/%d] %s", i, len(to_fix), title[:80])

        tags = assign_hashtags(title, content)

        if not tags:
            logger.warning("  assign_hashtags returned empty for %s", article_id)
            failed += 1
            time.sleep(_DELAY)
            continue

        logger.info("  Assigned %d tags: %s", len(tags), tags[:5])

        if args.dry_run:
            updated += 1
            time.sleep(_DELAY)
            continue

        try:
            sb.table("articles").update({"hashtags": tags}).eq("id", article_id).execute()
            updated += 1
        except Exception as exc:
            logger.error("  DB update failed for %s: %s", article_id, exc)
            failed += 1

        time.sleep(_DELAY)

    logger.info(
        "Done. updated=%d  failed=%d  dry_run=%s",
        updated, failed, args.dry_run,
    )


if __name__ == "__main__":
    main()
