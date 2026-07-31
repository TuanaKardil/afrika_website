#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

source .env 2>/dev/null || true

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Starting scraper run"

pip3 install -r requirements.txt --quiet

# Spider list comes from scraper/scraper/sources.py (enabled sources only), so
# adding a source never means editing this script. -P 4 matches max-parallel in
# .github/workflows/scrape.yml so local and CI behave the same.
SPIDERS=$(python3 -m scraper.sources)
echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Running news spiders in parallel:"
echo "$SPIDERS" | tr '\n' ' '; echo
echo "$SPIDERS" | xargs -P 4 -I{} python3 -m scrapy crawl {}
echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] News spiders finished"

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Retranslating any untranslated articles"
python3 -m scraper.retranslate

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Backfilling missing hashtags"
python3 backfill_hashtags.py

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Running tender spiders"
SCRAPY_SETTINGS_MODULE=scraper.tender_settings python3 -m scrapy crawl worldbank_tenders &
SCRAPY_SETTINGS_MODULE=scraper.tender_settings python3 -m scrapy crawl undp_tenders &
SCRAPY_SETTINGS_MODULE=scraper.tender_settings python3 -m scrapy crawl ungm_tenders &
SCRAPY_SETTINGS_MODULE=scraper.tender_settings python3 -m scrapy crawl african_union_tenders &
SCRAPY_SETTINGS_MODULE=scraper.tender_settings python3 -m scrapy crawl burkina_tenders &
SCRAPY_SETTINGS_MODULE=scraper.tender_settings python3 -m scrapy crawl ghana_tenders &
wait
echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Tender spiders finished"

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Scraper run complete"
