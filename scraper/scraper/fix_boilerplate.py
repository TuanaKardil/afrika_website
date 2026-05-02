"""Remove boilerplate promotional content (newsletter signup, security verification, etc.)
from existing articles in the DB — both content_original and content_tr.

Run: python3 -m scraper.fix_boilerplate
"""
import logging
import os

from bs4 import BeautifulSoup
from dotenv import load_dotenv

from scraper.sanitize import BOILERPLATE_RE

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)


def _clean(html: str) -> str:
    if not html:
        return html
    soup = BeautifulSoup(html, "lxml")
    changed = False
    for tag in soup.find_all(["p", "div", "section", "aside", "h2", "h3"]):
        text = tag.get_text(" ", strip=True)
        if len(text) < 500 and BOILERPLATE_RE.search(text):
            tag.decompose()
            changed = True
    if not changed:
        return html
    body = soup.find("body")
    return "".join(str(c) for c in body.children) if body else str(soup)


def main() -> None:
    from supabase import create_client

    sb = create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_ROLE_KEY"],
    )

    page_size = 200
    offset = 0
    total_updated = 0
    total_rows = 0

    while True:
        rows = (
            sb.table("articles")
            .select("id,content_original,content_tr")
            .range(offset, offset + page_size - 1)
            .execute()
        )
        batch = rows.data or []
        if not batch:
            break
        total_rows += len(batch)

        for row in batch:
            new_orig = _clean(row.get("content_original") or "")
            new_tr = _clean(row.get("content_tr") or "")

            if new_orig != (row.get("content_original") or "") or new_tr != (row.get("content_tr") or ""):
                sb.table("articles").update({
                    "content_original": new_orig,
                    "content_tr": new_tr,
                }).eq("id", row["id"]).execute()
                total_updated += 1
                logger.info("Cleaned boilerplate from article %s", row["id"])

        offset += page_size
        if len(batch) < page_size:
            break

    logger.info("Done: %d/%d articles cleaned", total_updated, total_rows)


if __name__ == "__main__":
    main()
