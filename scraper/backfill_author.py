"""Backfill articles.author_slug for existing articles.

Assigns one of the 7 named site authors to every article using the same
deterministic rule as the live scraper (scraper/scraper/authors.assign_author),
keyed on region_slug / nav_tab_slug / country hashtags. NO AI or network call
per row, so this is a fast pure-Python pass (no threads needed).

Writes ONLY the author_slug column, never updated_at (CLAUDE.md rule 17):
author assignment is not reader-visible content, so it must not touch sitemap
lastmod / JSON-LD dateModified / the "Güncellendi:" badge.

Usage:
    cd scraper
    python backfill_author.py [--limit N] [--dry-run] [--all]

By default only rows where author_slug IS NULL are processed; pass --all to
re-assign every article (useful after a mapping change).
"""

import argparse
import logging
import os
import sys
from collections import Counter

from dotenv import load_dotenv

load_dotenv()
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

PAGE = 1000


def _get_supabase():
    from supabase import create_client
    return create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_ROLE_KEY"],
    )


def _fetch_all(supabase, only_missing: bool, limit: int):
    """Fetch articles (id, region_slug, nav_tab_slug, hashtags) with pagination."""
    articles: list[dict] = []
    offset = 0
    while True:
        query = (
            supabase.table("articles")
            .select("id,region_slug,nav_tab_slug,hashtags,author_slug,source_url")
            .order("published_at", desc=True)
        )
        if only_missing:
            query = query.is_("author_slug", "null")
        rows = query.range(offset, offset + PAGE - 1).execute()
        batch = rows.data or []
        articles.extend(batch)
        if limit and len(articles) >= limit:
            return articles[:limit]
        if len(batch) < PAGE:
            return articles
        offset += PAGE


def main():
    parser = argparse.ArgumentParser(description="Backfill articles.author_slug")
    parser.add_argument("--limit", type=int, default=0, help="Max articles to process (0 = all)")
    parser.add_argument("--dry-run", action="store_true", help="Compute but do not write to DB")
    parser.add_argument("--all", action="store_true", help="Re-assign every article, not just NULL ones")
    args = parser.parse_args()

    from scraper.authors import assign_author

    supabase = _get_supabase()

    logger.info("Fetching articles (%s)...", "all" if args.all else "author_slug IS NULL")
    articles = _fetch_all(supabase, only_missing=not args.all, limit=args.limit)
    logger.info("Found %d articles to process", len(articles))
    if not articles:
        logger.info("Nothing to do.")
        return

    dist = Counter()
    updated = 0
    unchanged = 0

    for art in articles:
        author_slug = assign_author(
            art.get("region_slug"),
            art.get("nav_tab_slug"),
            art.get("hashtags") or [],
            art.get("source_url"),
        )
        dist[author_slug] += 1

        if art.get("author_slug") == author_slug:
            unchanged += 1
            continue

        if not args.dry_run:
            supabase.table("articles").update(
                {"author_slug": author_slug}
            ).eq("id", art["id"]).execute()
        updated += 1

    logger.info("Distribution across authors:")
    for slug, n in dist.most_common():
        logger.info("  %-22s %4d", slug, n)
    logger.info(
        "Done. updated: %d, unchanged: %d%s",
        updated, unchanged,
        " (DRY RUN, no writes)" if args.dry_run else "",
    )


if __name__ == "__main__":
    sys.path.insert(0, os.path.dirname(__file__))
    main()
