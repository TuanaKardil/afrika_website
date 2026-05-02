"""Full reprocessing backfill for all existing articles.

Runs in order:
  1. retranslate  -- translate articles still showing original text
  2. rehash       -- re-classify + re-assign hashtags for all articles
  3. postprocess  -- em-dash cleanup and Turkish apostrophe fixes

Usage (from the scraper/ directory):
  python reprocess_all.py
  python reprocess_all.py --skip-translate   # skip costly retranslation step
"""
import argparse
import logging
import sys

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)


def main() -> None:
    parser = argparse.ArgumentParser(description="Reprocess all articles in Supabase")
    parser.add_argument(
        "--skip-translate",
        action="store_true",
        help="Skip the retranslation step (saves API cost when translations are already correct)",
    )
    args = parser.parse_args()

    # Step 1: Retranslate articles that are still showing original text
    if not args.skip_translate:
        logger.info("=== Step 1/3: Retranslate untranslated articles ===")
        from scraper.retranslate import main as retranslate_main
        retranslate_main()
    else:
        logger.info("=== Step 1/3: Retranslation skipped ===")

    # Step 2: Re-run classification + hashtags for every article
    logger.info("=== Step 2/3: Reclassify + rehash all articles ===")
    import sys as _sys
    _saved = _sys.argv[:]
    _sys.argv = [_sys.argv[0], "--force-all"]
    from scraper.rehash import main as rehash_main
    rehash_main()
    _sys.argv = _saved

    # Step 3: Post-process translations (em-dash cleanup, Turkish apostrophes)
    logger.info("=== Step 3/3: Post-process Turkish text ===")
    from scraper.postprocess_db import main as postprocess_main
    postprocess_main()

    logger.info("=== reprocess_all complete ===")


if __name__ == "__main__":
    main()
