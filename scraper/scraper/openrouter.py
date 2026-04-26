import logging
import os
import time
from typing import Any

import requests

logger = logging.getLogger(__name__)

_BASE_URL = "https://openrouter.ai/api/v1/chat/completions"
MODEL = "google/gemini-2.0-flash-001"
_SITE_URL = "https://github.com/TuanaKardil/afrika_website"
MAX_RETRIES = 3


def chat(
    messages: list[dict[str, str]],
    *,
    system: str | None = None,
    temperature: float = 0.0,
    max_tokens: int = 2048,
) -> str | None:
    """Send a chat request to OpenRouter. Returns the assistant message text or None on failure."""
    api_key = os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        logger.warning("OPENROUTER_API_KEY not set, skipping AI call")
        return None

    payload: dict[str, Any] = {
        "model": MODEL,
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
            return data["choices"][0]["message"]["content"]
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
