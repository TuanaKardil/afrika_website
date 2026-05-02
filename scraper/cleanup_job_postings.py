"""One-shot script to remove existing job postings from the tenders table using AI."""
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

BATCH = 25

_JOB_PATTERNS = [
    "individual contractor", "national consultant", "international consultant",
    "national professional officer", "international professional officer",
    "national expert", "international expert", "vacancy announcement",
    "job opening", "call for applications", "hiring an ", "ic - individual",
    "- ic -", "- ic:", "terms of reference for a consultant",
    "terms of reference for consultant", "lta for individual",
    "programme officer", "programme associate", "project officer",
    "programme analyst", "field officer",
]


def _keyword_is_job(title: str) -> bool:
    t = title.lower()
    return any(p in t for p in _JOB_PATTERNS)


def _ai_is_job_batch(titles: list[str]) -> list[bool]:
    from scraper.scraper.openrouter import chat

    numbered = "\n".join(f"{i + 1}. {t[:120]}" for i, t in enumerate(titles))
    prompt = (
        "You will receive a numbered list of procurement notice titles from Africa.\n"
        "For each item decide: is it a JOB POSTING (hiring an individual person such as "
        "consultant, specialist, coordinator, officer, advisor, accountant, driver, engineer, "
        "analyst, assistant, manager, expert) or a REAL TENDER (procuring goods, construction "
        "works, or contracting a company/firm for services)?\n\n"
        "Rules:\n"
        "- 'Consulting firm to conduct study X' = REAL TENDER\n"
        "- 'Consultant for X / Specialist for Y / Coordinator Z' = JOB POSTING\n"
        "- 'Supply of goods / Construction of / Rehabilitation of' = REAL TENDER\n"
        "- 'Recruitment of individual / Selection of individual advisor' = JOB POSTING\n\n"
        f"{numbered}\n\n"
        "Return ONLY a JSON array of booleans, one per item in order.\n"
        "true = job posting (exclude), false = real tender (keep).\n"
        "Example for 3 items: [false, true, false]"
    )
    raw = chat([{"role": "user", "content": prompt}], temperature=0.0, max_tokens=512)
    if not raw:
        return [False] * len(titles)
    arr_m = re.search(r"\[.*?\]", raw, re.DOTALL)
    if not arr_m:
        return [False] * len(titles)
    try:
        result = json.loads(arr_m.group())
        while len(result) < len(titles):
            result.append(False)
        return [bool(x) for x in result[:len(titles)]]
    except Exception:
        return [False] * len(titles)


def main():
    from supabase import create_client

    sb = create_client(SUPABASE_URL, SUPABASE_KEY)

    rows = sb.table("tenders").select("id,title_original").limit(1000).execute().data or []
    logger.info("Total tenders in DB: %d", len(rows))

    to_delete: list[str] = []

    # Pass 1: keyword filter (free)
    remaining = []
    for row in rows:
        if _keyword_is_job(row["title_original"] or ""):
            to_delete.append(row["id"])
            logger.info("Keyword job: %s", (row["title_original"] or "")[:70])
        else:
            remaining.append(row)

    logger.info("Keyword filter removed %d, %d remain for AI check", len(to_delete), len(remaining))

    # Pass 2: AI batch check
    for i in range(0, len(remaining), BATCH):
        batch = remaining[i:i + BATCH]
        titles = [r["title_original"] or "" for r in batch]
        flags = _ai_is_job_batch(titles)
        for row, is_job in zip(batch, flags):
            if is_job:
                to_delete.append(row["id"])
                logger.info("AI job: %s", (row["title_original"] or "")[:70])
        time.sleep(0.5)

    logger.info("Total to delete: %d", len(to_delete))

    deleted = 0
    for tid in to_delete:
        try:
            sb.table("tenders").delete().eq("id", tid).execute()
            deleted += 1
        except Exception as e:
            logger.warning("Delete failed %s: %s", tid, e)

    logger.info("Done. Deleted %d job postings.", deleted)


if __name__ == "__main__":
    main()
