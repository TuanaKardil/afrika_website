"""Single source of truth for every news source the scraper knows about.

Before this module a source was declared in ~11 places (spider file, extractor
fallback selectors, translate labels, cutoff constants, run.sh, CI workflow,
frontend maps, n8n report). Everything that is *data* about a source now lives
here; the spiders, extractors and translator read from it.

The `slug` doubles as the `articles.source` DB value AND the Supabase Storage
path prefix (`storage.py` builds `{source}/{year}/{month}/{id}/{file}`), which
is why it is validated at import time: a malformed slug would otherwise surface
months later as a broken storage path.
"""
from __future__ import annotations

import json
import re
import sys
from dataclasses import dataclass

# --- acquisition strategies -------------------------------------------------


@dataclass(frozen=True)
class Rss:
    """Article URLs come from an RSS/Atom feed.

    The feed's own date is used to apply the cutoff BEFORE fetching the article,
    which is the main request saver for high-volume feeds.
    """

    feed_url: str


@dataclass(frozen=True)
class NewsSitemap:
    """Article URLs come from a sitemap.

    `is_index=True` means the URL is a <sitemapindex> and needs one extra hop to
    reach the <urlset> children. `max_children` bounds that hop so an archive
    sitemap cannot be walked end to end.
    """

    sitemap_url: str
    is_index: bool = False
    max_children: int = 3


@dataclass(frozen=True)
class HtmlIndex:
    """Article URLs are scraped off one or more index/section pages.

    `page_param` enables pagination: when set, `<index_url><page_param>N` is
    followed up to `max_pages` as long as the previous page yielded articles.
    Leave it None for sites whose robots.txt disallows pagination.
    """

    index_urls: tuple[str, ...]
    article_re: str
    page_param: str | None = None
    max_pages: int = 1


Strategy = Rss | NewsSitemap | HtmlIndex


# --- source record ----------------------------------------------------------

_SLUG_RE = re.compile(r"^[a-z][a-z0-9_]*$")


@dataclass(frozen=True)
class Source:
    slug: str
    label: str
    homepage: str
    strategy: Strategy
    lang: str = "en"
    cutoff_days: int = 1
    allowed_domains: tuple[str, ...] = ()
    # Tried in order when trafilatura returns too little; see extractors.extract_content
    body_selectors: tuple[str, ...] = ()
    # Tried in order for the featured image alt attribute
    image_alt_selectors: tuple[str, ...] = ()
    # Tried in order when the page has no article:published_time / JSON-LD /
    # <time> markup. The matched element's TEXT is parsed (e.g. Joomla's
    # ".itemDateCreated" -> "Saturday, 25 July 2026 17:47").
    date_selectors: tuple[str, ...] = ()
    # URLs matching this are skipped regardless of strategy. Used for sections a
    # feed mixes in that are not news (e.g. 360mozambique's tender listings,
    # which are short notices and belong to the separate tenders pipeline).
    exclude_url_re: str = ""
    # (regex, replacement) applied to the featured image URL before download, to
    # trade a CMS thumbnail for its full-size rendition. Joomla K2 links the "_S"
    # variant (290px) in page markup, and the WebP ladder never upscales, so
    # without this every image on the site capped at 290px.
    featured_image_rewrite: tuple[str, str] | None = None
    download_delay: int | None = None
    strip_leading_bullets: bool = False
    enabled: bool = True
    notes: str = ""

    @property
    def lang_name(self) -> str:
        return _LANG_NAMES.get(self.lang, "English")


_LANG_NAMES = {"en": "English", "fr": "French", "pt": "Portuguese"}

# Selectors shared by most WordPress installs; several sources reuse them.
_WP_BODY = (".entry-content", ".post-content", "article .content")
_WP_ALT = (
    ".wp-post-image::attr(alt)",
    "figure img::attr(alt)",
    "meta[property='og:image:alt']::attr(content)",
)
# ecofin and businessincameroon run the same Joomla template.
_JOOMLA_BODY = (".itemFullText", ".itemBody", ".item-page", "article .content")
_JOOMLA_ALT = ("figure img::attr(alt)", ".itemImage img::attr(alt)",
               "meta[property='og:image:alt']::attr(content)")
# Joomla exposes no article:published_time / JSON-LD / <time>; the only date on
# the page is this element's text, e.g. "Saturday, 25 July 2026 17:47".
_JOOMLA_DATE = (".itemDateCreated", ".itemDate")
# K2 publishes _XS/_S/_M/_L/_XL/_Generic renditions of every image and links
# the _S thumbnail (290px). _Generic is the full 1190px original; verified
# present for 10/10 sampled Ecofin images.
_K2_FULLSIZE = (r"_S\.jpg$", "_Generic.jpg")


_ALL: tuple[Source, ...] = (
    # --- the original five ---------------------------------------------------
    Source(
        slug="the_conversation",
        label="The Conversation Africa",
        homepage="https://theconversation.com",
        strategy=HtmlIndex(
            index_urls=tuple(
                f"https://theconversation.com/africa/{s}"
                for s in ("business", "politics", "health", "technology", "environment")
            ),
            article_re=r"theconversation\.com/[\w-]+-\d+$",
            page_param="?page=",
            max_pages=3,
        ),
        cutoff_days=1,
        allowed_domains=("theconversation.com",),
        body_selectors=(".content-body", "article .content", ".article__body"),
        image_alt_selectors=("figure img::attr(alt)",
                             "meta[property='og:image:alt']::attr(content)"),
    ),
    Source(
        slug="africa_report",
        label="The Africa Report",
        homepage="https://www.theafricareport.com",
        strategy=Rss(feed_url="https://www.theafricareport.com/feed/"),
        cutoff_days=7,
        allowed_domains=("theafricareport.com",),
        body_selectors=(".article-content", ".entry-content", "article .content"),
        image_alt_selectors=(".article-featured-image img::attr(alt)",
                             "figure img::attr(alt)",
                             "meta[property='og:image:alt']::attr(content)"),
    ),
    Source(
        slug="cnbc_africa",
        label="CNBC Africa",
        homepage="https://www.cnbcafrica.com",
        strategy=HtmlIndex(
            index_urls=(
                "https://www.cnbcafrica.com/",
                "https://www.cnbcafrica.com/tag/africa/",
                "https://www.cnbcafrica.com/tag/economy/",
            ),
            article_re=r"cnbcafrica\.com/20\d{2}/[a-z0-9-]+/?$",
        ),
        cutoff_days=1,
        allowed_domains=("cnbcafrica.com",),
        body_selectors=(".entry-content", ".article-body", "article .content"),
        image_alt_selectors=("figure img::attr(alt)",
                             "meta[property='og:image:alt']::attr(content)"),
    ),
    Source(
        slug="aa_africa",
        label="Anadolu Ajansı",
        homepage="https://www.aa.com.tr",
        strategy=HtmlIndex(
            index_urls=("https://www.aa.com.tr/en/africa",),
            article_re=r"aa\.com\.tr/en/africa/[\w-]+/\d+$",
        ),
        cutoff_days=1,
        allowed_domains=("aa.com.tr",),
        body_selectors=(".article-content", ".news-body", "article .content"),
        image_alt_selectors=("figure img::attr(alt)",
                             "meta[property='og:image:alt']::attr(content)"),
    ),
    Source(
        slug="business_insider",
        label="Business Insider Africa",
        homepage="https://africa.businessinsider.com",
        strategy=HtmlIndex(
            index_urls=("https://africa.businessinsider.com/",),
            article_re=r"africa\.businessinsider\.com/local/[a-z-]+/[a-z0-9-]+/[a-z0-9]+$",
        ),
        cutoff_days=1,
        allowed_domains=("africa.businessinsider.com",),
        body_selectors=(".content-lock-content", ".post-content", "article .content"),
        image_alt_selectors=("figure img::attr(alt)",
                             "meta[property='og:image:alt']::attr(content)"),
        strip_leading_bullets=True,
    ),

    # --- the ten new ones ----------------------------------------------------
    Source(
        slug="ecofin",
        label="Ecofin Agency",
        homepage="https://www.ecofinagency.com",
        strategy=HtmlIndex(
            index_urls=("https://www.ecofinagency.com/",),
            article_re=r"ecofinagency\.com/[a-z-]+/\d+-\d+-[a-z0-9-]+$",
        ),
        cutoff_days=1,
        allowed_domains=("ecofinagency.com",),
        body_selectors=_JOOMLA_BODY,
        image_alt_selectors=_JOOMLA_ALT,
        date_selectors=_JOOMLA_DATE,
        featured_image_rewrite=_K2_FULLSIZE,
        download_delay=4,
        enabled=True,
        notes=(
            "Joomla. The /obrss/ RSS feed works but /obrss/ is robots-Disallowed, "
            "so HTML index is the only compliant path. Cloudflare, "
            "Content-Signal: ai-train=no,use=reference."
        ),
    ),
    Source(
        slug="business_daily_africa",
        label="Business Daily Africa",
        homepage="https://www.businessdailyafrica.com",
        strategy=NewsSitemap(
            sitemap_url="https://www.businessdailyafrica.com/bd/sitemap.xml",
        ),
        cutoff_days=1,
        allowed_domains=("businessdailyafrica.com",),
        body_selectors=(".article-body", ".paragraph", "article .content"),
        image_alt_selectors=("figure img::attr(alt)",
                             "meta[property='og:image:alt']::attr(content)"),
        download_delay=4,
        enabled=True,
        notes=(
            "Google News sitemap with news:publication_date. Articles are marked "
            "news:access=Subscription but the body is server-rendered in full; "
            "the paywall is client-side JS. Fragile: if that changes, "
            "MinContentPipeline will silently drop everything."
        ),
    ),
    Source(
        slug="business_in_cameroon",
        label="Business in Cameroon",
        homepage="https://www.businessincameroon.com",
        strategy=HtmlIndex(
            index_urls=("https://www.businessincameroon.com/",),
            article_re=r"businessincameroon\.com/[a-z-]+/\d+-\d+-[a-z0-9-]+$",
        ),
        cutoff_days=2,
        allowed_domains=("businessincameroon.com",),
        body_selectors=_JOOMLA_BODY,
        image_alt_selectors=_JOOMLA_ALT,
        date_selectors=_JOOMLA_DATE,
        featured_image_rewrite=_K2_FULLSIZE,
        download_delay=4,
        enabled=True,
        notes="Same Joomla template as ecofin. Cloudflare, same content signals.",
    ),
    Source(
        slug="medias24",
        label="Médias24",
        homepage="https://medias24.com",
        strategy=Rss(feed_url="https://medias24.com/feed/"),
        lang="fr",
        cutoff_days=1,
        allowed_domains=("medias24.com",),
        body_selectors=_WP_BODY,
        image_alt_selectors=_WP_ALT,
        enabled=True,
        notes="French. WordPress.",
    ),
    Source(
        slug="nairametrics",
        label="Nairametrics",
        homepage="https://nairametrics.com",
        strategy=Rss(feed_url="https://nairametrics.com/feed/"),
        cutoff_days=1,
        allowed_domains=("nairametrics.com",),
        body_selectors=_WP_BODY,
        image_alt_selectors=_WP_ALT,
        enabled=True,
        notes="High volume. WordPress.",
    ),
    Source(
        slug="bft_online",
        label="The Business & Financial Times",
        homepage="https://thebftonline.com",
        strategy=NewsSitemap(
            sitemap_url="https://thebftonline.com/sitemap.xml",
            is_index=True,
            max_children=3,
        ),
        cutoff_days=2,
        allowed_domains=("thebftonline.com",),
        body_selectors=(".article-content", ".entry-content", "article .content"),
        image_alt_selectors=("figure img::attr(alt)",
                             "meta[property='og:image:alt']::attr(content)"),
        enabled=False,
        notes=(
            "DISABLED: the article page only carries a teaser. Measured over 20 "
            "articles, 19 were under 100 words (median 44), so MinContentPipeline "
            "drops nearly all of them. Earlier probes looked viable only because "
            "the Related Coverage widget was being counted as body text. "
            "Re-enable only if the site starts publishing full text. "
            "Next.js. Sitemap index -> /sitemaps/articles-{0,1,2}.xml; children "
            "MUST be filtered by lastmod or it walks the whole archive."
        ),
    ),
    Source(
        slug="daily_news_egypt",
        label="Daily News Egypt",
        homepage="https://www.dailynewsegypt.com",
        # Business category feed, not the site-wide one: /feed/ mixes in
        # geopolitics and security wire copy (Iran/Israel, port drone strikes)
        # that the score gate would drop anyway, but only after paying for it.
        strategy=Rss(feed_url="https://www.dailynewsegypt.com/category/business/feed/"),
        cutoff_days=1,
        allowed_domains=("dailynewsegypt.com",),
        body_selectors=_WP_BODY,
        image_alt_selectors=_WP_ALT,
        enabled=True,
    ),
    Source(
        slug="capital_ethiopia",
        label="Capital Ethiopia",
        homepage="https://capitalethiopia.com",
        strategy=Rss(feed_url="https://capitalethiopia.com/feed/"),
        cutoff_days=3,
        allowed_domains=("capitalethiopia.com",),
        body_selectors=_WP_BODY,
        image_alt_selectors=_WP_ALT,
        enabled=True,
        notes="Small feed, low daily volume, hence the wider window.",
    ),
    Source(
        slug="new_times_rwanda",
        label="The New Times",
        homepage="https://www.newtimes.co.rw",
        strategy=HtmlIndex(
            index_urls=("https://www.newtimes.co.rw/business",),
            article_re=r"newtimes\.co\.rw/article/\d+/[\w/-]+$",
        ),
        cutoff_days=2,
        allowed_domains=("newtimes.co.rw",),
        body_selectors=(".article-content", ".body-content", "article .content"),
        image_alt_selectors=("figure img::attr(alt)",
                             "meta[property='og:image:alt']::attr(content)"),
        enabled=True,
        notes=(
            "RSS is robots-Disallowed (/rss, /rssFeed/*) and so is pagination "
            "(*/page/*), so a single index page is all we get. Expect low yield."
        ),
    ),
    Source(
        slug="mozambique_360",
        label="360 Mozambique",
        homepage="https://360mozambique.com",
        strategy=Rss(feed_url="https://360mozambique.com/feed/"),
        lang="pt",
        cutoff_days=1,
        allowed_domains=("360mozambique.com",),
        body_selectors=_WP_BODY,
        image_alt_selectors=_WP_ALT,
        exclude_url_re=r"/tenders/",
        enabled=True,
        notes=(
            "Portuguese. WordPress. Slug avoids a leading digit on purpose. "
            "Its feed mixes in /tenders/ notices (~80 words); those are excluded."
        ),
    ),
)


SOURCES: dict[str, Source] = {s.slug: s for s in _ALL}


# --- validation (runs at import; a bad slug must never reach Storage) --------

def _validate() -> None:
    seen: set[str] = set()
    for src in _ALL:
        if not _SLUG_RE.match(src.slug):
            raise ValueError(
                f"Invalid source slug {src.slug!r}: must match {_SLUG_RE.pattern} "
                "(it is used as a Supabase Storage path prefix)"
            )
        if src.slug in seen:
            raise ValueError(f"Duplicate source slug: {src.slug}")
        seen.add(src.slug)
        if src.lang not in _LANG_NAMES:
            raise ValueError(f"{src.slug}: unknown lang {src.lang!r}")


_validate()


# --- accessors --------------------------------------------------------------

def get(slug: str) -> Source | None:
    return SOURCES.get(slug)


def label(slug: str) -> str:
    src = SOURCES.get(slug)
    return src.label if src else ""


def homepage(slug: str) -> str:
    src = SOURCES.get(slug)
    return src.homepage if src else ""


def lang(slug: str) -> str:
    src = SOURCES.get(slug)
    return src.lang if src else "en"


def body_selectors(slug: str) -> list[str]:
    src = SOURCES.get(slug)
    return list(src.body_selectors) if src else []


def active_slugs() -> list[str]:
    """Slugs whose spider should run. Drives run.sh and the CI matrix."""
    return [s.slug for s in _ALL if s.enabled]


def all_slugs() -> list[str]:
    return [s.slug for s in _ALL]


if __name__ == "__main__":
    arg = sys.argv[1] if len(sys.argv) > 1 else "--slugs"
    if arg == "--slugs-json":
        print(json.dumps(active_slugs()))
    elif arg == "--all-slugs-json":
        print(json.dumps(all_slugs()))
    else:
        print("\n".join(active_slugs()))
