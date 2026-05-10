"""Force-retranslate all published articles (score >= 5) using the current translate.py prompt.

Run: python3 backfill_translate.py [--limit N]

By default retranslates all qualifying articles. Use --limit to cap for testing.
"""
import argparse
import logging
import os
import sys

from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

MIN_SCORE = 5


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=0, help="Max articles to retranslate (0 = all)")
    args = parser.parse_args()

    api_key = os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        logger.error("OPENROUTER_API_KEY not set, aborting")
        sys.exit(1)

    from supabase import create_client
    from scraper.translate import translate_articles
    from scraper.clean_content import clean_article_body

    sb = create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_ROLE_KEY"],
    )

    query = (
        sb.table("articles")
        .select("id,source_url,source,title_original,excerpt_original,content_original,content_hash")
        .gte("score", MIN_SCORE)
        .eq("is_suppressed", False)
        .order("published_at", desc=True)
    )
    if args.limit:
        query = query.limit(args.limit)

    rows = query.execute()
    articles = rows.data or []
    logger.info("Found %d articles with score >= %d to retranslate", len(articles), MIN_SCORE)

    if not articles:
        logger.info("Nothing to do.")
        return

    # Force retranslation by clearing content_hash_stored
    for r in articles:
        r["content_hash_stored"] = None

    translated = translate_articles(articles)

    updated = 0
    failed = 0
    for t in translated:
        if t.get("title_tr") and t["title_tr"] != t.get("title_original"):
            content_tr = clean_article_body(t.get("content_tr") or "")
            try:
                sb.table("articles").update({
                    "title_tr": t["title_tr"],
                    "excerpt_tr": t.get("excerpt_tr"),
                    "content_tr": content_tr,
                }).eq("source_url", t["source_url"]).execute()
                updated += 1
                logger.info("[%d] Updated: %s", updated, t.get("title_original", "")[:70])
            except Exception as exc:
                logger.error("DB update failed for %s: %s", t.get("source_url"), exc)
                failed += 1
        else:
            failed += 1
            logger.warning("Translation failed for: %s", t.get("source_url", "")[:80])

    logger.info("Done: %d updated, %d failed out of %d total", updated, failed, len(articles))


if __name__ == "__main__":
    main()
