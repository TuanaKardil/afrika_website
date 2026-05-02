"""Force retranslate ALL articles with the updated SEO/GEO/AEO prompt + source link.

Run: cd scraper && python3 force_retranslate.py
"""
import logging
import os

from dotenv import load_dotenv

load_dotenv()
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)


def main() -> None:
    from supabase import create_client
    from scraper.translate import translate_articles
    from scraper.clean_content import clean_article_body

    sb = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])

    rows = (
        sb.table("articles")
        .select("id,source,source_url,title_original,excerpt_original,content_original,content_hash")
        .execute()
    )
    articles = rows.data or []
    logger.info("Found %d articles to retranslate", len(articles))

    # Force retranslation by nulling stored hash so translate_articles() doesn't skip
    for r in articles:
        r["content_hash_stored"] = None

    translated = translate_articles(articles)

    updated = 0
    skipped = 0
    for t in translated:
        title_tr = t.get("title_tr")
        if not title_tr or title_tr == t.get("title_original"):
            logger.warning("Translation failed/skipped for %s", t.get("source_url", "")[:80])
            skipped += 1
            continue

        content_tr = clean_article_body(t.get("content_tr") or "")

        sb.table("articles").update({
            "title_tr": title_tr,
            "excerpt_tr": t.get("excerpt_tr"),
            "content_tr": content_tr,
        }).eq("id", t["id"]).execute()

        logger.info("[%d] Updated: %s", updated + 1, title_tr[:70])
        updated += 1

    logger.info("Done: %d updated, %d skipped/failed", updated, skipped)


if __name__ == "__main__":
    main()
