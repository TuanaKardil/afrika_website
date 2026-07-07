"""
Backfill question-format <h2> headings into published articles that lack them.

Roughly half the corpus was translated before the H2 rule was enforced in the
pipeline, so ~289 score-6+ articles have no <h2> and miss the AEO structure
(question-format headings that Google AI Overviews / featured snippets rely on).

For each such article this calls translate.add_h2_headings() — which asks the
model ONLY for headings + positions and splices the <h2> tags in
programmatically, so the body text is preserved exactly — and updates
content_tr. Idempotent: only touches rows whose content_tr has no <h2>.

It deliberately does NOT bump updated_at. Adding structural headings does not
change the article's information, and mass-freshening 289 dateModified values at
once is exactly the inconsistent date signal CLAUDE.md rule 17 warns against.

Run from the scraper/ directory:
    python backfill_add_h2.py [--dry-run] [--limit N] [--workers 3]
"""

import argparse
import logging
import os
import re
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed

from dotenv import load_dotenv

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from scraper.storage import _get_supabase  # noqa: E402
from scraper.translate import add_h2_headings  # noqa: E402

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
logger = logging.getLogger(__name__)

_H2_RE = re.compile(r"<h2[ >]", re.I)


def _process_one(row: dict, dry_run: bool) -> tuple[str, str]:
    """Returns (article_id, status)."""
    article_id = row["id"]
    title = row.get("title_tr") or ""
    content = row.get("content_tr") or ""
    if _H2_RE.search(content):
        return article_id, "skip:already-has-h2"

    try:
        fixed = add_h2_headings(title, content)
    except Exception as exc:
        return article_id, f"error:remediate:{exc}"

    if not fixed or not _H2_RE.search(fixed):
        return article_id, "fail:no-h2-produced"

    if dry_run:
        return article_id, f"ok(dry):{len(_H2_RE.findall(fixed))}h2"

    try:
        # content_tr only — updated_at intentionally untouched (rule 17).
        _get_supabase().table("articles").update(
            {"content_tr": fixed}
        ).eq("id", article_id).execute()
    except Exception as exc:
        return article_id, f"error:db:{exc}"

    return article_id, f"ok:{len(_H2_RE.findall(fixed))}h2"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--limit", type=int, default=None)
    ap.add_argument("--workers", type=int, default=3)
    args = ap.parse_args()

    sb = _get_supabase()
    q = (
        sb.table("articles")
        .select("id,title_tr,content_tr")
        .eq("is_suppressed", False)
        .not_.is_("title_tr", "null")
        .not_.is_("content_tr", "null")
        .gte("score", 6)
        .order("published_at", desc=True)
    )
    if args.limit:
        q = q.limit(args.limit)
    rows = [r for r in (q.execute().data or []) if not _H2_RE.search(r.get("content_tr") or "")]
    logger.info("%d articles missing <h2>%s", len(rows), " (dry run)" if args.dry_run else "")

    ok = fail = err = 0
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futs = {pool.submit(_process_one, r, args.dry_run): r for r in rows}
        for i, fut in enumerate(as_completed(futs), 1):
            aid, status = fut.result()
            if status.startswith("ok"):
                ok += 1
            elif status.startswith("fail"):
                fail += 1
                logger.warning("[%d/%d] %s -> %s", i, len(rows), aid, status)
            elif status.startswith("error"):
                err += 1
                logger.warning("[%d/%d] %s -> %s", i, len(rows), aid, status)
            if i % 25 == 0:
                logger.info("progress %d/%d (ok=%d fail=%d err=%d)", i, len(rows), ok, fail, err)

    logger.info("DONE ok=%d fail=%d err=%d total=%d", ok, fail, err, len(rows))
    return 0 if err == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
