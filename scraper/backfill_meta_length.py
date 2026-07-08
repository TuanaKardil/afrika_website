"""
Backfill: tighten meta_description_tr length and cap over-long title_tr.

- Regenerates meta_description_tr for score-6+ articles whose current value is
  outside the safety band (< 125 or > 170 chars), or NULL. Short descriptions
  read as thin in Google results; the tightened generate_meta_description()
  targets 135-160.
- Caps any title_tr longer than 120 chars at a word boundary (the code path now
  guarantees this for new articles; this fixes the few legacy ones).

Neither change bumps updated_at (rule 17): the meta description is not shown on
the page, and a title trim removes only trailing filler, not information.

Run from the scraper/ directory:
    python backfill_meta_length.py [--dry-run] [--limit N] [--workers 3]
"""

import argparse
import logging
import os
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed

from dotenv import load_dotenv

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from scraper.storage import _get_supabase  # noqa: E402
from scraper.translate import generate_meta_description, _cap_title, _MD_SAFETY  # noqa: E402

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
logger = logging.getLogger(__name__)


def _needs_md(md: str | None) -> bool:
    return md is None or not (_MD_SAFETY[0] <= len(md) <= _MD_SAFETY[1])


def _process_one(row: dict, dry_run: bool) -> tuple[str, str]:
    article_id = row["id"]
    updates: dict[str, str] = {}

    title = row.get("title_tr") or ""
    capped = _cap_title(title)
    if capped != title:
        updates["title_tr"] = capped

    if _needs_md(row.get("meta_description_tr")):
        content = row.get("content_tr") or ""
        if content:
            new_md = generate_meta_description(title, content)
            if new_md:
                updates["meta_description_tr"] = new_md

    if not updates:
        return article_id, "skip:ok"
    if dry_run:
        return article_id, "dry:" + ",".join(updates.keys())

    try:
        _get_supabase().table("articles").update(updates).eq("id", article_id).execute()
    except Exception as exc:
        return article_id, f"error:db:{exc}"
    return article_id, "ok:" + ",".join(updates.keys())


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--limit", type=int, default=None)
    ap.add_argument("--workers", type=int, default=3)
    args = ap.parse_args()

    sb = _get_supabase()
    q = (
        sb.table("articles")
        .select("id,title_tr,content_tr,meta_description_tr")
        .eq("is_suppressed", False)
        .not_.is_("title_tr", "null")
        .not_.is_("content_tr", "null")
        .gte("score", 6)
        .order("published_at", desc=True)
    )
    if args.limit:
        q = q.limit(args.limit)
    all_rows = q.execute().data or []
    rows = [r for r in all_rows if _needs_md(r.get("meta_description_tr")) or _cap_title(r.get("title_tr") or "") != (r.get("title_tr") or "")]
    logger.info("%d articles need meta/title fix%s", len(rows), " (dry run)" if args.dry_run else "")

    ok = err = 0
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futs = {pool.submit(_process_one, r, args.dry_run): r for r in rows}
        for i, fut in enumerate(as_completed(futs), 1):
            aid, status = fut.result()
            if status.startswith(("ok", "dry", "skip")):
                ok += 1
            else:
                err += 1
                logger.warning("[%d/%d] %s -> %s", i, len(rows), aid, status)
            if i % 25 == 0:
                logger.info("progress %d/%d (ok=%d err=%d)", i, len(rows), ok, err)

    logger.info("DONE ok=%d err=%d total=%d", ok, err, len(rows))
    return 0 if err == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
