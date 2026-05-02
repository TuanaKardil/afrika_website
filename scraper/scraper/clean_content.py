import logging

from scraper.openrouter import chat, GEMINI_FLASH_LITE

logger = logging.getLogger(__name__)

_SYSTEM = """\
You are a content editor for a Turkish-language Africa business news site.

You will receive the body of a translated Turkish news article in HTML format.
Your task is to remove any content that does NOT belong to the main article body, such as:

- Recommended article links or teasers ("Önerilen makaleler", "Bunu kaçırmayın", "İlgili haberler", "Ayrıca okuyun")
- Newsletter or subscription prompts ("Bültene kaydolun", "Günlük güncelleme")
- Social media share prompts or follow-us text
- Author bio boxes that are not part of the article
- Cookie notices, privacy banners, or security verification text
- "Read also" / "See also" / "Don't miss" cross-promotions in any language
- Any UI element text, sidebar content, or promotional copy that is clearly not article journalism

Rules:
- Keep ALL actual news content intact. Do not summarize, shorten, or rewrite.
- Preserve all HTML tags exactly as they appear in the input.
- Do not add any new content.
- If the body is already clean with no boilerplate, return it unchanged.
- Return ONLY the cleaned HTML. No explanation, no commentary, no markdown fences."""


def clean_article_body(content_tr: str) -> str:
    """Remove off-topic promotional content from a translated Turkish article body.

    Returns the original content unchanged on API failure.
    """
    if not content_tr or len(content_tr) < 100:
        return content_tr

    raw = chat(
        [{"role": "user", "content": content_tr}],
        model=GEMINI_FLASH_LITE,
        system=_SYSTEM,
        temperature=0.0,
        max_tokens=4096,
    )

    if not raw:
        logger.warning("clean_article_body: API failed, returning original")
        return content_tr

    cleaned = raw.strip()

    # Sanity check: result shouldn't be drastically shorter than original
    if len(cleaned) < len(content_tr) * 0.3:
        logger.warning(
            "clean_article_body: result suspiciously short (%d vs %d chars), keeping original",
            len(cleaned), len(content_tr),
        )
        return content_tr

    if cleaned != content_tr:
        logger.info("clean_article_body: removed boilerplate (%d -> %d chars)", len(content_tr), len(cleaned))

    return cleaned
