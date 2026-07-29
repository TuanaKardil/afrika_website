"""
Re-fetch content_original for articles stored with a stub body.

CNBC Africa's real body extraction landed on 2026-06-26. Articles scraped before
that fell back to the og:description teaser, so content_original held ~55 words
ending in "[...]" while the live page carried 180-420 words. Their Turkish
translations therefore read as if cut off, and no amount of re-translating could
fix them: the English we stored was the stump, not the article.

A second, narrower gap: the extractor collected <p> only, so a story whose
substance sat in a bulleted list after "In a statement, Li said:" stored that
lead-in as its final sentence. The spider now also collects <li> and
<blockquote>, and this script replays that improved extraction over old rows.

For each candidate it re-downloads the source URL, runs the spider's own
_extract_body(), and stores the result only if it is substantially longer than
what is on record. content_hash is refreshed alongside so the next scrape sees
the article as unchanged instead of re-updating it.

Follow this with backfill_truncated.py to re-translate the repaired originals.

Run from the scraper/ directory:
    python backfill_refetch_body.py [--dry-run] [--limit N] [--workers 3]
"""

import argparse
import logging
import os
import re
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed

import requests
from dotenv import load_dotenv
from parsel import Selector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from scraper.storage import _get_supabase  # noqa: E402
from scraper.spiders.cnbc_africa import _extract_body  # noqa: E402
from scraper.translate import translate_article, finalize_content_tr  # noqa: E402

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
logger = logging.getLogger(__name__)

_UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/126.0 Safari/537.36"
)
_TEASER_RE = re.compile(r'\[(?:…|\.\.\.)\]')
_SENTENCE_END_CHARS = ('.', '!', '?', '"', '”', '’', "'", ')', '»', '…')
_SOURCE_LINK_TAIL_RE = re.compile(r'\s*Kaynak:\s*\S[^\n]*$', re.UNICODE)

# Only re-fetch rows that look damaged. A healthy original is left alone.
_STUB_MAX_WORDS = 120


def _plain(html: str) -> str:
    return re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', html or '')).strip()


def is_truncated(html: str) -> bool:
    body = _SOURCE_LINK_TAIL_RE.sub('', _plain(html)).rstrip()
    return bool(body) and not body.endswith(_SENTENCE_END_CHARS)


def _looks_damaged(original: str, translated: str) -> bool:
    plain = _plain(original)
    if not plain:
        return True
    if _TEASER_RE.search(plain):
        return True
    if len(plain.split()) <= _STUB_MAX_WORDS:
        return True
    if not plain.endswith(_SENTENCE_END_CHARS):
        return True
    body = _SOURCE_LINK_TAIL_RE.sub('', _plain(translated)).rstrip()
    return bool(body) and not body.endswith(_SENTENCE_END_CHARS)


def _process_one(row: dict, dry_run: bool, retranslate: bool) -> tuple[str, str]:
    article_id = row["id"]
    stored = row.get("content_original") or ""
    url = row.get("source_url") or ""
    if not url:
        return article_id, "skip:no-url"

    try:
        resp = requests.get(url, headers={"User-Agent": _UA}, timeout=30)
        resp.raise_for_status()
    except Exception as exc:
        return article_id, f"error:fetch:{type(exc).__name__}"

    try:
        fresh = _extract_body(Selector(text=resp.text))
    except Exception as exc:
        return article_id, f"error:extract:{exc}"

    if not fresh:
        return article_id, "fail:no-body-on-page"

    old_words = len(_plain(stored).split())
    new_words = len(_plain(fresh).split())
    # Require a real gain: re-fetching must not quietly shrink an article.
    if new_words < max(old_words * 1.3, old_words + 40):
        return article_id, f"skip:no-gain({old_words}->{new_words}w)"

    if dry_run:
        return article_id, f"ok(dry):{old_words}->{new_words}w"

    import hashlib
    update = {
        "content_original": fresh,
        "content_hash": hashlib.md5(fresh.encode("utf-8")).hexdigest(),
    }

    # The stored Turkish text is a faithful translation of the STUB, so it is
    # grammatically complete and no truncation check would ever flag it. It has
    # to be regenerated here or the repaired English would never reach readers.
    if retranslate:
        try:
            out = translate_article(
                row.get("title_original") or "",
                row.get("excerpt_original") or "",
                fresh,
                url,
                row.get("source") or "",
            )
        except Exception as exc:
            return article_id, f"error:translate:{type(exc).__name__}"
        if not out:
            return article_id, "fail:translation-failed"
        new_title, new_excerpt, new_body = out
        # Same quality gate the live pipeline applies (clean + H2 + truncation).
        # Writing content_tr straight to the DB once published 81 articles with
        # no <h2> at all, because it skipped ContentCleanPipeline and
        # QualityCheckPipeline entirely.
        new_body, reason = finalize_content_tr(new_title or "", new_body or "")
        if reason:
            return article_id, f"fail:quality-{reason}"
        update["content_tr"] = new_body
        if new_excerpt:
            update["excerpt_tr"] = new_excerpt
        if new_title:
            # Safe now that slug is frozen (rule 22): retitling cannot move a URL.
            update["title_tr"] = new_title

    try:
        _get_supabase().table("articles").update(update).eq("id", article_id).execute()
    except Exception as exc:
        return article_id, f"error:db:{exc}"

    return article_id, f"ok:{old_words}->{new_words}w"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--limit", type=int, default=None)
    ap.add_argument("--workers", type=int, default=3)
    ap.add_argument("--retranslate", action="store_true",
                    help="regenerate the Turkish text from the repaired original")
    ap.add_argument("--source", default="cnbc_africa",
                    help="restrict to one source key, or 'all'")
    args = ap.parse_args()

    sb = _get_supabase()
    q = sb.table("articles").select(
        "id,slug,source,source_url,title_original,excerpt_original,"
        "content_original,content_tr"
    )
    if args.source != "all":
        q = q.eq("source", args.source)
    rows = (q.execute()).data or []

    targets = [
        r for r in rows
        if _looks_damaged(r.get("content_original") or "", r.get("content_tr") or "")
    ]
    if args.limit:
        targets = targets[: args.limit]
    logger.info("scanned %d %s articles, %d look damaged", len(rows), args.source, len(targets))
    if not targets:
        return 0

    stats: dict[str, int] = {}
    with ThreadPoolExecutor(max_workers=args.workers) as pool:
        futures = {pool.submit(_process_one, r, args.dry_run, args.retranslate): r for r in targets}
        for fut in as_completed(futures):
            row = futures[fut]
            _, status = fut.result()
            stats[status.split(":")[0]] = stats.get(status.split(":")[0], 0) + 1
            logger.info("%-26s %s", status, row.get("slug", "")[:58])

    logger.info("done: %s", stats)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
