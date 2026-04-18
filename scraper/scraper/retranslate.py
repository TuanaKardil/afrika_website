"""Retranslate articles where title_tr equals title_original (untranslated fallback)."""
import asyncio
import concurrent.futures
import logging
import os
import sys

from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)


def main() -> None:
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        logger.warning("ANTHROPIC_API_KEY not set, skipping retranslation")
        return

    from supabase import create_client
    from scraper.translate import translate_articles

    sb = create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_ROLE_KEY"],
    )

    # Fetch articles where translation was not applied (title_tr equals title_original)
    rows = (
        sb.table("articles")
        .select("id,source_url,title_original,title_tr,excerpt_original,content_original,content_hash")
        .execute()
    )

    untranslated = [
        r for r in (rows.data or [])
        if r.get("title_tr") == r.get("title_original") or not r.get("title_tr")
    ]

    if not untranslated:
        logger.info("All articles already translated, nothing to do")
        return

    logger.info("Found %d untranslated articles, translating...", len(untranslated))

    # Mark content_hash_stored as different to force translation
    for r in untranslated:
        r["content_hash_stored"] = None

    translated = translate_articles(untranslated)

    updated = 0
    for t in translated:
        if t.get("title_tr") and t["title_tr"] != t.get("title_original"):
            sb.table("articles").update({
                "title_tr": t["title_tr"],
                "excerpt_tr": t.get("excerpt_tr"),
                "content_tr": t.get("content_tr"),
            }).eq("source_url", t["source_url"]).execute()
            updated += 1

    logger.info("Retranslation complete: %d/%d articles updated", updated, len(untranslated))


if __name__ == "__main__":
    main()
