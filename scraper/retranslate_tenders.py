"""Re-translate all tenders using Gemini 2.5 Flash-Lite via tender_translate."""
import logging
import os
import time

from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

PAGE_SIZE = 200


def main():
    from supabase import create_client
    from scraper.tender_translate import translate_tender

    sb = create_client(SUPABASE_URL, SUPABASE_KEY)

    # Fetch all tenders with pagination
    all_rows: list[dict] = []
    offset = 0
    while True:
        batch = sb.table("tenders").select(
            "id,title_original,description_original,institution,country,title_tr"
        ).order("scraped_at", desc=True).range(offset, offset + PAGE_SIZE - 1).execute().data or []
        if not batch:
            break
        all_rows.extend(batch)
        if len(batch) < PAGE_SIZE:
            break
        offset += PAGE_SIZE

    # Prioritize failed translations (title_tr == title_original) first
    failed_ids = {r["id"] for r in all_rows if (r.get("title_tr") or "") == (r.get("title_original") or "")}
    failed = [r for r in all_rows if r["id"] in failed_ids]
    ok = [r for r in all_rows if r["id"] not in failed_ids]
    rows = failed + ok

    logger.info("Total: %d | Failed translations first: %d | Already translated: %d",
                len(rows), len(failed), len(ok))

    updated = 0
    skipped = 0

    for i, row in enumerate(rows):
        title = row.get("title_original") or ""
        description = row.get("description_original") or ""
        institution = row.get("institution") or ""
        country = row.get("country") or ""

        if not title:
            skipped += 1
            continue

        tr = translate_tender(title, description, institution, country)

        title_tr = tr.get("title_tr") or ""
        desc_tr = tr.get("description_tr") or ""

        if not title_tr or title_tr == title:
            logger.warning("[%d/%d] Translation failed or unchanged: %s", i + 1, len(rows), title[:60])
            skipped += 1
            time.sleep(0.3)
            continue

        try:
            sb.table("tenders").update({
                "title_tr": title_tr,
                "description_tr": desc_tr or description or None,
                "institution_tr": tr.get("institution_tr") or institution or None,
                "country_tr": tr.get("country_tr") or country or None,
            }).eq("id", row["id"]).execute()
            updated += 1
            logger.info("[%d/%d] OK: %s", i + 1, len(rows), title_tr[:70])
        except Exception as e:
            logger.error("Update failed %s: %s", row["id"], e)

        time.sleep(0.4)

    logger.info("Done. Updated: %d | Skipped: %d", updated, skipped)


if __name__ == "__main__":
    main()
