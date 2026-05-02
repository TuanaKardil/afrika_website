"""Trim articles whose content_tr exceeds 600 words down to max 600 words.

Uses AI to summarize (not truncate) so the result reads naturally.
Run as: python3 -m scraper.trim
"""
import logging
import os
import re

from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

MAX_WORDS = 600

_SYSTEM = """\
You are editing a Turkish news article for an Africa-focused business news site.

The article body below exceeds the 600-word limit. Trim it to a maximum of 600 words.

Rules:
- Preserve the most newsworthy facts, key figures, and important quotes.
- Remove background context, repetitive sentences, and less critical details first.
- Do NOT truncate mid-sentence. End on a complete sentence.
- Preserve all remaining HTML tags exactly as they appear.
- Do not add new information or translate anything.
- Do not use em dashes anywhere.
- Return ONLY the trimmed HTML body content. No explanation, no wrapper tags."""


def _word_count(html: str) -> int:
    text = re.sub(r"<[^>]+>", " ", html or "")
    return len(text.split())


def trim_content(content_tr: str) -> str | None:
    """Return trimmed Turkish content or None on failure."""
    from scraper.openrouter import chat

    raw = chat(
        [{"role": "user", "content": content_tr}],
        system=_SYSTEM,
        temperature=0.1,
        max_tokens=4096,
    )
    return raw


def main() -> None:
    from supabase import create_client

    sb = create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_ROLE_KEY"],
    )

    rows = sb.table("articles").select("id,title_original,content_tr").execute()
    articles = rows.data or []

    over_limit = [
        a for a in articles
        if _word_count(a.get("content_tr") or "") > MAX_WORDS
    ]

    logger.info(
        "%d/%d articles exceed %d words and will be trimmed",
        len(over_limit), len(articles), MAX_WORDS,
    )

    trimmed = 0
    for art in over_limit:
        original_wc = _word_count(art.get("content_tr") or "")
        logger.info(
            "Trimming [%d words]: %s",
            original_wc, art.get("title_original", "")[:70],
        )

        result = trim_content(art["content_tr"])
        if not result:
            logger.warning("Trim failed for article %s", art["id"])
            continue

        new_wc = _word_count(result)
        if new_wc > MAX_WORDS:
            logger.warning(
                "Still %d words after trim for %s — keeping anyway",
                new_wc, art["id"],
            )

        sb.table("articles").update({"content_tr": result}).eq("id", art["id"]).execute()
        logger.info("Trimmed %d -> %d words: %s", original_wc, new_wc, art.get("title_original", "")[:60])
        trimmed += 1

    logger.info("Trim complete: %d/%d articles updated", trimmed, len(over_limit))


if __name__ == "__main__":
    main()
