"""
Re-translate published articles whose Turkish body was cut off mid-sentence.

Cause: openrouter.chat() ignored the provider's finish_reason, so when a
translation hit the output-token cap the partial answer was accepted as a
complete one. _safe_parse_json() cannot recover content_tr from a response that
lacks its closing quote-brace, and the leftover fragment was published as the
article. 31 articles across the corpus ended mid-sentence, several mid-word
("...ve siyasi istikr"). The pipeline now retries at a higher token budget and
QualityCheckPipeline refuses any body that does not end on sentence-final
punctuation; this script repairs the rows that were written before both landed.

For each affected article it re-runs the full translation from
content_original, then accepts the result ONLY if the new body ends properly
and is at least as long as what is already stored. A failed repair leaves the
row untouched so a later run can retry it.

Articles whose ORIGINAL is itself a truncated teaser (ends in "[...]") cannot be
repaired by re-translating and are reported as skip:source-truncated.

It deliberately does NOT bump updated_at (CLAUDE.md rule 17): mass-freshening
dateModified is exactly the inconsistent date signal that rule warns against.

Run from the scraper/ directory:
    python backfill_truncated.py [--dry-run] [--limit N] [--workers 3]
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
from scraper.translate import translate_article  # noqa: E402

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
logger = logging.getLogger(__name__)

# Kept in sync with pipelines.QualityCheckPipeline.
_SENTENCE_END_CHARS = ('.', '!', '?', '"', '”', '’', "'", ')', '»', '…')
_SOURCE_LINK_TAIL_RE = re.compile(r'\s*Kaynak:\s*\S[^\n]*$', re.UNICODE)
_TEASER_RE = re.compile(r'\[(?:…|\.\.\.)\]')


def _plain(html: str) -> str:
    return re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', html or '')).strip()


def is_truncated(html: str) -> bool:
    body = _SOURCE_LINK_TAIL_RE.sub('', _plain(html)).rstrip()
    return bool(body) and not body.endswith(_SENTENCE_END_CHARS)


def _process_one(row: dict, dry_run: bool) -> tuple[str, str]:
    article_id = row["id"]
    current = row.get("content_tr") or ""
    original = row.get("content_original") or ""

    if not is_truncated(current):
        return article_id, "skip:not-truncated"
    # If the ENGLISH original is itself cut off, a "[...]" teaser or a body
    # that ends on "In a statement, Li said:" because the rest was JS-rendered,
    # re-translating can only reproduce the same stump. Skip instead of burning
    # an API call on every run.
    if _TEASER_RE.search(original) or is_truncated(original):
        return article_id, "skip:source-truncated"
    if len(original.split()) < 60:
        return article_id, "skip:original-too-thin"

    try:
        out = translate_article(
            row.get("title_original") or "",
            row.get("excerpt_original") or "",
            original,
            row.get("source_url") or "",
            row.get("source") or "",
        )
    except Exception as exc:
        return article_id, f"error:translate:{exc}"

    _, new_excerpt, new_body = out if out else (None, None, "")
    new_body = new_body or ""
    if not new_body:
        return article_id, "fail:no-translation"
    if is_truncated(new_body):
        return article_id, "fail:still-truncated"
    if len(_plain(new_body).split()) < len(_plain(current).split()):
        return article_id, "fail:shorter-than-current"

    if dry_run:
        return article_id, f"ok(dry):{len(_plain(current).split())}->{len(_plain(new_body).split())}w"

    update = {"content_tr": new_body}
    if new_excerpt:
        update["excerpt_tr"] = new_excerpt
    try:
        # content/excerpt only. updated_at intentionally untouched (rule 17).
        _get_supabase().table("articles").update(update).eq("id", article_id).execute()
    except Exception as exc:
        return article_id, f"error:db:{exc}"

    return article_id, f"ok:{len(_plain(current).split())}->{len(_plain(new_body).split())}w"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--limit", type=int, default=None)
    ap.add_argument("--workers", type=int, default=3)
    args = ap.parse_args()

    sb = _get_supabase()
    rows = (
        sb.table("articles")
        .select("id,slug,title_original,excerpt_original,content_original,content_tr,source,source_url")
        .not_.is_("content_tr", "null")
        .execute()
    ).data or []

    targets = [r for r in rows if is_truncated(r.get("content_tr") or "")]
    if args.limit:
        targets = targets[: args.limit]
    logger.info("scanned %d articles, %d truncated", len(rows), len(targets))
    if not targets:
        return 0

    stats: dict[str, int] = {}
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = {pool.submit(_process_one, r, args.dry_run): r for r in targets}
        for fut in as_completed(futures):
            row = futures[fut]
            _, status = fut.result()
            key = status.split(":")[0]
            stats[key] = stats.get(key, 0) + 1
            logger.info("%-28s %s", status, row.get("slug", "")[:60])

    logger.info("done: %s", stats)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
