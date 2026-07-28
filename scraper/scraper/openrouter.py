import logging
import os
import time
from typing import Any

import requests

logger = logging.getLogger(__name__)

_BASE_URL = "https://openrouter.ai/api/v1/chat/completions"
_SITE_URL = "https://github.com/TuanaKardil/afrika_website"
MAX_RETRIES = 3

# Model aliases — update here to change models project-wide
GEMINI_FLASH_LITE = "google/gemini-2.5-flash-lite"   # score, translate, hashtags
GPT5_NANO        = "openai/gpt-4o-mini"                 # turkey_filter, classify


def chat(
    messages: list[dict[str, str]],
    *,
    model: str = GEMINI_FLASH_LITE,
    system: str | None = None,
    temperature: float = 0.0,
    max_tokens: int = 2048,
    meta: dict[str, Any] | None = None,
) -> str | None:
    """Send a chat request to OpenRouter. Returns the assistant message text or None on failure.

    Pass a dict as `meta` to receive the provider's finish_reason. It is
    "length" when the model ran out of output tokens, which means the returned
    text is a PARTIAL answer cut mid-word. Callers that parse structured output
    must check it: silently accepting a truncated response produced 36 articles
    whose body stopped mid-sentence (see translate.translate_article).
    """
    api_key = os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        logger.warning("OPENROUTER_API_KEY not set, skipping AI call")
        return None

    payload: dict[str, Any] = {
        "model": model,
        "temperature": temperature,
        "max_tokens": max_tokens,
        "messages": messages,
    }
    if system:
        payload["messages"] = [{"role": "system", "content": system}] + messages

    headers = {
        "Authorization": f"Bearer {api_key}",
        "HTTP-Referer": _SITE_URL,
        "Content-Type": "application/json",
    }

    for attempt in range(MAX_RETRIES):
        try:
            resp = requests.post(_BASE_URL, json=payload, headers=headers, timeout=60)
            resp.raise_for_status()
            data = resp.json()
            choice = data["choices"][0]
            msg = choice["message"]
            finish = choice.get("finish_reason") or choice.get("native_finish_reason")
            if meta is not None:
                meta["finish_reason"] = finish
            if finish == "length":
                logger.warning(
                    "OpenRouter response hit the %d-token cap (model=%s): the text is "
                    "truncated mid-answer, not a complete reply",
                    max_tokens, model,
                )
            return msg.get("content") or msg.get("reasoning") or None
        except requests.HTTPError as exc:
            if exc.response is not None and exc.response.status_code == 429:
                wait = 2 ** attempt
                logger.warning("OpenRouter rate limit, retrying in %ds", wait)
                time.sleep(wait)
            else:
                logger.error("OpenRouter HTTP error (attempt %d): %s", attempt + 1, exc)
                if attempt == MAX_RETRIES - 1:
                    return None
        except Exception as exc:
            logger.error("OpenRouter request failed (attempt %d): %s", attempt + 1, exc)
            if attempt == MAX_RETRIES - 1:
                return None

    return None
