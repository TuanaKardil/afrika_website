"""AI-based content cleaning backfill: remove off-topic promotional content from
all existing translated articles (content_tr) using Gemini 2.5 Flash-Lite.

Run: python3 clean_db.py
"""
import logging
import os

from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)


def main() -> None:
    from supabase import create_client
    from scraper.clean_content import clean_article_body

    sb = create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_ROLE_KEY"],
    )

    page_size = 100
    offset = 0
    total_updated = 0
    total_rows = 0

    while True:
        rows = (
            sb.table("articles")
            .select("id,content_tr")
            .not_.is_("content_tr", "null")
            .range(offset, offset + page_size - 1)
            .execute()
        )
        batch = rows.data or []
        if not batch:
            break
        total_rows += len(batch)

        for row in batch:
            original = row.get("content_tr") or ""
            cleaned = clean_article_body(original)
            if cleaned != original:
                sb.table("articles").update({"content_tr": cleaned}).eq("id", row["id"]).execute()
                total_updated += 1
                logger.info("Cleaned article %s", row["id"])

        offset += page_size
        if len(batch) < page_size:
            break

    logger.info("Done: %d/%d articles cleaned", total_updated, total_rows)


if __name__ == "__main__":
    main()
