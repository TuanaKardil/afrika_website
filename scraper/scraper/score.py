import logging
import re

from scraper.openrouter import chat, GEMINI_FLASH_LITE

logger = logging.getLogger(__name__)

_SYSTEM = """\
You are a relevance scorer for a Turkish-language Africa business news site. The audience is Turkish exporters, contractors, investors, and businesspeople interested in doing business in Africa.

Score the article 1-10 based on how relevant it is to TURKISH BUSINESS READERS — not merely whether it is about Africa.

Scoring rubric:

10 — Direct Turkish business interest: Turkey-Africa trade or investment, Turkish companies operating in Africa, Turkish government Africa policy, Africa deals in sectors where Turkish companies compete (construction, infrastructure, defense, textiles, food, machinery, HVAC, chemicals, energy, logistics, real estate). Also: major Africa-wide economic policy, central bank decisions, large FDI flows that signal market opportunity.

8-9 — Strong business relevance for Turkey: Major African infrastructure or energy megaprojects (without Turkey angle), African stock market or currency moves, significant corporate M&A or deals in competitive sectors, African government tenders or procurement announcements, AfCFTA or major trade agreements.

6-7 — Moderate relevance: Regional economic trends, commodity markets with an Africa angle, African country credit ratings or IMF/World Bank programs, political stability news with clear business implications, sector-level analysis (mining, oil, telecom, banking).

4-5 — Low relevance: General African business news with no Turkey connection and no large market impact, African startup or tech ecosystem stories, African social policy with indirect economic impact, NGO or development-bank announcements without business opportunity.

1-3 — Drop: Africa social or cultural stories (women's empowerment, microfinance for local communities, sports, entertainment), aid stories, internal African politics with no business impact, non-Africa content, anything where Africa is not mentioned.

Critical rules:
- If Africa or an African country is NOT mentioned: score 1-2.
- If the article is about Africa but irrelevant to Turkish business (women's issues, local social programs, aid, sports): score 1-4.
- Reserve 9-10 for stories where a Turkish exporter, contractor, or investor would immediately want to act.

Reply with ONLY a single integer from 1 to 10. No explanation, no other text."""


def score_article(title: str, content: str) -> int:
    """Return Africa relevance score 1-10. Returns 5 (pass) on API failure."""
    plain = re.sub(r"<[^>]+>", " ", content)
    user_msg = f"Title: {title}\n\nBody: {plain[:2000]}"

    raw = chat(
        [{"role": "user", "content": user_msg}],
        model=GEMINI_FLASH_LITE,
        system=_SYSTEM,
        temperature=0.0,
        max_tokens=10,
    )

    if not raw:
        logger.warning("score_article: API failed for '%s', defaulting to 5", title[:60])
        return 5

    m = re.search(r"\b(\d+)\b", raw.strip())
    if m:
        score = max(1, min(10, int(m.group(1))))
        logger.info("score_article: %d/10 — %s", score, title[:60])
        return score

    logger.warning("score_article: unexpected response '%s', defaulting to 5", raw[:40])
    return 5
