"""Re-translate all tenders in DB with the improved prompt (Turkish chars + sentence case)."""
import json
import logging
import os
import re
import time

from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
OPENROUTER_KEY = os.environ.get("OPENROUTER_API_KEY", "")


def _ai_translate(title: str, description: str, institution: str, country: str) -> dict:
    from scraper.scraper.openrouter import chat

    snippet = description[:800] if description else ""
    prompt = (
        "Translate the following tender fields into Turkish.\n"
        "Return ONLY a valid JSON object with exactly these keys: title_tr, description_tr, institution_tr, country_tr.\n"
        "Rules:\n"
        "- Always use correct Turkish special characters: ş ğ ö ü ç ı İ. Never substitute ASCII equivalents (e.g. 's' for 'ş').\n"
        "- Title must be sentence case: capitalize only the first word and proper nouns. Never output ALL CAPS.\n"
        "- Do not use em dashes anywhere in the output.\n"
        "- Use natural, fluent Turkish with correct grammar and punctuation. Avoid literal word-for-word translation.\n"
        '- Country names use standard Turkish forms (e.g. "Nigeria" -> "Nijerya", "Mozambique" -> "Mozambik", "Ethiopia" -> "Etiyopya").\n'
        "- Keep project codes, reference numbers, and proper nouns (names of projects, organisations) as-is.\n"
        "- description_tr: translate faithfully; do not summarise or shorten.\n\n"
        f"title: {title}\n"
        f"description: {snippet}\n"
        f"institution: {institution}\n"
        f"country: {country}\n"
    )
    raw = chat([{"role": "user", "content": prompt}], temperature=0.0, max_tokens=1024)
    if not raw:
        return {}
    m = re.search(r"\{.*\}", raw, re.DOTALL)
    if not m:
        return {}
    try:
        return json.loads(m.group())
    except Exception:
        return {}


def _needs_retranslation(row: dict) -> bool:
    title_tr = row.get("title_tr") or ""
    # ALL CAPS title
    if title_tr and title_tr == title_tr.upper() and len(title_tr) > 5:
        return True
    # Missing Turkish chars — check if any expected Turkish chars are absent
    # while the title is clearly Turkish-translatable (has Latin chars)
    if title_tr and len(title_tr) > 10:
        # If title_tr is identical to title_original, translation didn't happen
        if title_tr == (row.get("title_original") or ""):
            return True
    return True  # Re-translate everything for quality improvement


def main():
    from supabase import create_client

    sb = create_client(SUPABASE_URL, SUPABASE_KEY)
    rows = sb.table("tenders").select(
        "id,title_original,description_original,institution,country,title_tr"
    ).limit(1000).execute().data or []

    logger.info("Total tenders to re-translate: %d", len(rows))

    updated = 0
    for i, row in enumerate(rows):
        title = row.get("title_original") or ""
        description = row.get("description_original") or ""
        institution = row.get("institution") or ""
        country = row.get("country") or ""

        tr = _ai_translate(title, description, institution, country)
        if not tr:
            logger.warning("No translation for row %s, skipping", row["id"])
            continue

        try:
            sb.table("tenders").update({
                "title_tr": tr.get("title_tr") or title,
                "description_tr": tr.get("description_tr") or description or None,
                "institution_tr": tr.get("institution_tr") or institution or None,
                "country_tr": tr.get("country_tr") or country or None,
            }).eq("id", row["id"]).execute()
            updated += 1
            logger.info("[%d/%d] Updated: %s", i + 1, len(rows), (tr.get("title_tr") or title)[:70])
        except Exception as e:
            logger.error("Update failed %s: %s", row["id"], e)

        time.sleep(0.5)

    logger.info("Done. Re-translated %d tenders.", updated)


if __name__ == "__main__":
    main()
