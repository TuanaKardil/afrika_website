#!/usr/bin/env python3
"""Re-fetch featured images that were stored from a CMS thumbnail.

Some CMSes link a small rendition in page markup (Joomla K2 links the 290px
"_S" variant). Because the WebP ladder in storage.py never upscales, a thumbnail
source caps every variant the site can serve, and the article hero ends up a
290px image stretched across a 1600px box.

`Source.featured_image_rewrite` in the registry maps such a URL to its full-size
rendition. This script applies that mapping to rows already in the database,
re-uploads at the better resolution, and repoints the row.

The old Storage objects are left behind on purpose: they become unreferenced and
`cleanup_orphan_images.py` removes them under its own backup-before-delete gate.

    python backfill_featured_image_quality.py --source ecofin --dry-run
    python backfill_featured_image_quality.py --source ecofin
"""
import argparse
import logging
import os
import re
from datetime import datetime, timezone

from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--source", help="limit to one source slug")
    ap.add_argument("--dry-run", action="store_true", help="report only, change nothing")
    ap.add_argument("--limit", type=int)
    args = ap.parse_args()

    from supabase import create_client
    from scraper import sources
    from scraper.storage import upload_featured_image

    sb = create_client(os.environ["SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])

    slugs = [args.source] if args.source else [
        s for s in sources.all_slugs() if sources.get(s).featured_image_rewrite
    ]

    total = changed = skipped = failed = 0
    for slug in slugs:
        src = sources.get(slug)
        if src is None or not src.featured_image_rewrite:
            logger.warning("%s: no featured_image_rewrite in the registry, skipping", slug)
            continue
        pattern, replacement = src.featured_image_rewrite

        q = (sb.table("articles")
             .select("id,featured_image_source_url,published_at")
             .eq("source", slug)
             .not_.is_("featured_image_source_url", "null"))
        if args.limit:
            q = q.limit(args.limit)
        rows = q.execute().data or []

        for row in rows:
            total += 1
            old = row["featured_image_source_url"] or ""
            new = re.sub(pattern, replacement, old)
            if new == old:
                skipped += 1
                continue

            if args.dry_run:
                logger.info("[DRY] %s\n      -> %s", old, new)
                changed += 1
                continue

            try:
                published_at = datetime.fromisoformat(
                    str(row["published_at"]).replace("Z", "+00:00"))
            except (ValueError, TypeError):
                published_at = datetime.now(timezone.utc)

            url, srcset = upload_featured_image(
                image_url=new,
                article_id=row["id"],
                source=slug,
                published_at=published_at,
            )
            if not url:
                # Leave the row on its old image rather than blanking it: a
                # missing rendition must not cost us the picture entirely.
                logger.error("upload failed, keeping old image: %s", new)
                failed += 1
                continue

            sb.table("articles").update({
                "featured_image_url": url,
                "image_srcset": srcset,
                "featured_image_source_url": new,
            }).eq("id", row["id"]).execute()
            changed += 1
            logger.info("%d/%d updated %s", changed, len(rows), new.split("/")[-1])

    logger.info("done: %d scanned, %d changed, %d already full-size, %d failed",
                total, changed, skipped, failed)
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
