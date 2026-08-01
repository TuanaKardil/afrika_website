#!/usr/bin/env python3
"""Append the mandatory source citation to articles that are missing it.

Every article must end with <p class="source-link"> (CLAUDE.md operational
rules). ContentCleanPipeline was silently removing it on every article, because
it looks exactly like the "recommended article" boilerplate that step is asked
to strip. That is fixed in clean_content.py; this repairs what was already
stored.

The citation is built from the registry (label + homepage), so this costs no AI
calls and produces exactly what translate.py would have. Articles whose source
is not in the registry are skipped rather than guessed at.

Does not touch updated_at: that field means an editor changed the visible
content, and restoring a citation the pipeline should never have dropped is a
repair, not an editorial update (CLAUDE.md rule 17).

    python backfill_source_link.py --dry-run
    python backfill_source_link.py
"""
import argparse
import logging
import os

from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

CITATION = ('<p class="source-link"><small>Kaynak: '
            '<a href="{homepage}" target="_blank" rel="noopener">{label}</a></small></p>')


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--limit", type=int)
    ap.add_argument("--source", help="restrict to one source slug")
    args = ap.parse_args()

    from supabase import create_client
    from scraper import sources

    sb = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])

    rows, start, page = [], 0, 500
    while True:
        q = (sb.table("articles").select("id,slug,source,content_tr")
             .not_.is_("content_tr", "null")
             .range(start, start + page - 1))
        if args.source:
            q = q.eq("source", args.source)
        batch = q.execute().data or []
        if not batch:
            break
        rows.extend(batch)
        start += page

    todo = [r for r in rows if "source-link" not in (r["content_tr"] or "")]
    if args.limit:
        todo = todo[: args.limit]
    logger.info("%d articles scanned, %d missing the citation", len(rows), len(todo))

    fixed = skipped = 0
    for r in todo:
        src = sources.get(r["source"])
        if src is None:
            logger.warning("unknown source %r, skipping %s", r["source"], r["slug"])
            skipped += 1
            continue

        citation = CITATION.format(homepage=src.homepage, label=src.label)
        new_body = (r["content_tr"] or "").rstrip() + "\n" + citation

        if args.dry_run:
            fixed += 1
            continue

        sb.table("articles").update({"content_tr": new_body}).eq("id", r["id"]).execute()
        fixed += 1
        if fixed % 100 == 0:
            logger.info("  %d/%d", fixed, len(todo))

    logger.info("done: %d citations added, %d skipped%s",
                fixed, skipped, "  (dry run, nothing written)" if args.dry_run else "")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
