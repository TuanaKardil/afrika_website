#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

source .env 2>/dev/null || true

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Starting scraper run"

pip3 install -r requirements.txt --quiet

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Running BBC Africa spider"
python3 -m scrapy crawl bbc_africa

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Running The Conversation Africa spider"
python3 -m scrapy crawl conversation_africa

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Retranslating any untranslated articles"
python3 -m scraper.retranslate

echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] Scraper run complete"
