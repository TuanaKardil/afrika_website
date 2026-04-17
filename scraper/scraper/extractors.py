import trafilatura
from scrapy.http import Response

# Minimum character threshold to accept trafilatura output
_MIN_LENGTH = 200

# Per-source CSS selector fallbacks
_FALLBACK_SELECTORS: dict[str, list[str]] = {
    "bbc": [
        "[data-component='text-block']",
        ".article__body-content",
        "#main-content article",
    ],
    "the_conversation": [
        ".content-body",
        "article .content",
        ".article__body",
    ],
}


def extract_content(response: Response, source: str = "bbc") -> str:
    html = response.text

    result = trafilatura.extract(
        html,
        include_images=True,
        include_links=True,
        output_format="html",
        no_fallback=False,
    )

    if result and len(result) >= _MIN_LENGTH:
        return result

    # CSS selector fallback: concatenate matched block HTML
    selectors = _FALLBACK_SELECTORS.get(source, [])
    for selector in selectors:
        blocks = response.css(selector)
        if blocks:
            return " ".join(block.get() for block in blocks)

    # Last resort: raw body text wrapped in a paragraph
    return f"<p>{response.css('body').xpath('string()').get('').strip()}</p>"
