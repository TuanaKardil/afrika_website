#!/usr/bin/env python3
"""Report card for a spider's raw output, before any pipeline runs.

Usage:
    cd scraper
    python3 -m scrapy crawl <spider> -s ITEM_PIPELINES='{}' \
        -s CLOSESPIDER_ITEMCOUNT=5 -O /tmp/<spider>.json
    python3 tools/inspect_items.py /tmp/<spider>.json

This is the cheap gate for a newly added source: it costs no AI calls and
catches everything that actually goes wrong (wrong URL regex, JS-rendered body,
missing date markup, broken image URLs).

Acceptance: at least 4 of 5 items should be OK on every column.
"""
from __future__ import annotations

import json
import re
import sys
from datetime import datetime, timezone

import requests

UA = "AfrikaHaberleriBot/1.0 (+https://github.com/TuanaKardil/afrika_website)"
# Matches MinContentPipeline._THRESHOLD, the first pipeline that would drop these.
MIN_WORDS = 100
GOOD_WORDS = 250


def check_image(url: str) -> str:
    if not url:
        return "YOK"
    try:
        r = requests.head(url, headers={"User-Agent": UA}, timeout=15,
                          allow_redirects=True)
        if r.status_code == 405:  # some CDNs reject HEAD
            r = requests.get(url, headers={"User-Agent": UA}, timeout=15, stream=True)
        return str(r.status_code)
    except requests.RequestException:
        return "HATA"


def main(path: str) -> int:
    with open(path, encoding="utf-8") as fh:
        items = json.load(fh)

    if not items:
        print(f"{path}: HIC OGE YOK. Spider makale uretmedi.")
        return 1

    now = datetime.now(timezone.utc)
    ok_count = 0

    for i, item in enumerate(items, 1):
        body = item.get("content_original") or ""
        words = len(re.sub(r"<[^>]+>", " ", body).split())
        title = (item.get("title_original") or "").strip()
        raw_date = item.get("published_at") or ""

        try:
            pub = datetime.fromisoformat(raw_date)
            if pub.tzinfo is None:
                date_note = f"{pub:%Y-%m-%d %H:%M} TZ-SIZ"
                date_ok = False
            else:
                age_h = (now - pub).total_seconds() / 3600
                date_note = f"{pub:%Y-%m-%d %H:%M} ({age_h:.0f}sa once)"
                date_ok = True
        except (ValueError, TypeError):
            date_note = f"AYRISTIRILAMADI {raw_date!r}"
            date_ok = False

        img_status = check_image(item.get("featured_image_source_url") or "")
        item_ok = (
            words >= GOOD_WORDS and date_ok and bool(title)
            and img_status.startswith("2")
        )
        ok_count += item_ok

        print(f"\n[{i}] {'OK' if item_ok else 'SORUN'}  {item.get('source_url', '')[:96]}")
        print(f"    tarih   : {date_note}")
        print(f"    baslik  : {len(title):3d} krk  {title[:70]!r}")
        print(f"    govde   : {words:4d} kelime"
              f"{'  <-- MinContent bunu duserir' if words < MIN_WORDS else ''}"
              f"{'  <-- zayif' if MIN_WORDS <= words < GOOD_WORDS else ''}")
        print(f"    gorsel  : HTTP {img_status}  {(item.get('featured_image_source_url') or '')[:70]}")
        print(f"    alt     : {(item.get('image_alt_source') or '')[:60]!r}")
        print(f"    yazar   : {(item.get('author_original') or '')[:40]!r}")
        print(f"    dil     : {item.get('source_lang')}")
        print(f"    ilk 200 : {re.sub(r'<[^>]+>', ' ', body)[:200].strip()!r}")

    print(f"\n{'=' * 70}")
    print(f"{ok_count}/{len(items)} oge tam gecti "
          f"(esik: govde >= {GOOD_WORDS} kelime, tz bilgili tarih, baslik, 2xx gorsel)")
    return 0 if ok_count >= min(4, len(items)) else 1


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(__doc__)
        sys.exit(2)
    sys.exit(main(sys.argv[1]))
