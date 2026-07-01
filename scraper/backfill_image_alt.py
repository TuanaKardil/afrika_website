#!/usr/bin/env python3
"""One-time backfill: fetch real image alt text from source pages for existing articles.

Runs against articles where image_alt_tr == title_tr (the migration fallback).
Fetches the source page, extracts the <img alt> using the same selectors as each spider,
translates it with translate_image_alt(), and updates the DB.
"""

import os
import sys
import time

import re

import requests
from dotenv import load_dotenv
from parsel import Selector
from supabase import create_client

_CREDIT_RE = re.compile(
    r"\s*[.\|]\s*(REUTERS|AFP|AP Photo|AP|Getty Images?|EPA|NurPhoto|Bloomberg|"
    r"Shutterstock|File Photo|©\s*\w+)[^$]*$",
    re.I,
)


def _strip_caption_credit(text: str) -> str:
    return _CREDIT_RE.sub("", text).strip().rstrip(",").strip()

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from scraper.translate import translate_image_alt  # noqa: E402

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/125.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
}

REQUEST_DELAY = 0.8  # seconds between requests


def extract_alt(html: str, source: str) -> str:
    sel = Selector(text=html)
    if source == "business_insider":
        return (
            sel.css(".hero-image img::attr(alt)").get()
            or sel.css("figure img::attr(alt)").get()
            or sel.css("meta[property='og:image:alt']::attr(content)").get()
            or ""
        ).strip()
    if source == "the_conversation":
        return (
            sel.css(".ultra-wide-lead-image picture img::attr(alt)").get()
            or sel.css("figure img::attr(alt)").get()
            or sel.css("meta[property='og:image:alt']::attr(content)").get()
            or ""
        ).strip()
    if source == "africa_report":
        return (
            sel.css(".article-featured-image img::attr(alt)").get()
            or sel.css("figure img::attr(alt)").get()
            or sel.css("meta[property='og:image:alt']::attr(content)").get()
            or ""
        ).strip()
    if source == "aa_africa":
        return (
            sel.css(".article-image img::attr(alt)").get()
            or sel.css("figure img::attr(alt)").get()
            or sel.css("meta[property='og:image:alt']::attr(content)").get()
            or ""
        ).strip()
    if source == "cnbc_africa":
        raw = (
            sel.css("figcaption::text").get()
            or sel.css("meta[property='og:image:alt']::attr(content)").get()
            or ""
        ).strip()
        return _strip_caption_credit(raw)
    return ""


def main():
    sb = create_client(SUPABASE_URL, SUPABASE_KEY)

    page_size = 100
    offset = 0
    total_fetched = 0
    total_updated = 0
    total_skipped = 0

    session = requests.Session()
    session.headers.update(HEADERS)

    print("Fetching articles where image_alt_tr == title_tr (migration backfill)...\n")

    while True:
        rows = (
            sb.table("articles")
            .select("id,source_url,source,title_tr,image_alt_tr")
            .range(offset, offset + page_size - 1)
            .execute()
            .data
        )
        if not rows:
            break

        for row in rows:
            total_fetched += 1
            alt_tr_current = row.get("image_alt_tr") or ""
            title_tr = row.get("title_tr") or ""

            # Only process articles where image_alt_tr was backfilled from title_tr
            if alt_tr_current != title_tr:
                total_skipped += 1
                continue

            source_url = row.get("source_url")
            if not source_url:
                total_skipped += 1
                continue

            try:
                resp = session.get(source_url, timeout=15)
                if resp.status_code != 200:
                    print(f"  HTTP {resp.status_code}: {source_url}")
                    total_skipped += 1
                    time.sleep(REQUEST_DELAY)
                    continue

                alt_en = extract_alt(resp.text, row["source"])
                if not alt_en:
                    print(f"  NO ALT found: {source_url}")
                    total_skipped += 1
                    time.sleep(REQUEST_DELAY)
                    continue

                alt_tr = translate_image_alt(alt_en)
                if not alt_tr:
                    print(f"  MEANINGLESS ({alt_en[:60]}): {source_url}")
                    total_skipped += 1
                    time.sleep(REQUEST_DELAY)
                    continue

                sb.table("articles").update({"image_alt_tr": alt_tr}).eq("id", row["id"]).execute()
                print(f"  OK: [{row['source']}] {alt_en[:60]} -> {alt_tr}")
                total_updated += 1

            except Exception as e:
                print(f"  ERROR {source_url}: {e}")
                total_skipped += 1

            time.sleep(REQUEST_DELAY)

        offset += page_size

    print(f"\nDone. Fetched={total_fetched}, Updated={total_updated}, Skipped={total_skipped}")


if __name__ == "__main__":
    main()
