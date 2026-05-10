"""Regenerate slugs for all articles using title_tr (Turkish) instead of title_original.

Run: python3 backfill_slugs.py
"""
import logging
import os
import re
import uuid

from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

_TR_CHARS = str.maketrans("çşığöüÇŞİĞÖÜ", "csigoucsigou")


def _make_slug(title: str, used: set[str]) -> str:
    base = title.translate(_TR_CHARS).lower()
    base = re.sub(r"[^\w\s-]", "", base)
    base = re.sub(r"[\s_]+", "-", base).strip("-")
    base = base[:80]
    slug = base
    if slug in used:
        slug = f"{base}-{uuid.uuid4().hex[:6]}"
    return slug


def main() -> None:
    from supabase import create_client

    sb = create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_ROLE_KEY"],
    )

    rows = (
        sb.table("articles")
        .select("id,slug,title_original,title_tr")
        .order("published_at", desc=True)
        .execute()
    )
    articles = rows.data or []
    logger.info("Found %d articles to reslug", len(articles))

    used_slugs: set[str] = set()
    updated = 0
    skipped = 0

    for row in articles:
        title_tr = row.get("title_tr") or ""
        title_original = row.get("title_original") or ""
        source_title = title_tr if title_tr else title_original

        new_slug = _make_slug(source_title, used_slugs)
        used_slugs.add(new_slug)

        old_slug = row.get("slug", "")
        if new_slug == old_slug:
            skipped += 1
            continue

        try:
            sb.table("articles").update({"slug": new_slug}).eq("id", row["id"]).execute()
            updated += 1
            logger.info("[%d] %s → %s", updated, old_slug[:50], new_slug[:50])
        except Exception as exc:
            logger.error("Failed to update slug for %s: %s", row["id"], exc)

    logger.info("Done: %d updated, %d already correct", updated, skipped)


if __name__ == "__main__":
    main()
