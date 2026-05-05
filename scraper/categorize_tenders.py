"""Re-categorize tenders sitting in 'diger' using keyword matching."""
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

PAGE_SIZE = 200

# Each rule: (category_slug, [keywords]) — first match wins, order matters
KEYWORD_RULES: list[tuple[str, list[str]]] = [
    ("altyapi", [
        "construction", "infrastructure", "road", "roads", "bridge", "civil works",
        "building", "buildings", "port", "harbour", "harbor", "dam", "drainage",
        "sanitation", "sewage", "pipeline", "rehabilitation", "renovation",
        "inşaat", "altyapı", "bina", "yol", "köprü",
    ]),
    ("enerji", [
        "energy", "solar", "wind", "power plant", "electricity", "grid", "electrification",
        "oil and gas", "petroleum", "fuel", "renewable", "hydropower",
        "güneş", "rüzgar", "enerji", "çevre", "environment", "climate",
    ]),
    ("saglik", [
        "health", "hospital", "medical", "pharmaceutical", "medicine",
        "clinic", "laboratory", "vaccine", "ambulance", "surgery",
        "sağlık", "hastane", "tıbbi", "ilaç",
    ]),
    ("teknoloji", [
        "software", "information technology", "ict", "computer", "digital",
        "tablet", "laptop", "server", "network", "cybersecurity", "platform",
        "bilgisayar", "teknoloji", "yazılım",
    ]),
    ("danismanlik", [
        "consultant", "consulting", "advisory", "technical assistance",
        "capacity building", "training", "feasibility", "assessment", "evaluation",
        "danışman", "danışmanlık",
    ]),
    ("tarim", [
        "agriculture", "food security", "farming", "irrigation", "crop",
        "livestock", "fisheries", "rural development",
        "tarım", "gıda", "sulama",
    ]),
    ("lojistik", [
        "transport", "logistics", "freight", "shipping", "truck", "vehicle",
        "fleet", "customs", "warehouse",
        "lojistik", "taşımacılık", "nakliye",
    ]),
]


def _match_category(title: str, description: str) -> str | None:
    text = (title + " " + description).lower()
    for slug, keywords in KEYWORD_RULES:
        for kw in keywords:
            if re.search(r'\b' + re.escape(kw) + r'\b', text):
                return slug
    return None


def main():
    from supabase import create_client

    sb = create_client(SUPABASE_URL, SUPABASE_KEY)

    all_rows: list[dict] = []
    offset = 0
    while True:
        batch = (
            sb.table("tenders")
            .select("id,title_original,description_original,category_slug")
            .eq("category_slug", "diger")
            .range(offset, offset + PAGE_SIZE - 1)
            .execute()
            .data or []
        )
        if not batch:
            break
        all_rows.extend(batch)
        if len(batch) < PAGE_SIZE:
            break
        offset += PAGE_SIZE

    logger.info("Found %d tenders in 'diger', attempting re-categorization", len(all_rows))

    updated = skipped = 0
    for i, row in enumerate(all_rows):
        new_cat = _match_category(
            row.get("title_original") or "",
            row.get("description_original") or "",
        )
        if not new_cat or new_cat == "diger":
            skipped += 1
            continue
        try:
            sb.table("tenders").update({"category_slug": new_cat}).eq("id", row["id"]).execute()
            updated += 1
            logger.info("[%d/%d] %s -> %s", i + 1, len(all_rows), row["id"][:8], new_cat)
        except Exception as exc:
            logger.error("Update failed %s: %s", row["id"], exc)
        time.sleep(0.05)

    logger.info("Done. Updated: %d | Skipped: %d", updated, skipped)


if __name__ == "__main__":
    main()
