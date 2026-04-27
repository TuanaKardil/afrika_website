"""Re-run hashtag assignment and classification for articles that are missing them."""
import logging
import os

from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)


def main() -> None:
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
    needs_hashtags = [a for a in articles if not a.get("hashtags")]
    needs_classify = [a for a in articles if not a.get("nav_tab_slug")]

    logger.info(
        "%d articles need hashtags, %d need classification",
        len(needs_hashtags), len(needs_classify),
    )

    updated = 0
    for art in articles:
        changes: dict = {}

        if not art.get("hashtags"):
            hashtags = assign_hashtags(
                art.get("title_original", ""),
                art.get("content_original", ""),
            )
            if hashtags:
                changes["hashtags"] = hashtags

        if not art.get("nav_tab_slug"):
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
