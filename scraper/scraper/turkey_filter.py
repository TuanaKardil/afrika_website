import logging
import re

from scraper.openrouter import chat

logger = logging.getLogger(__name__)

_SYSTEM = """\
You are a content filter for a Turkish-language Africa news site targeting Turkish business readers.

Evaluate whether the article has NEGATIVE framing toward Turkey, Turkish companies,
the Turkish government, or Turkish citizens.

"Negative framing" includes: accusations, sanctions, criticism, scandal, corruption,
human rights violations, or any content that portrays Turkey or Turkish entities negatively.

Neutral reporting of facts (e.g. "Turkish company opens factory in Kenya") is NOT negative framing.
Articles that do not mention Turkey at all are NOT negative.

Reply with ONLY "SUPPRESS" or "PUBLISH". No explanation."""


def should_suppress(title: str, content: str) -> bool:
    """Return True if the article should be suppressed due to negative Turkey framing."""
    plain = re.sub(r"<[^>]+>", " ", content)
    user_msg = f"Title: {title}\n\nBody: {plain[:3000]}"

    raw = chat(
        [{"role": "user", "content": user_msg}],
        system=_SYSTEM,
        temperature=0.0,
        max_tokens=10,
    )

    if raw is None:
        return False

    decision = raw.strip().upper()
    if decision.startswith("SUPPRESS"):
        logger.info("turkey_filter: suppressing article: %s", title[:80])
        return True

    return False
