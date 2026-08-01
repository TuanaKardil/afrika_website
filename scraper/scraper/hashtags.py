import logging
import os
import re

from scraper.openrouter import chat, GEMINI_FLASH_LITE

logger = logging.getLogger(__name__)

_HASHTAG_CACHE: list[str] | None = None


def _load_hashtags() -> list[str]:
    global _HASHTAG_CACHE
    if _HASHTAG_CACHE is not None:
        return _HASHTAG_CACHE

    candidates = [
        os.path.join(os.path.dirname(__file__), "..", "..", "docs", "hashtags.md"),
        os.path.join(os.path.dirname(__file__), "..", "..", "hashtag.md"),
        os.path.join(os.path.dirname(__file__), "..", "hashtag.md"),
        "hashtag.md",
    ]
    for path in candidates:
        resolved = os.path.normpath(path)
        if os.path.exists(resolved):
            with open(resolved, encoding="utf-8") as f:
                text = f.read()
            tags = []
            for line in text.splitlines():
                line = line.strip()
                # Skip markdown headers and empty lines
                if not line or line.startswith("#"):
                    continue
                for token in line.split(","):
                    token = token.strip()
                    # Drop parenthetical explanations: "AfCFTA (açıklama)" → "AfCFTA"
                    token = re.sub(r"\s*\(.*?\)", "", token).strip()
                    # Drop bold markers and stray asterisks
                    token = token.replace("**", "").strip()
                    if token and len(token) > 1:
                        tags.append(token)
            _HASHTAG_CACHE = list(dict.fromkeys(tags))  # deduplicate, preserve order
            logger.info("Loaded %d hashtags from %s", len(_HASHTAG_CACHE), resolved)
            return _HASHTAG_CACHE

    logger.error("hashtag.md not found; hashtag assignment will be empty")
    _HASHTAG_CACHE = []
    return _HASHTAG_CACHE


def _build_system(tag_list: list[str]) -> str:
    canonical = "\n".join(tag_list)
    return f"""\
You are a hashtag selector for an Africa-focused Turkish business news site.

Given an article title and body, select between 8 and 15 hashtags from the canonical list below.
Rank them by relevance to the article content (most relevant first).

Rules:
- Only choose from the canonical list (one tag per line). Do not invent new hashtags.
- Copy each chosen tag VERBATIM, character for character, from the canonical list.
- Select between 8 and 15 tags. Aim for 10-12 for typical articles; use more for articles touching many topics.
- Prioritize specificity: prefer "Nijerya" over "Batı Afrika" if the article is specifically about Nigeria.
- Include: relevant country/region tags, relevant sector tags, relevant event-type tags, relevant actor tags.
- Do not use em dashes anywhere.
- Return ONLY a JSON array of strings. Example: ["Nijerya", "Yatırım", "Enerji"]. No explanation.

Canonical hashtag list (one tag per line):
{canonical}"""


MIN_HASHTAGS = 8
MAX_HASHTAGS = 15
_HASHTAG_ATTEMPTS = 2


def assign_hashtags(title: str, content: str) -> list[str]:
    """Return 8-15 hashtags from the canonical list for the given article.

    Retries once when the model comes back with too few valid tags, keeping the
    better of the two attempts. Without the retry, 10% of articles published
    with fewer than the mandated 8 (one had 4): the model invents tags outside
    the canonical list, they get filtered out, and whatever survived was
    accepted as-is.

    Returns an empty list on failure (pipelines.py will log a warning).
    """
    tag_list = _load_hashtags()
    if not tag_list:
        return []

    plain = re.sub(r"<[^>]+>", " ", content)
    user_msg = f"Title: {title}\n\nBody: {plain[:3000]}"

    best: list[str] = []
    for attempt in range(_HASHTAG_ATTEMPTS):
        valid = _one_attempt(user_msg, tag_list, temperature=0.2 + 0.2 * attempt)
        if len(valid) > len(best):
            best = valid
        if len(best) >= MIN_HASHTAGS:
            break
        if attempt + 1 < _HASHTAG_ATTEMPTS:
            logger.warning(
                "assign_hashtags: only %d valid tags, retrying (%s)",
                len(valid), title[:60],
            )

    if len(best) < MIN_HASHTAGS:
        logger.warning(
            "assign_hashtags: still %d valid tags after %d attempts (need %d): %s",
            len(best), _HASHTAG_ATTEMPTS, MIN_HASHTAGS, title[:60],
        )
    return best[:MAX_HASHTAGS]


def _one_attempt(user_msg: str, tag_list: list[str], temperature: float) -> list[str]:
    raw = chat(
        [{"role": "user", "content": user_msg}],
        model=GEMINI_FLASH_LITE,
        system=_build_system(tag_list),
        temperature=temperature,
        # 300 truncated the JSON array mid-string on articles that warranted the
        # full 15 tags: Turkish tag names are long and tokenize poorly, and a
        # cut array has no closing bracket, so the parse found nothing and the
        # article got ZERO hashtags rather than a short list.
        max_tokens=700,
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
    return [t for t in result if isinstance(t, str) and t in canonical_set]
