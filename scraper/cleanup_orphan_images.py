#!/usr/bin/env python3
"""
Cleanup orphan images in the Supabase `article-images` bucket.

An image is an ORPHAN when no article or blog post references it. Orphans are
overwhelmingly leftovers from deleted articles (the score-5 purge, dedup
replacements) and inline images that never made it into the stored body.

SAFETY MODEL (double gate + backup-before-delete):
  A file is deleted ONLY if BOTH are true:
    1. its exact object path is NOT in the regex-extracted reference set, AND
    2. its exact object path does NOT appear as a raw substring anywhere in
       any text column (belt-and-suspenders; catches any regex miss).
  And deletion NEVER happens unless the file was already downloaded to the
  local backup dir with a byte-size match.

  The `articles` / `blog_posts` tables are never touched -- only storage files
  are removed. So updated_at, dates, alt text, srcset, nothing changes.

Reference columns scanned (every place a bucket URL can live):
    articles:   featured_image_url, image_srcset, content_tr, content_original
    blog_posts: featured_image_url, content, excerpt

Phases (run in order; nothing destructive happens by default):
    python cleanup_orphan_images.py --scan     # default: report + write manifest, no download, no delete
    python cleanup_orphan_images.py --backup    # download all orphans to the backup dir (resumable)
    python cleanup_orphan_images.py --delete    # delete orphans that are verified present in the backup

Options:
    --backup-dir PATH   (default: ~/dev/afrika-orphan-backup-2026-07-09)
    --batch N           delete batch size (default 100)
    --limit N           process at most N orphans (for a cautious first pass)
    --expected N        expected orphan count sanity gate (abort if wildly off)

Run from the scraper/ directory. Do NOT run during the 07:00 / 13:00 TST
scrape window (a just-uploaded image whose DB row is still pending could look
like an orphan). Run when the scraper is idle.
"""

import argparse
import csv
import logging
import os
import re
import sys
import time

import requests
from dotenv import load_dotenv

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from scraper.storage import _BUCKET, _get_supabase, _public_url  # noqa: E402

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
logger = logging.getLogger(__name__)

_MARKER = f"/storage/v1/object/public/{_BUCKET}/"
# Capture the object path right after the bucket marker, up to the first
# delimiter (quote, whitespace -> stops before the srcset " 400w" suffix,
# backslash or closing paren).
_URL_RE = re.compile(re.escape(_MARKER) + r"([^\"'\s\\)]+)")

_DEFAULT_BACKUP = os.path.expanduser("~/dev/afrika-orphan-backup-2026-07-09")
_REQUEST_TIMEOUT = 30


# --------------------------------------------------------------------------- #
# References
# --------------------------------------------------------------------------- #
def _fetch_reference_text(sb) -> list[str]:
    """Return every text value from every column that can hold a bucket URL."""
    blobs: list[str] = []
    specs = [
        ("articles", "featured_image_url,image_srcset,content_tr,content_original"),
        ("blog_posts", "featured_image_url,content,excerpt"),
    ]
    for table, cols in specs:
        page, size = 0, 1000
        while True:
            try:
                rows = (
                    sb.table(table)
                    .select(cols)
                    .range(page * size, (page + 1) * size - 1)
                    .execute()
                    .data
                )
            except Exception as exc:
                logger.error("Failed to read %s: %s", table, exc)
                raise
            if not rows:
                break
            for r in rows:
                for v in r.values():
                    if v:
                        blobs.append(v)
            if len(rows) < size:
                break
            page += 1
    return blobs


def _build_references(sb) -> tuple[set[str], str]:
    """(regex-extracted referenced paths, one big raw blob for substring gate)."""
    blobs = _fetch_reference_text(sb)
    big = "\n".join(blobs)
    referenced = set(_URL_RE.findall(big))
    logger.info(
        "References: %d text values, %d distinct object paths referenced",
        len(blobs),
        len(referenced),
    )
    return referenced, big


# --------------------------------------------------------------------------- #
# Storage enumeration (recursive walk of the bucket)
# --------------------------------------------------------------------------- #
def _list_folder(sb, prefix: str) -> list[dict]:
    items, offset, page = [], 0, 100
    while True:
        batch = sb.storage.from_(_BUCKET).list(
            prefix, {"limit": page, "offset": offset}
        )
        if not batch:
            break
        items.extend(batch)
        if len(batch) < page:
            break
        offset += page
    return items


def _walk(sb, prefix: str = "") -> list[tuple[str, int]]:
    """Recursively enumerate (object_path, size_bytes) for the whole bucket."""
    out: list[tuple[str, int]] = []
    for it in _list_folder(sb, prefix):
        name = it.get("name")
        if not name:
            continue
        full = f"{prefix}/{name}" if prefix else name
        # Folders come back with id/metadata None; files carry metadata.size.
        meta = it.get("metadata")
        if it.get("id") is None or meta is None:
            out.extend(_walk(sb, full))
        else:
            out.append((full, int(meta.get("size", 0) or 0)))
    return out


# --------------------------------------------------------------------------- #
# Orphan detection (double gate)
# --------------------------------------------------------------------------- #
def _classify(objects: list[tuple[str, int]], referenced: set[str], big: str):
    orphans, kept_by_substring = [], []
    for name, size in objects:
        if name in referenced:
            continue
        if name in big:
            # Not caught by regex but present as a raw substring -> KEEP (safe).
            kept_by_substring.append(name)
            continue
        orphans.append((name, size))
    return orphans, kept_by_substring


def _manifest_path(backup_dir: str) -> str:
    return os.path.join(backup_dir, "orphan_manifest.csv")


def _write_manifest(backup_dir: str, orphans: list[tuple[str, int]]) -> None:
    os.makedirs(backup_dir, exist_ok=True)
    with open(_manifest_path(backup_dir), "w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["path", "bytes"])
        for name, size in orphans:
            w.writerow([name, size])
    logger.info("Wrote manifest: %s", _manifest_path(backup_dir))


def _read_manifest(backup_dir: str) -> list[tuple[str, int]]:
    path = _manifest_path(backup_dir)
    if not os.path.exists(path):
        logger.error("No manifest at %s -- run --scan first.", path)
        sys.exit(1)
    out = []
    with open(path, newline="") as f:
        for row in csv.DictReader(f):
            out.append((row["path"], int(row["bytes"])))
    return out


def _mb(byte_count: int) -> float:
    return round(byte_count / 1024 / 1024, 1)


# --------------------------------------------------------------------------- #
# Phases
# --------------------------------------------------------------------------- #
def phase_scan(sb, backup_dir: str, expected: int | None):
    logger.info("Building references...")
    referenced, big = _build_references(sb)
    logger.info("Enumerating storage bucket '%s' (recursive)...", _BUCKET)
    objects = _walk(sb)
    logger.info("Storage: %d total objects", len(objects))
    orphans, kept = _classify(objects, referenced, big)
    orphan_bytes = sum(s for _, s in orphans)
    ref_count = len(objects) - len(orphans)
    logger.info("-" * 60)
    logger.info("Referenced (kept):     %d files", ref_count)
    logger.info("Kept via substring:    %d files (regex misses, kept for safety)", len(kept))
    logger.info("ORPHANS (deletable):   %d files, %.1f MB", len(orphans), _mb(orphan_bytes))
    logger.info("-" * 60)
    if kept:
        for n in kept[:10]:
            logger.info("  kept-substring: %s", n)
    if expected is not None and abs(len(orphans) - expected) > max(20, expected * 0.02):
        logger.warning(
            "Orphan count %d differs from expected %d by more than tolerance.",
            len(orphans),
            expected,
        )
    _write_manifest(backup_dir, orphans)
    logger.info("SCAN complete. Nothing downloaded or deleted.")
    return orphans


def phase_backup(sb, backup_dir: str, limit: int | None):
    orphans = _read_manifest(backup_dir)
    if limit:
        orphans = orphans[:limit]
    logger.info("Backing up %d orphans to %s", len(orphans), backup_dir)
    done = skipped = failed = 0
    for i, (name, size) in enumerate(orphans, 1):
        dest = os.path.join(backup_dir, "files", name)
        if os.path.exists(dest) and os.path.getsize(dest) == size:
            skipped += 1
            continue
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        try:
            resp = requests.get(_public_url(name), timeout=_REQUEST_TIMEOUT)
            resp.raise_for_status()
            with open(dest, "wb") as f:
                f.write(resp.content)
            done += 1
        except Exception as exc:
            failed += 1
            logger.warning("Download failed %s: %s", name, exc)
        if i % 200 == 0:
            logger.info("  %d/%d (new=%d skip=%d fail=%d)", i, len(orphans), done, skipped, failed)
    logger.info("BACKUP done: downloaded=%d skipped=%d failed=%d", done, skipped, failed)
    if failed:
        logger.warning("Some downloads failed -- re-run --backup (resumable) before --delete.")


def phase_delete(sb, backup_dir: str, batch: int, limit: int | None):
    orphans = _read_manifest(backup_dir)
    if limit:
        orphans = orphans[:limit]
    # Only delete files verified present in backup with matching size.
    verified, missing = [], 0
    for name, size in orphans:
        dest = os.path.join(backup_dir, "files", name)
        if os.path.exists(dest) and os.path.getsize(dest) == size:
            verified.append(name)
        else:
            missing += 1
    logger.info("Delete candidates: %d verified in backup, %d missing (will NOT delete missing).", len(verified), missing)
    if missing:
        logger.error("Refusing to proceed: %d orphans not backed up. Run --backup first.", missing)
        sys.exit(1)
    if not verified:
        logger.info("Nothing to delete.")
        return
    deleted = 0
    for i in range(0, len(verified), batch):
        chunk = verified[i : i + batch]
        try:
            sb.storage.from_(_BUCKET).remove(chunk)
            deleted += len(chunk)
            logger.info("  deleted %d/%d", deleted, len(verified))
        except Exception as exc:
            logger.error("Delete batch failed (%d..%d): %s", i, i + len(chunk), exc)
            logger.error("Stopping. %d already deleted; safe to re-run.", deleted)
            sys.exit(1)
        time.sleep(0.2)
    logger.info("DELETE done: %d files removed. Backup retained at %s", deleted, backup_dir)


def main() -> int:
    ap = argparse.ArgumentParser(description="Cleanup orphan images (safe, phased).")
    mode = ap.add_mutually_exclusive_group()
    mode.add_argument("--scan", action="store_true", help="report + write manifest (default)")
    mode.add_argument("--backup", action="store_true", help="download orphans to backup dir")
    mode.add_argument("--delete", action="store_true", help="delete backed-up orphans")
    ap.add_argument("--backup-dir", default=_DEFAULT_BACKUP)
    ap.add_argument("--batch", type=int, default=100)
    ap.add_argument("--limit", type=int, default=None)
    ap.add_argument("--expected", type=int, default=None, help="expected orphan count sanity gate")
    args = ap.parse_args()

    sb = _get_supabase()
    if args.backup:
        phase_backup(sb, args.backup_dir, args.limit)
    elif args.delete:
        phase_delete(sb, args.backup_dir, args.batch, args.limit)
    else:
        phase_scan(sb, args.backup_dir, args.expected)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
