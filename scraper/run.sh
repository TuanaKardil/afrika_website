#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

source .env 2>/dev/null || true

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Starting scraper run"

pip3 install -r requirements.txt --quiet

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Running 5 news spiders in parallel"
python3 -m scrapy crawl conversation_africa &
python3 -m scrapy crawl africa_report &
python3 -m scrapy crawl cnbc_africa &
python3 -m scrapy crawl aa_africa &
python3 -m scrapy crawl business_insider &
wait
echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] News spiders finished"

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Retranslating any untranslated articles"
python3 -m scraper.retranslate

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Running tender spiders"
SCRAPY_SETTINGS_MODULE=scraper.tender_settings python3 -m scrapy crawl worldbank_tenders &
SCRAPY_SETTINGS_MODULE=scraper.tender_settings python3 -m scrapy crawl undp_tenders &
SCRAPY_SETTINGS_MODULE=scraper.tender_settings python3 -m scrapy crawl ungm_tenders &
SCRAPY_SETTINGS_MODULE=scraper.tender_settings python3 -m scrapy crawl african_union_tenders &
SCRAPY_SETTINGS_MODULE=scraper.tender_settings python3 -m scrapy crawl dgmarket_tenders &
SCRAPY_SETTINGS_MODULE=scraper.tender_settings python3 -m scrapy crawl mali_tenders &
SCRAPY_SETTINGS_MODULE=scraper.tender_settings python3 -m scrapy crawl burkina_tenders &
SCRAPY_SETTINGS_MODULE=scraper.tender_settings python3 -m scrapy crawl liberia_tenders &
SCRAPY_SETTINGS_MODULE=scraper.tender_settings python3 -m scrapy crawl ghana_tenders &
wait
echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Tender spiders finished"

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Scraper run complete"
