"""Apply translation post-processing fixes to all existing articles in the DB.

Fixes: word substitutions (sedate, pontif, Popemobil, firebrand, Kütle/Mass),
apostrophe rules for Turkish proper noun suffixes (ABD'den, Kamerun'da, etc.).
"""
import logging
import os

from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)


def main() -> None:
    from supabase import create_client
    from scraper.translate import postprocess, _strip_em_dashes

    sb = create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_ROLE_KEY"],
    )

    rows = sb.table("articles").select(
        "id,title_tr,excerpt_tr,content_tr"
    ).not_.is_("title_tr", "null").execute()

    updated = 0
    for row in (rows.data or []):
        original_title = row.get("title_tr") or ""
        original_excerpt = row.get("excerpt_tr") or ""
        original_content = row.get("content_tr") or ""

        new_title = postprocess(_strip_em_dashes(original_title))
        new_excerpt = postprocess(_strip_em_dashes(original_excerpt))
        new_content = postprocess(_strip_em_dashes(original_content))

        if new_title != original_title or new_excerpt != original_excerpt or new_content != original_content:
            sb.table("articles").update({
                "title_tr": new_title,
                "excerpt_tr": new_excerpt,
                "content_tr": new_content,
            }).eq("id", row["id"]).execute()
            updated += 1
            logger.info("Post-processed: %s", new_title[:80])

    logger.info("Post-processing complete: %d/%d articles updated", updated, len(rows.data or []))


if __name__ == "__main__":
    main()
