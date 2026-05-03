"""Re-run hashtag assignment for articles that fall back to hashtag category display.

Targets articles where nav_tab_slug='diger' and sector_slugs='{}', since these
are the ones shown with a hashtag as their category label on the frontend.
Re-running assign_hashtags applies the updated prompt (topic tags first, geo last).

Usage (from the scraper/ directory):
  python backfill_reorder_hashtags.py
  python backfill_reorder_hashtags.py --limit 50
  python backfill_reorder_hashtags.py --dry-run
  python backfill_reorder_hashtags.py --all   # re-run for ALL articles
"""
import argparse
import logging
import os
import time

from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

_DELAY = 0.6

# Geographic hashtags that are not useful as category labels (mirrors labels.ts)
GEO_TAGS = {
    "Angola","Benin","Botsvana","Burkina Faso","Burundi","Cezayir","Cibuti","Çad",
    "DR Kongo","Ekvator Ginesi","Eritre","Esvatini","Etiyopya","Fas","Fildişi Sahili",
    "Gabon","Gambiya","Gana","Gine","Gine-Bissau","Güney Afrika Cumhuriyeti",
    "Güney Sudan","Kamerun","Kenya","Komorlar","Kongo Cumhuriyeti","Lesoto",
    "Liberya","Libya","Madagaskar","Malavi","Mali","Mauritius","Mısır","Moritanya",
    "Mozambik","Namibya","Nijer","Nijerya","Orta Afrika Cumhuriyeti","Ruanda",
    "Sao Tome ve Principe","Senegal","Seyşeller","Sierra Leone","Somali","Sudan",
    "Tanzanya","Togo","Tunus","Uganda","Yeşil Burun Adaları","Zambiya","Zimbabve",
    "Sahra Altı Afrika","Sahel","Mağrip","Doğu Afrika","Batı Afrika","Kuzey Afrika",
    "Güney Afrika","Orta Afrika","Boynuz Afrika","Frankofon Afrika","Anglofon Afrika",
    "Lusofon Afrika","Frankofon Batı Afrika","Pan-Afrika","MENA","EMEA","Afrika",
    "İstanbul","Ankara","İzmir","Bursa","Gaziantep","Mersin","Kayseri","Türkiye",
    "Recep Tayyip Erdoğan","Cumhurbaşkanlığı","Cyril Ramaphosa","Bola Tinubu",
    "Abdülfettah el-Sisi","William Ruto","Macky Sall","Bassirou Diomaye Faye",
    "Alassane Ouattara","Paul Kagame","Aliko Dangote","Patrice Motsepe",
    "Mo Ibrahim","Strive Masiyiwa","Tony Elumelu",
}


def has_topic_hashtag(tags: list) -> bool:
    for tag in tags:
        if tag in GEO_TAGS:
            continue
        if isinstance(tag, str) and tag.startswith("Türkiye-") and tag.endswith(" İK"):
            continue
        return True
    return False


def main() -> None:
    parser = argparse.ArgumentParser(description="Re-run hashtags for articles with geo-only tags")
    parser.add_argument("--limit", type=int, default=0, help="Max articles to process (0 = all)")
    parser.add_argument("--dry-run", action="store_true", help="Preview only, no DB writes")
    parser.add_argument("--all", action="store_true", help="Re-run for ALL articles, not just diger+empty-sector")
    args = parser.parse_args()

    from supabase import create_client
    from scraper.hashtags import assign_hashtags

    sb = create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_ROLE_KEY"],
    )

    if args.all:
        rows = (
            sb.table("articles")
            .select("id,title_original,content_original,hashtags,nav_tab_slug,sector_slugs")
            .not_.is_("title_original", "null")
            .order("published_at", desc=True)
            .execute()
            .data or []
        )
        logger.info("Fetched %d total articles", len(rows))
        to_fix = rows
    else:
        rows = (
            sb.table("articles")
            .select("id,title_original,content_original,hashtags,nav_tab_slug,sector_slugs")
            .eq("nav_tab_slug", "diger")
            .eq("sector_slugs", "{}")
            .not_.is_("title_original", "null")
            .order("published_at", desc=True)
            .execute()
            .data or []
        )
        logger.info("Fetched %d diger+empty-sector articles", len(rows))
        # Only re-run for those with no usable topic hashtag
        to_fix = [r for r in rows if not has_topic_hashtag(r.get("hashtags") or [])]
        logger.info("  Of which %d have no topic hashtag (will be fixed)", len(to_fix))

    if args.limit:
        to_fix = to_fix[:args.limit]

    updated = skipped = errors = 0

    for i, row in enumerate(to_fix, 1):
        article_id = row["id"]
        title = row.get("title_original") or ""
        content = row.get("content_original") or ""

        logger.info("[%d/%d] %s", i, len(to_fix), title[:80])

        try:
            tags = assign_hashtags(title, content)
        except Exception as exc:
            logger.error("  assign_hashtags failed: %s", exc)
            errors += 1
            time.sleep(_DELAY)
            continue

        if not tags:
            logger.warning("  Empty result, skipping")
            skipped += 1
            time.sleep(_DELAY)
            continue

        logger.info("  Tags: %s", tags[:5])

        if args.dry_run:
            updated += 1
            time.sleep(_DELAY)
            continue

        try:
            sb.table("articles").update({"hashtags": tags}).eq("id", article_id).execute()
            updated += 1
        except Exception as exc:
            logger.error("  DB update failed: %s", exc)
            errors += 1

        time.sleep(_DELAY)

    logger.info("Done — updated=%d skipped=%d errors=%d", updated, skipped, errors)


if __name__ == "__main__":
    main()
