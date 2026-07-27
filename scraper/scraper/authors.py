"""Deterministic named-author assignment for articles.

Every published article is attributed to one of the 7 site authors (the
`authors` table, migration 031). The mapping is a pure dict/set lookup on the
already-classified `region_slug` / `nav_tab_slug` plus the country hashtags,
with NO AI or network call. The same function is used by the live scraper
(StoragePipeline) and the one-time backfill (backfill_author.py) so both produce
identical results.

Assignment priority:
  1. nav_tab_slug == "turk-is-dunyasi"          -> merve-nur-aydin (overrides region)
  2. region_slug in {kuzey/dogu/orta/guney}     -> the regional writer
  3. region_slug == "bati-afrika"               -> split by country hashtag
        francophone country/bloc tag -> elodie-kouassi
        else (anglophone or no match) -> amina-bello
  4. anything else (continent-wide afrika / null / unknown)
        -> spread deterministically across all 7 writers, keyed on a stable
           hash of source_url (so re-scrapes never shift the author). This
           bucket is ~45% of the corpus, so dumping it on one desk would be
           unrealistic; spreading keeps every desk busy.
"""

import hashlib

# West Africa is a single region slug but has two writers. The only per-country
# signal is the free-text Turkish country name inside the hashtags array, so we
# split on that. Country -> writer follows the editorial brief (Togo/Benin are
# francophone countries but are covered by the anglophone-desk writer per the
# brief's explicit country lists); unlisted countries fall back by language bloc.
FRANCOPHONE_WA = {
    "Fildişi Sahili",
    "Senegal",
    "Mali",
    "Burkina Faso",
    "Gine",
    "Nijer",
    "Frankofon Batı Afrika",
    "Frankofon Afrika",
}

ANGLOPHONE_WA = {
    "Nijerya",
    "Gana",
    "Togo",
    "Benin",
    "Liberya",
    "Sierra Leone",
    "Gambiya",
    "Anglofon Afrika",
}

_REGION_AUTHORS = {
    "kuzey-afrika": "meriem-el-amrani",
    "dogu-afrika": "abdirahman-warsame",
    "orta-afrika": "aicha-mahamat-issa",
    "guney-afrika": "yusuf-emre-karaca",
}

# Continent-wide / bölgesiz bucket is spread across all 7 writers. Fixed order
# so the source_url hash maps to a stable author across runs; never reorder.
ALL_AUTHORS = [
    "elodie-kouassi",
    "amina-bello",
    "meriem-el-amrani",
    "abdirahman-warsame",
    "aicha-mahamat-issa",
    "yusuf-emre-karaca",
    "merve-nur-aydin",
]

# Fallback when source_url is missing (cannot hash) — keeps the fn total.
DEFAULT_AUTHOR = "yusuf-emre-karaca"


def _spread_author(source_url):
    """Deterministically pick one of the 7 writers from a stable source_url hash."""
    if not source_url:
        return DEFAULT_AUTHOR
    digest = hashlib.md5(source_url.encode("utf-8")).hexdigest()
    return ALL_AUTHORS[int(digest, 16) % len(ALL_AUTHORS)]


def assign_author(region_slug, nav_tab_slug, hashtags, source_url=None):
    """Return the author slug for an article. Never returns None."""
    tags = set(hashtags or [])

    # 1. Turkey-Africa relations desk takes precedence over region.
    if nav_tab_slug == "turk-is-dunyasi":
        return "merve-nur-aydin"

    # 2. Single-writer regions.
    if region_slug in _REGION_AUTHORS:
        return _REGION_AUTHORS[region_slug]

    # 3. West Africa: francophone vs anglophone split, anglophone is the default.
    if region_slug == "bati-afrika":
        if tags & FRANCOPHONE_WA:
            return "elodie-kouassi"
        return "amina-bello"

    # 4. Continent-wide / unknown: spread across all 7 writers by source_url.
    return _spread_author(source_url)
