"""Remove previously backfilled Supabase <figure> blocks from all articles.

Strips <figure><img src="...supabase.../article-images/..." alt="" /></figure>
blocks that were injected by backfill_inline_images.py (and StoragePipeline).
After running this, re-run backfill_inline_images.py with the corrected extractor.

Usage (from the scraper/ directory):
  python clean_injected_figures.py
  python clean_injected_figures.py --dry-run   # preview only, no DB writes
"""
import argparse
import logging
import os
import re

from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

# Matches figures injected by the pipeline/backfill with empty alt attributes
_INJECTED_FIGURE_RE = re.compile(
    r'<figure>\s*<img\s+src="[^"]+/storage/v1/object/public/article-images/[^"]*"\s+alt=""\s*/>\s*</figure>\s*',
    re.IGNORECASE,
)


def _strip_figures(html: str) -> tuple[str, int]:
    """Remove injected figure blocks. Returns (cleaned_html, count_removed)."""
    matches = _INJECTED_FIGURE_RE.findall(html)
    cleaned = _INJECTED_FIGURE_RE.sub("", html).rstrip()
    return cleaned, len(matches)


def main() -> None:
    parser = argparse.ArgumentParser(description="Strip injected Supabase figures from articles")
    parser.add_argument("--dry-run", action="store_true", help="Preview changes, do not write to DB")
    args = parser.parse_args()

    from supabase import create_client

    sb = create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_ROLE_KEY"],
    )

    rows = sb.table("articles").select("id,content_original,content_tr").execute().data or []
    logger.info("Loaded %d articles", len(rows))

    updated = 0
    skipped = 0

    for row in rows:
        article_id = row["id"]
        orig = row.get("content_original") or ""
        tr = row.get("content_tr") or ""

        new_orig, n_orig = _strip_figures(orig)
        new_tr, n_tr = _strip_figures(tr)

        if n_orig == 0 and n_tr == 0:
            skipped += 1
            continue

        logger.info("Article %s: removed %d figure(s) from original, %d from tr",
                    article_id, n_orig, n_tr)

        if args.dry_run:
            updated += 1
            continue

        try:
            sb.table("articles").update({
                "content_original": new_orig,
                "content_tr": new_tr,
            }).eq("id", article_id).execute()
            updated += 1
        except Exception as exc:
            logger.error("DB update failed for %s: %s", article_id, exc)

    logger.info(
        "Done. updated=%d  skipped=%d  dry_run=%s",
        updated, skipped, args.dry_run,
    )


if __name__ == "__main__":
    main()
