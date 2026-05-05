"""Extract budget_usd values from tender descriptions where budget_usd is NULL."""
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

EUR_TO_USD = 1.08
GBP_TO_USD = 1.27
CHF_TO_USD = 1.12

# (pattern, currency_code) — captures (amount_str, optional_multiplier)
_PATTERNS: list[tuple[str, str]] = [
    (r'US?\$\s*([\d,\.]+)\s*(million|billion|M|B)?', "USD"),
    (r'([\d,\.]+)\s*(million|billion|M|B)?\s*USD', "USD"),
    (r'USD\s*([\d,\.]+)\s*(million|billion|M|B)?', "USD"),
    (r'€\s*([\d,\.]+)\s*(million|billion|M|B)?', "EUR"),
    (r'([\d,\.]+)\s*(million|billion|M|B)?\s*EUR(?:O)?', "EUR"),
    (r'EUR\s*([\d,\.]+)\s*(million|billion|M|B)?', "EUR"),
    (r'£\s*([\d,\.]+)\s*(million|billion|M|B)?', "GBP"),
    (r'GBP\s*([\d,\.]+)\s*(million|billion|M|B)?', "GBP"),
    (r'CHF\s*([\d,\.]+)\s*(million|billion|M|B)?', "CHF"),
]

_COMPILED = [(re.compile(p, re.IGNORECASE), cur) for p, cur in _PATTERNS]


def _parse_amount(amount_str: str, multiplier: str | None) -> float:
    amount_str = amount_str.replace(",", "")
    value = float(amount_str)
    if multiplier:
        m = multiplier.lower()
        if m in ("billion", "b"):
            value *= 1_000_000_000
        elif m in ("million", "m"):
            value *= 1_000_000
    return value


def _to_usd(value: float, currency: str) -> float:
    if currency == "EUR":
        return value * EUR_TO_USD
    if currency == "GBP":
        return value * GBP_TO_USD
    if currency == "CHF":
        return value * CHF_TO_USD
    return value


def extract_budget(text: str) -> float | None:
    for pattern, currency in _COMPILED:
        m = pattern.search(text)
        if m:
            try:
                groups = m.groups()
                amount_str = groups[0]
                multiplier = groups[1] if len(groups) > 1 else None
                value = _parse_amount(amount_str, multiplier)
                if value <= 0 or value > 1_000_000_000_000:
                    continue
                return round(_to_usd(value, currency), 2)
            except (ValueError, IndexError):
                continue
    return None


def main():
    from supabase import create_client

    sb = create_client(SUPABASE_URL, SUPABASE_KEY)

    all_rows: list[dict] = []
    offset = 0
    while True:
        batch = (
            sb.table("tenders")
            .select("id,description_original,title_original")
            .is_("budget_usd", "null")
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

    logger.info("Found %d tenders with no budget, attempting extraction", len(all_rows))

    updated = skipped = 0
    for i, row in enumerate(all_rows):
        text = (row.get("title_original") or "") + " " + (row.get("description_original") or "")
        budget = extract_budget(text)
        if budget is None:
            skipped += 1
            continue
        try:
            sb.table("tenders").update({"budget_usd": budget}).eq("id", row["id"]).execute()
            updated += 1
            logger.info("[%d/%d] %s -> $%.0f", i + 1, len(all_rows), row["id"][:8], budget)
        except Exception as exc:
            logger.error("Update failed %s: %s", row["id"], exc)
        time.sleep(0.05)

    logger.info("Done. Updated: %d | Skipped: %d", updated, skipped)


if __name__ == "__main__":
    main()
