"""Re-run hashtag assignment and classification for articles.

Default: only articles missing hashtags or nav_tab_slug.
--force-all: re-process every article (use after sector/hashtag list updates).
"""
import argparse
import logging
import os

from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

_OLD_SECTOR_SLUGS = {
    "telekomunikasyon",
    "fintech-dijital-odeme",
    "ilac-tibbi-cihaz",
    "yenilenebilir-enerji",
    "fuarcilik-etkinlik",
}


def _has_stale_sectors(article: dict) -> bool:
    slugs = article.get("sector_slugs") or []
    return bool(set(slugs) & _OLD_SECTOR_SLUGS)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--force-all",
        action="store_true",
        help="Re-process all articles, not just those missing data",
    )
    args = parser.parse_args()

    api_key = os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        logger.warning("OPENROUTER_API_KEY not set, skipping rehash")
        return

    from supabase import create_client
    from scraper.classify import classify_article
    from scraper.hashtags import assign_hashtags

    sb = create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_ROLE_KEY"],
    )

    rows = (
        sb.table("articles")
        .select("id, source_url, title_original, content_original, hashtags, nav_tab_slug, sector_slugs, region_slug")
        .execute()
    )

    articles = rows.data or []

    if args.force_all:
        logger.info("--force-all: reprocessing all %d articles", len(articles))
    else:
        needs_hashtags = len([a for a in articles if not a.get("hashtags")])
        needs_classify = len([a for a in articles if not a.get("nav_tab_slug")])
        needs_sector_fix = len([a for a in articles if _has_stale_sectors(a)])
        logger.info(
            "%d missing hashtags, %d missing nav_tab, %d have stale sector slugs",
            needs_hashtags, needs_classify, needs_sector_fix,
        )

    updated = 0
    for art in articles:
        needs_hashtag_update = args.force_all or not art.get("hashtags")
        needs_classify_update = (
            args.force_all
            or not art.get("nav_tab_slug")
            or _has_stale_sectors(art)
        )

        if not needs_hashtag_update and not needs_classify_update:
            continue

        changes: dict = {}

        if needs_hashtag_update:
            hashtags = assign_hashtags(
                art.get("title_original", ""),
                art.get("content_original", ""),
            )
            if hashtags:
                changes["hashtags"] = hashtags

        if needs_classify_update:
            nav_tab, sectors, region = classify_article(
                art.get("title_original", ""),
                art.get("content_original", ""),
            )
            changes["nav_tab_slug"] = nav_tab
            changes["sector_slugs"] = sectors
            changes["region_slug"] = region

        if changes:
            sb.table("articles").update(changes).eq("id", art["id"]).execute()
            logger.info("Updated %s: %s", art.get("source_url", art["id"])[-60:], list(changes.keys()))
            updated += 1

    logger.info("Rehash complete: %d/%d articles updated", updated, len(articles))


if __name__ == "__main__":
    main()
