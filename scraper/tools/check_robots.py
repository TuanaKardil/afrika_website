#!/usr/bin/env python3
"""Check that our UA is still allowed to fetch each source's start URLs.

    cd scraper && python3 tools/check_robots.py [slug ...]

Run when adding a source, and periodically afterwards. ROBOTSTXT_OBEY is True,
so a newly added Disallow silently reduces a source to zero articles rather than
raising anything. ecofin, business_daily_africa and business_in_cameroon curate
their robots.txt actively (they already Disallow named AI crawlers), so they are
the likeliest to change.

Also reports the Cloudflare Content-Signal line when present. That is not
enforced by robots parsers and does not block the crawl; it is surfaced so the
publisher-relations position stays a conscious decision.
"""
from __future__ import annotations

import sys
from urllib.parse import urljoin, urlparse
from urllib.robotparser import RobotFileParser

import requests

sys.path.insert(0, ".")
from scraper import sources  # noqa: E402

UA = "AfrikaHaberleriBot/1.0 (+https://github.com/TuanaKardil/afrika_website)"


def robots_for(url: str) -> tuple[RobotFileParser | None, str]:
    root = f"{urlparse(url).scheme}://{urlparse(url).netloc}"
    robots_url = urljoin(root, "/robots.txt")
    # requests, not urllib: it ships certifi, and urllib fails cert verification
    # on a stock macOS Python.
    try:
        resp = requests.get(robots_url, headers={"User-Agent": UA}, timeout=20)
        resp.raise_for_status()
        text = resp.text
    except requests.RequestException as exc:
        return None, f"robots.txt alinamadi: {exc}"
    parser = RobotFileParser()
    parser.parse(text.splitlines())
    signal = next(
        (ln.strip() for ln in text.splitlines()
         if ln.lower().startswith("content-signal:")),
        "",
    )
    return parser, signal


def entry_urls(src) -> list[str]:
    strategy = src.strategy
    if hasattr(strategy, "feed_url"):
        return [strategy.feed_url]
    if hasattr(strategy, "sitemap_url"):
        return [strategy.sitemap_url]
    return list(strategy.index_urls)


def main(slugs: list[str]) -> int:
    failures = 0
    for slug in slugs:
        src = sources.get(slug)
        if src is None:
            print(f"{slug}: BILINMEYEN KAYNAK")
            failures += 1
            continue

        urls = entry_urls(src)
        parser, signal = robots_for(urls[0])
        print(f"\n=== {slug} ({src.label}){'' if src.enabled else '  [devre disi]'}")
        if parser is None:
            print(f"    {signal}")   # holds the error message in this branch
            failures += 1
            continue
        if signal:
            print(f"    {signal}")

        for url in urls:
            allowed = parser.can_fetch(UA, url)
            print(f"    {'IZINLI ' if allowed else 'ENGELLI'} {url}")
            if not allowed:
                failures += 1

    print(f"\n{'=' * 60}")
    print("Tum giris URL'leri izinli" if not failures
          else f"{failures} engelli/hatali giris URL'i")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:] or sources.all_slugs()))
