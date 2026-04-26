import logging
import os
from datetime import datetime, timezone, timedelta

from scraper.openrouter import chat

logger = logging.getLogger(__name__)

_SYSTEM = """\
You are a duplicate detector for a news aggregator.

Given a NEW article (title + excerpt) and a list of EXISTING articles published in the last 48 hours,
determine whether the new article is semantically identical or near-identical to any existing article.

"Near-identical" means: same core event, same key facts, essentially the same story even if worded differently.
Different angles on the same broad topic do NOT count as duplicates.

Reply with ONLY "DUPLICATE" or "UNIQUE". No explanation."""


def is_duplicate(title: str, excerpt: str, supabase) -> bool:
    """Return True if this article is a near-duplicate of a recently stored article."""
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=48)).isoformat()

    try:
        result = (
            supabase.table("articles")
            .select("title_original, excerpt_original")
            .gte("scraped_at", cutoff)
            .eq("is_suppressed", False)
            .limit(50)
            .execute()
        )
    except Exception as exc:
        logger.warning("duplicate check DB query failed: %s", exc)
        return False

    existing = result.data or []
    if not existing:
        return False

    existing_block = "\n".join(
        f"- {r.get('title_original', '')} | {r.get('excerpt_original', '')[:100]}"
        for r in existing
    )

    user_msg = (
        f"NEW ARTICLE:\nTitle: {title}\nExcerpt: {excerpt[:300]}\n\n"
        f"EXISTING ARTICLES (last 48h):\n{existing_block}"
    )

    raw = chat(
        [{"role": "user", "content": user_msg}],
        system=_SYSTEM,
        temperature=0.0,
        max_tokens=10,
    )

    if raw is None:
        return False

    return raw.strip().upper().startswith("DUPLICATE")
