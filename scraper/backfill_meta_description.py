"""Backfill meta_description_tr for existing articles.

Fetches articles where meta_description_tr IS NULL and content_tr IS NOT NULL,
generates a Turkish SEO meta description for each, and updates the DB.

Usage:
    cd scraper
    python backfill_meta_description.py [--limit N] [--dry-run]
"""

import argparse
import concurrent.futures
import logging
import os
import sys
import time

from dotenv import load_dotenv

load_dotenv()
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

BATCH_SIZE = 200
MAX_WORKERS = 4


def _get_supabase():
    from supabase import create_client
    return create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_ROLE_KEY"],
    )


def _process_article(article: dict) -> dict | None:
    """Generate meta description for one article. Returns update dict or None on failure."""
    from scraper.translate import generate_meta_description

    article_id = article["id"]
    title_tr = article.get("title_tr") or ""
    content_tr = article.get("content_tr") or ""

    if not title_tr or not content_tr:
        logger.warning("Skipping %s — missing title_tr or content_tr", article_id)
        return None

    meta_desc = generate_meta_description(title_tr, content_tr)
    if not meta_desc:
        logger.warning("Generation failed for %s", article_id)
        return None

    logger.info("OK %s | %d chars | %.80s", article_id[:8], len(meta_desc), meta_desc)
    return {"id": article_id, "meta_description_tr": meta_desc}


def main():
    parser = argparse.ArgumentParser(description="Backfill meta_description_tr")
    parser.add_argument("--limit", type=int, default=0, help="Max articles to process (0 = all)")
    parser.add_argument("--dry-run", action="store_true", help="Generate but do not write to DB")
    args = parser.parse_args()

    supabase = _get_supabase()

    logger.info("Fetching articles with missing meta_description_tr...")
    query = (
        supabase.table("articles")
        .select("id,title_tr,content_tr")
        .is_("meta_description_tr", "null")
        .not_.is_("content_tr", "null")
        .not_.is_("title_tr", "null")
        .order("published_at", desc=True)
    )
    if args.limit:
        query = query.limit(args.limit)

    rows = query.execute()
    articles = rows.data or []
    logger.info("Found %d articles to process", len(articles))

    if not articles:
        logger.info("Nothing to do.")
        return

    updated = 0
    failed = 0
    start = time.time()

    with concurrent.futures.ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        futures = {executor.submit(_process_article, art): art for art in articles}
        for future in concurrent.futures.as_completed(futures):
            try:
                result = future.result()
                if result:
                    if not args.dry_run:
                        supabase.table("articles").update(
                            {"meta_description_tr": result["meta_description_tr"]}
                        ).eq("id", result["id"]).execute()
                    updated += 1
                else:
                    failed += 1
            except Exception as exc:
                art = futures[future]
                logger.error("Thread error for %s: %s", art.get("id", "?"), exc)
                failed += 1

    elapsed = time.time() - start
    logger.info(
        "Done in %.1fs — updated: %d, failed: %d%s",
        elapsed, updated, failed,
        " (DRY RUN — no writes)" if args.dry_run else "",
    )


if __name__ == "__main__":
    sys.path.insert(0, os.path.dirname(__file__))
    main()
