#!/usr/bin/env python3
"""Per-source funnel report from DRY_RUN spider logs.

    cd scraper
    python3 -m scrapy crawl <spider> -s DRY_RUN=1 -s LOG_LEVEL=INFO > /tmp/an/<spider>.log 2>&1
    python3 tools/funnel_report.py /tmp/an/*.log

Shows where each source's articles die. scrape_stats gives the same numbers in
production, but DRY_RUN writes nothing, so this parses the log instead. Useful
when deciding whether a source is worth enabling and what its real yield is.
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

# Each gate's log signature, in pipeline order.
GATES = [
    ("yinelenen",   re.compile(r"Unchanged content, skipping")),
    ("kisa_icerik", re.compile(r"Thin content \(")),
    ("turkiye",     re.compile(r"Turkey filter|SUPPRESS")),
    ("dusuk_puan",  re.compile(r"Africa score (\d+)/10 < ")),
    ("ai_yinelen",  re.compile(r"AI duplicate detected")),
    ("ceviri",      re.compile(r"Translation failed|non-Turkish output")),
    ("kalite",      re.compile(r"Truncated translation|No <h2> after remediation")),
]
WOULD_INSERT = re.compile(r"\[DRY RUN\] would insert: .*?score=(\d+).*?h2=(\d+) words=(\d+)")
SCORE_DROP = re.compile(r"Africa score (\d+)/10 < ")
# item_scraped_count counts items that COMPLETED every pipeline, i.e. published.
# Items entering the pipeline = scraped + dropped.
COMPLETED = re.compile(r"'item_scraped_count': (\d+)")
DROPPED = re.compile(r"'item_dropped_count': (\d+)")
REQUESTS = re.compile(r"'downloader/request_count': (\d+)")


def analyse(path: Path) -> dict:
    text = path.read_text(errors="replace")
    counts = {name: len(rx.findall(text)) for name, rx in GATES}
    inserts = WOULD_INSERT.findall(text)
    scores_pub = [int(s) for s, _, _ in inserts]
    words = [int(w) for _, _, w in inserts]
    h2s = [int(h) for _, h, _ in inserts]
    scores_all = scores_pub + [int(s) for s in SCORE_DROP.findall(text)]
    completed = COMPLETED.search(text)
    dropped = DROPPED.search(text)
    reqs = REQUESTS.search(text)
    n_completed = int(completed.group(1)) if completed else 0
    n_dropped = int(dropped.group(1)) if dropped else 0
    return {
        "source": path.stem,
        "requests": int(reqs.group(1)) if reqs else 0,
        "scraped": n_completed + n_dropped,
        "published": len(inserts),
        "avg_score_all": round(sum(scores_all) / len(scores_all), 1) if scores_all else None,
        "avg_score_pub": round(sum(scores_pub) / len(scores_pub), 1) if scores_pub else None,
        "avg_words": round(sum(words) / len(words)) if words else None,
        "avg_h2": round(sum(h2s) / len(h2s), 1) if h2s else None,
        **counts,
    }


def main(paths: list[str]) -> int:
    rows = [analyse(Path(p)) for p in paths]
    rows.sort(key=lambda r: -r["published"])

    gate_names = [g[0] for g in GATES]
    header = (f"{'kaynak':<22}{'istek':>6}{'gecen':>7}{'YAYIN':>7}"
              + "".join(f"{g:>12}" for g in gate_names)
              + f"{'puan_ort':>10}{'kelime':>8}{'h2':>5}")
    print(header)
    print("-" * len(header))
    for r in rows:
        print(f"{r['source']:<22}{r['requests']:>6}{r['scraped']:>7}{r['published']:>7}"
              + "".join(f"{r[g]:>12}" for g in gate_names)
              + f"{str(r['avg_score_pub'] or '-'):>10}"
              + f"{str(r['avg_words'] or '-'):>8}"
              + f"{str(r['avg_h2'] or '-'):>5}")

    tot_pub = sum(r["published"] for r in rows)
    tot_scraped = sum(r["scraped"] for r in rows)
    print("-" * len(header))
    print(f"{'TOPLAM':<22}{sum(r['requests'] for r in rows):>6}"
          f"{tot_scraped:>7}{tot_pub:>7}")
    if tot_scraped:
        print(f"\nGecen/yayin orani: {tot_pub}/{tot_scraped} = "
              f"%{100 * tot_pub / tot_scraped:.0f}")
    return 0


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(2)
    sys.exit(main(sys.argv[1:]))
