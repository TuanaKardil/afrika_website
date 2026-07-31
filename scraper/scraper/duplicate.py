import logging
from datetime import datetime, timezone, timedelta

from scraper.openrouter import chat, GPT5_NANO

logger = logging.getLogger(__name__)

_SYSTEM = """\
You are a duplicate detector for a news aggregator.

Given a NEW article (title + excerpt) and a list of EXISTING articles published in the last 48 hours,
determine whether the new article is semantically identical or near-identical to any existing article.

"Near-identical" means: same core event, same key facts, essentially the same story even if worded differently.
Different angles on the same broad topic do NOT count as duplicates.

Articles may be in different languages. The same event reported in English and in French (or Portuguese) IS a duplicate: judge the underlying event, not the wording or the language.

Reply with ONLY "DUPLICATE" or "UNIQUE". No explanation."""


def is_duplicate(title: str, excerpt: str, supabase) -> bool:
    """Return True if this article is a near-duplicate of a recently stored article."""
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=48)).isoformat()

    try:
        # .order() is load-bearing, not cosmetic: without it Postgres returns an
        # ARBITRARY subset once the window exceeds the limit. At 5 sources the
        # 48h window held ~40 rows so limit(50) happened to cover it; at 15
        # sources it is ~120, so an unordered limit(50) would have silently
        # degraded dedup to a coin flip exactly when cross-source duplication
        # (AFP/Reuters syndication) became likely.
        result = (
            supabase.table("articles")
            .select("title_original, excerpt_original")
            .gte("scraped_at", cutoff)
            .eq("is_suppressed", False)
            .order("scraped_at", desc=True)
            .limit(200)
            .execute()
        )
    except Exception as exc:
        logger.warning("duplicate check DB query failed: %s", exc)
        return False

    existing = result.data or []
    if not existing:
        return False

    # 60 chars of excerpt, not 100: the row count went from 50 to 200, and the
    # title plus a short lead is what actually identifies the event.
    existing_block = "\n".join(
        f"- {r.get('title_original', '')} | {(r.get('excerpt_original') or '')[:60]}"
        for r in existing
    )

    user_msg = (
        f"NEW ARTICLE:\nTitle: {title}\nExcerpt: {excerpt[:300]}\n\n"
        f"EXISTING ARTICLES (last 48h):\n{existing_block}"
    )

    raw = chat(
        [{"role": "user", "content": user_msg}],
        model=GPT5_NANO,
        system=_SYSTEM,
        temperature=0.0,
        max_tokens=10,
    )

    if raw is None:
        return False

    return raw.strip().upper().startswith("DUPLICATE")
