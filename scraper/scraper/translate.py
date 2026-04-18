import asyncio
import concurrent.futures
import hashlib
import logging
import os
import re
from typing import Any

import anthropic

logger = logging.getLogger(__name__)

MODEL = "claude-haiku-4-5-20251001"
MAX_TOKENS = 4096
BATCH_SIZE = 4
MAX_CONCURRENCY = 5
MAX_RETRIES = 2

_EM_DASH_RE = re.compile(r"[\u2014\u2013]|(?<!\-)\-\-(?!\-)")

_SYSTEM_PROMPT = """\
You are a professional news translator specializing in African affairs. \
Translate the provided content from English to Turkish.

Rules:
- Preserve all HTML tags exactly as they appear. Do not add, remove, or modify any HTML tags.
- Do not use em dashes (-- or the Unicode em dash or en dash characters) anywhere in the output. \
Use commas or rephrase instead.
- Preserve proper nouns in their Turkish-accepted forms \
(e.g., "Nigeria" becomes "Nijerya", "Kenya" stays "Kenya", "Cairo" becomes "Kahire", \
"Ethiopia" becomes "Etiyopya", "Egypt" becomes "Misir", "Ghana" stays "Gana", \
"Sudan" stays "Sudan", "Somalia" becomes "Somali").
- Do not summarize, condense, or omit any content. Translate the full text faithfully.
- Do not add any commentary, notes, or translator remarks.
- Output only the translated content using the exact delimiter tags provided."""

_USER_TEMPLATE = """\
Translate the following news article to Turkish.

<title>{title}</title>
<excerpt>{excerpt}</excerpt>
<body>{body}</body>"""

_TAG_RE = re.compile(
    r"<title>(.*?)</title>.*?<excerpt>(.*?)</excerpt>.*?<body>(.*?)</body>",
    re.DOTALL,
)


def _md5(text: str) -> str:
    return hashlib.md5(text.encode("utf-8")).hexdigest()


def _strip_em_dashes(text: str) -> str:
    return _EM_DASH_RE.sub(",", text)


def _parse_response(text: str) -> tuple[str, str, str] | None:
    match = _TAG_RE.search(text)
    if not match:
        return None
    title = _strip_em_dashes(match.group(1).strip())
    excerpt = _strip_em_dashes(match.group(2).strip())
    body = _strip_em_dashes(match.group(3).strip())
    return title, excerpt, body


async def _translate_one(
    client: anthropic.AsyncAnthropic,
    semaphore: asyncio.Semaphore,
    article: dict[str, Any],
) -> dict[str, Any]:
    title = article.get("title_original") or ""
    excerpt = article.get("excerpt_original") or ""
    body = article.get("content_original") or ""

    user_message = _USER_TEMPLATE.format(
        title=title, excerpt=excerpt, body=body
    )

    last_exc: Exception | None = None
    for attempt in range(MAX_RETRIES + 1):
        try:
            async with semaphore:
                response = await client.messages.create(
                    model=MODEL,
                    max_tokens=MAX_TOKENS,
                    temperature=0,
                    system=_SYSTEM_PROMPT,
                    messages=[{"role": "user", "content": user_message}],
                )
            raw = response.content[0].text
            parsed = _parse_response(raw)
            if parsed is None:
                logger.warning(
                    "Could not parse translation response for %s, raw: %.200s",
                    article.get("source_url"),
                    raw,
                )
                article["title_tr"] = None
                article["excerpt_tr"] = None
                article["content_tr"] = None
                return article

            title_tr, excerpt_tr, content_tr = parsed
            article["title_tr"] = title_tr
            article["excerpt_tr"] = excerpt_tr
            article["content_tr"] = content_tr
            return article

        except anthropic.RateLimitError as exc:
            last_exc = exc
            wait = 2 ** attempt
            logger.warning("Rate limit hit for %s, retrying in %ds", article.get("source_url"), wait)
            await asyncio.sleep(wait)

        except anthropic.APIError as exc:
            last_exc = exc
            if attempt < MAX_RETRIES:
                wait = 2 ** attempt
                logger.warning("API error for %s (attempt %d): %s, retrying in %ds",
                               article.get("source_url"), attempt + 1, exc, wait)
                await asyncio.sleep(wait)
            else:
                break

    logger.error("Translation failed after %d attempts for %s: %s",
                 MAX_RETRIES + 1, article.get("source_url"), last_exc)
    article["title_tr"] = None
    article["excerpt_tr"] = None
    article["content_tr"] = None
    return article


async def _translate_batch(
    client: anthropic.AsyncAnthropic,
    semaphore: asyncio.Semaphore,
    batch: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    tasks = [_translate_one(client, semaphore, article) for article in batch]
    return list(await asyncio.gather(*tasks))


def translate_articles(articles: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Translate a list of article dicts in place. Returns the same list with
    title_tr, excerpt_tr, content_tr populated. Articles whose content_hash
    matches stored hash and already have title_tr are skipped."""

    to_translate = []
    skipped = []

    for article in articles:
        content = article.get("content_original") or ""
        new_hash = _md5(content)
        article["content_hash"] = new_hash

        if article.get("title_tr") and article.get("content_hash_stored") == new_hash:
            logger.info("Skipping unchanged article: %s", article.get("source_url"))
            skipped.append(article)
        else:
            to_translate.append(article)

    if not to_translate:
        return articles

    logger.info("Translating %d articles (%d skipped)", len(to_translate), len(skipped))

    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        logger.warning("ANTHROPIC_API_KEY not set, skipping translation")
        return skipped + to_translate  # return untranslated so pipeline can apply fallback

    async def _run() -> list[dict[str, Any]]:
        client = anthropic.AsyncAnthropic(api_key=api_key)
        semaphore = asyncio.Semaphore(MAX_CONCURRENCY)
        results: list[dict[str, Any]] = []

        for i in range(0, len(to_translate), BATCH_SIZE):
            batch = to_translate[i : i + BATCH_SIZE]
            batch_results = await _translate_batch(client, semaphore, batch)
            results.extend(batch_results)
            logger.info("Translated batch %d-%d", i + 1, i + len(batch))

        await client.close()
        return results

    # Run in a dedicated thread to avoid conflicts with Scrapy's event loop
    def _run_in_thread() -> list[dict[str, Any]]:
        return asyncio.run(_run())

    with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
        translated = executor.submit(_run_in_thread).result()

    return translated + skipped
