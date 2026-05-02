"""Fetch a high-quality relevant image for articles that have no featured image.

Primary:  Pexels API (HD editorial photos, requires PEXELS_API_KEY in env)
Fallback: Wikipedia (free, lower quality)

Never reuses a photo URL already present in the DB.
"""
import hashlib
import logging
import os
import re

import requests

logger = logging.getLogger(__name__)

_UA = "AfrikaHaberleriBot/1.0 (+https://github.com/TuanaKardil/afrika_website)"
_PEXELS_SEARCH = "https://api.pexels.com/v1/search"
_WP_API = "https://en.wikipedia.org/w/api.php"

_REGION_QUERIES = {
    "kuzey-afrika": "North Africa landscape",
    "bati-afrika": "West Africa",
    "orta-afrika": "Central Africa",
    "dogu-afrika": "East Africa",
    "guney-afrika": "Southern Africa",
    "afrika": "Africa",
}


# ─── AI query extraction ───────────────────────────────────────────────────────

def _ai_search_query(title: str) -> str:
    openrouter_key = os.environ.get("OPENROUTER_API_KEY", "")
    if not openrouter_key:
        words = re.sub(r"[^\w\s]", " ", title).split()
        return " ".join(words[:5])

    from scraper.scraper.openrouter import chat

    prompt = (
        "You are helping find a stock photo for an Africa news article.\n"
        "Write a short 3-6 word English photo search query that would return a relevant, "
        "visually strong HD photo for this article.\n"
        "Focus on the main subject: infrastructure, energy, agriculture, people, landscape, etc.\n"
        "Do NOT include brand names or very specific company names — use the category instead.\n"
        "Return ONLY the query string, nothing else.\n\n"
        f"Article title: {title}\n"
    )
    result = chat([{"role": "user", "content": prompt}], temperature=0.2, max_tokens=24)
    return (result or "").strip().strip('"').strip("'") or "Africa news"


# ─── Pexels ────────────────────────────────────────────────────────────────────

def _pexels_image(query: str, exclude_urls: set[str], title_seed: str = "") -> str | None:
    """Return a Pexels landscape photo URL not already in exclude_urls.

    Fetches 15 results and uses a hash of title_seed to vary the starting index,
    so different articles with similar queries get different photos.
    """
    api_key = os.environ.get("PEXELS_API_KEY", "")
    if not api_key:
        return None

    # Deterministic but varied starting offset based on article title
    seed_hash = int(hashlib.md5(title_seed.encode()).hexdigest(), 16) if title_seed else 0
    page = (seed_hash % 3) + 1  # pages 1-3

    try:
        resp = requests.get(
            _PEXELS_SEARCH,
            params={
                "query": query,
                "per_page": 15,
                "page": page,
                "orientation": "landscape",
                "size": "large",
            },
            headers={"Authorization": api_key, "User-Agent": _UA},
            timeout=15,
        )
        resp.raise_for_status()
        photos = resp.json().get("photos", [])

        # Start at a varied position within the page results
        start = seed_hash % max(len(photos), 1)
        ordered = photos[start:] + photos[:start]

        for photo in ordered:
            url = photo.get("src", {}).get("large2x") or photo.get("src", {}).get("large")
            if url and url not in exclude_urls:
                logger.info("Pexels hit for '%s' (page=%d): %s", query, page, url[:80])
                return url

        # All results on this page were already used — try page 1 with different offset
        if page != 1:
            resp2 = requests.get(
                _PEXELS_SEARCH,
                params={"query": query, "per_page": 15, "page": 1, "orientation": "landscape", "size": "large"},
                headers={"Authorization": api_key, "User-Agent": _UA},
                timeout=15,
            )
            resp2.raise_for_status()
            for photo in resp2.json().get("photos", []):
                url = photo.get("src", {}).get("large2x") or photo.get("src", {}).get("large")
                if url and url not in exclude_urls:
                    logger.info("Pexels fallback p1 for '%s': %s", query, url[:80])
                    return url

    except Exception as exc:
        logger.warning("Pexels search failed for '%s': %s", query, exc)
    return None


# ─── Wikipedia fallback ────────────────────────────────────────────────────────

def _wikipedia_image(query: str, exclude_urls: set[str]) -> str | None:
    try:
        resp = requests.get(
            _WP_API,
            params={
                "action": "query",
                "generator": "search",
                "gsrsearch": query,
                "gsrlimit": 10,
                "prop": "pageimages",
                "pithumbsize": 1200,
                "format": "json",
            },
            headers={"User-Agent": _UA},
            timeout=15,
        )
        resp.raise_for_status()
        pages = resp.json().get("query", {}).get("pages", {})
        for page in sorted(pages.values(), key=lambda p: p.get("index", 999)):
            thumb = page.get("thumbnail", {}).get("source", "")
            if (thumb
                    and "logo" not in thumb.lower()
                    and ".svg" not in thumb.lower()
                    and thumb not in exclude_urls):
                return thumb
    except Exception as exc:
        logger.warning("Wikipedia search failed for '%s': %s", query, exc)
    return None


# ─── Public API ───────────────────────────────────────────────────────────────

def fetch_fallback_image(
    title_original: str,
    region_slug: str | None = None,
    exclude_urls: set[str] | None = None,
) -> str | None:
    """Fetch a relevant HD image not already used by another article.

    Args:
        title_original: English article title used to generate the search query.
        region_slug: Used as a secondary query if the primary yields no results.
        exclude_urls: Set of image URLs already stored in the DB (to avoid duplicates).
    """
    exclude = exclude_urls or set()
    query = _ai_search_query(title_original)
    logger.info("Image fallback query: '%s'", query)

    # 1. Pexels primary
    url = _pexels_image(query, exclude, title_seed=title_original)
    if url:
        return url

    # 2. Pexels with region query
    if region_slug:
        region_query = _REGION_QUERIES.get(region_slug, "Africa")
        url = _pexels_image(region_query, exclude, title_seed=title_original)
        if url:
            return url

    # 3. Wikipedia fallback
    url = _wikipedia_image(query, exclude)
    if url:
        return url

    if region_slug:
        url = _wikipedia_image(_REGION_QUERIES.get(region_slug, "Africa"), exclude)

    return url
