import logging
import os
import re

from scraper.openrouter import chat

logger = logging.getLogger(__name__)

_HASHTAG_CACHE: list[str] | None = None


def _load_hashtags() -> list[str]:
    global _HASHTAG_CACHE
    if _HASHTAG_CACHE is not None:
        return _HASHTAG_CACHE

    candidates = [
        os.path.join(os.path.dirname(__file__), "..", "..", "hashtag.md"),
        os.path.join(os.path.dirname(__file__), "..", "hashtag.md"),
        "hashtag.md",
    ]
    for path in candidates:
        resolved = os.path.normpath(path)
        if os.path.exists(resolved):
            with open(resolved, encoding="utf-8") as f:
                text = f.read()
            # Extract tokens that look like hashtags (word chars, no spaces)
            tags = re.findall(r"#[\wÀ-ɏĀ-žİıİığüşöçıÇŞÖÜĞ]+", text)
            _HASHTAG_CACHE = list(dict.fromkeys(tags))  # deduplicate, preserve order
            logger.info("Loaded %d hashtags from %s", len(_HASHTAG_CACHE), resolved)
            return _HASHTAG_CACHE

    logger.error("hashtag.md not found; hashtag assignment will be empty")
    _HASHTAG_CACHE = []
    return _HASHTAG_CACHE


def _build_system(tag_list: list[str]) -> str:
    canonical = " ".join(tag_list)
    return f"""\
You are a hashtag selector for an Africa-focused Turkish business news site.

Given an article title and body, select EXACTLY 10 hashtags from the canonical list below.
Rank them by relevance to the article content (most relevant first).

Rules:
- Only choose from the canonical list. Do not invent new hashtags.
- Return exactly 10 hashtags, no more, no less.
- Do not use em dashes anywhere.
- Return ONLY a JSON array of 10 strings, e.g. ["#Tag1", "#Tag2", ...]. No explanation.

Canonical hashtag list:
{canonical}"""


def assign_hashtags(title: str, content: str) -> list[str]:
    """Return exactly 10 hashtags from hashtag.md for the given article.

    Returns an empty list on failure (pipelines.py will log a warning).
    """
    tag_list = _load_hashtags()
    if not tag_list:
        return []

    plain = re.sub(r"<[^>]+>", " ", content)
    user_msg = f"Title: {title}\n\nBody: {plain[:3000]}"

    raw = chat(
        [{"role": "user", "content": user_msg}],
        system=_build_system(tag_list),
        temperature=0.0,
        max_tokens=256,
    )

    if not raw:
        return []

    arr_match = re.search(r"\[.*?\]", raw, re.DOTALL)
    if not arr_match:
        logger.warning("assign_hashtags: no JSON array in response: %.200s", raw)
        return []

    import json
    try:
        result = json.loads(arr_match.group())
    except json.JSONDecodeError:
        logger.warning("assign_hashtags: JSON parse failed: %.200s", arr_match.group())
        return []

    if not isinstance(result, list):
        return []

    # Validate: only allow tags from canonical list
    canonical_set = set(tag_list)
    valid = [t for t in result if isinstance(t, str) and t in canonical_set]

    if len(valid) != 10:
        logger.warning(
            "assign_hashtags: expected 10 tags, got %d valid out of %d returned",
            len(valid), len(result),
        )

    return valid[:10]
