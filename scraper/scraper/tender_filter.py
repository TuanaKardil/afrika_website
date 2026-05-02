"""Turkey sentiment filter for tender notices.

Returns True if a tender should be suppressed due to negative Turkey framing.
"""
import logging
import re

from scraper.openrouter import chat

logger = logging.getLogger(__name__)

_SYSTEM = """\
You are a content filter for a Turkish-language Africa business intelligence site \
targeting Turkish business readers.

Evaluate whether the tender notice has NEGATIVE framing toward Turkey, Turkish companies,
the Turkish government, or Turkish citizens.

"Negative framing" includes: accusations, sanctions, criticism, scandal, corruption,
human rights violations, or any content that portrays Turkey or Turkish entities negatively.

Neutral reporting of facts (e.g. "Turkish company awarded contract in Kenya") is NOT negative.
Tender notices that do not mention Turkey at all are NOT negative.

Do not use em dashes anywhere in the output.

Reply with ONLY "SUPPRESS" or "PUBLISH". No explanation."""


def should_suppress_tender(title: str, description: str) -> bool:
    """Return True if the tender should be suppressed due to negative Turkey framing."""
    plain = re.sub(r"<[^>]+>", " ", description or "")
    user_msg = f"Title: {title}\n\nDescription: {plain[:3000]}"

    raw = chat(
        [{"role": "user", "content": user_msg}],
        system=_SYSTEM,
        temperature=0.0,
        max_tokens=10,
    )

    if raw is None:
        # Fail open: do not suppress when AI is unavailable
        return False

    decision = raw.strip().upper()
    if decision.startswith("SUPPRESS"):
        logger.info("tender_filter: suppressing tender: %s", title[:80])
        return True

    return False
