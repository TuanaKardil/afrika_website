"""Score existing articles that have score=NULL in the DB.

Run: python3 backfill_scores.py
"""
import logging
import os
from dotenv import load_dotenv

load_dotenv()
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)


def main() -> None:
    from supabase import create_client
    from scraper.score import score_article

    sb = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])

    rows = (
        sb.table("articles")
        .select("id,title_original,content_original")
        .is_("score", "null")
        .execute()
    )
    articles = rows.data or []
    logger.info("Found %d articles with no score", len(articles))

    for i, row in enumerate(articles, 1):
        title = row.get("title_original") or ""
        content = row.get("content_original") or ""
        score = score_article(title, content)
        sb.table("articles").update({"score": score}).eq("id", row["id"]).execute()
        logger.info("[%d/%d] score=%d — %s", i, len(articles), score, title[:70])

    logger.info("Done: %d articles scored", len(articles))


if __name__ == "__main__":
    main()
