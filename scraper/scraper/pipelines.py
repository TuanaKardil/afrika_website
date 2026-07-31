import hashlib
import logging
import os
import re
import unicodedata
import uuid
from datetime import datetime, date, timezone

from dotenv import load_dotenv
from scrapy.exceptions import DropItem

from scraper.sanitize import sanitize_html
# Turkish-output detection lives in translate.py so finalize_content_tr() can
# apply the same gate without importing this module.
from scraper.translate import looks_turkish as _looks_turkish

load_dotenv()

logger = logging.getLogger(__name__)

# Per-process stats accumulator. One scrapy process = one spider = one source.
_run_stats: dict = {}


def _stats_inc(source: str, field: str, value: int = 1) -> None:
    s = source or "unknown"
    if s not in _run_stats:
        _run_stats[s] = {
            "total_scraped": 0,
            "dropped_duplicate": 0,
            "dropped_low_score": 0,
            "dropped_min_content": 0,
            "dropped_turkey_filter": 0,
            "published": 0,
            "scores": [],
        }
    if field == "scores":
        _run_stats[s]["scores"].append(value)
    else:
        _run_stats[s][field] += value


def _md5(text: str) -> str:
    return hashlib.md5(text.encode("utf-8")).hexdigest()


def _get_supabase():
    from supabase import create_client
    return create_client(
        os.environ["SUPABASE_URL"],
        os.environ["SUPABASE_SERVICE_ROLE_KEY"],
    )


# Matches wire service datelines at the very start of an HTML paragraph's text content.
# Handles full (CITY, Date (AGENCY)) and short (CITY (AGENCY)) formats, including
# multi-word agency names like "Thomson Reuters Vakfı" or "AP/AFP".
# Examples: "LONDON (Reuters) —", "JOHANNESBURG, 26 Haziran (Thomson Reuters Vakfı) ,"
_DATELINE_RE = re.compile(
    r"^(<p[^>]*>)\s*[A-ZÇŞİĞÖÜ][A-ZÇŞİĞÖÜa-z\s/\-]{1,40}"  # city (2-40 chars, mixed case allowed for SINGAPORE/LONDON)
    r"(?:,\s*[\w\s]+?)?"                                        # optional: ", Date"
    r"\s*\([A-Za-zÇŞİĞÖÜçşığöü\s/\-\.]{2,50}\)"               # (AGENCY) — allows spaces, Turkish chars, dots
    r"\s*[,\-–—]\s*",                                           # trailing punctuation
    re.UNICODE,
)

# Matches "Özet:", "Sonuç:", "Summary:", "Özet :" etc. at the start of a paragraph,
# with or without HTML bold tags, in any capitalisation.
_SUMMARY_LABEL_RE = re.compile(
    r"(<p[^>]*>)\s*(?:<strong>)?\s*(?:Özet|Sonuç|Summary|Özetle)\s*:\s*(?:</strong>)?\s*",
    re.IGNORECASE | re.UNICODE,
)


def _strip_datelines(html: str) -> str:
    """Remove wire-service datelines and summary labels from HTML paragraph tags."""
    html = _DATELINE_RE.sub(r"\1", html)
    html = _SUMMARY_LABEL_RE.sub(r"\1", html)
    return html


_EN_STOPWORDS_RE = re.compile(
    r'\b(the|of|and|in|to|that|is|are|was|were|for|on|at|by|with|from|said|has|have|been|will)\b',
    re.IGNORECASE,
)


def _is_english(html: str) -> bool:
    """Return True if the text is predominantly English (translation failed)."""
    text = re.sub(r"<[^>]+>", " ", html)
    words = re.findall(r'\w+', text)
    if len(words) < 50:
        return False
    en_hits = len(_EN_STOPWORDS_RE.findall(text))
    return en_hits / len(words) > 0.08




_TR_CHARS = str.maketrans("çşığöüÇŞİĞÖÜ", "csigoucsigou")


def _is_slug_conflict(exc: Exception) -> bool:
    """True when a failed insert was a unique violation on articles.slug."""
    msg = str(exc).lower()
    return "23505" in msg or ("duplicate key" in msg and "slug" in msg)


def _is_source_constraint_violation(exc: Exception) -> bool:
    """True when a failed write was rejected by articles_source_check."""
    msg = str(exc).lower()
    return "articles_source_check" in msg or (
        "23514" in msg and "source" in msg
    )


def _make_slug(title: str, existing_slugs: set[str]) -> str:
    # First apply Turkish character map, then normalize all remaining accented
    # characters (e.g. é→e, ã→a, ô→o) via Unicode decomposition.
    base = title.translate(_TR_CHARS)
    base = unicodedata.normalize("NFKD", base)
    base = base.encode("ascii", "ignore").decode("ascii")
    base = base.lower()
    base = re.sub(r"[^\w\s-]", "", base)
    base = re.sub(r"[\s_]+", "-", base).strip("-")
    # Truncating at 80 can leave a trailing dash ("...-goz-ardi-"); strip again.
    base = base[:80].strip("-")
    if base not in existing_slugs:
        return base
    # Genuine title collision (rare). Prefer a readable ordinal over a random
    # hex blob: "-2", "-3", ... Random hex is kept only as a last resort so the
    # function can never fail to return a unique slug.
    for n in range(2, 51):
        candidate = f"{base}-{n}"
        if candidate not in existing_slugs:
            return candidate
    return f"{base}-{uuid.uuid4().hex[:6]}"


# Word pairs that invert a headline's meaning. A photo caption containing one
# side while the title asserts the other is describing a different story.
# Dates are deliberately NOT compared: a caption legitimately carries the
# photo's own date ("Akra, 5 Aralik 2016") which rarely matches the article.
_CAPTION_POLARITY = [
    ("dusuk", "yuksek"), ("guclu", "zayif"), ("artti", "dustu"),
    ("artis", "dusus"), ("yukseldi", "dustu"), ("kar", "zarar"),
]


def _contradicts_title(caption: str, title: str) -> bool:
    if not caption or not title:
        return False

    def norm(t: str) -> str:
        t = unicodedata.normalize("NFKD", t.translate(_TR_CHARS))
        t = t.encode("ascii", "ignore").decode("ascii").lower()
        return re.sub(r"[^a-z0-9\s]", " ", t)

    nc, nt = norm(caption), norm(title)
    for a, b in _CAPTION_POLARITY:
        ca, cb = re.search(rf"\b{a}\b", nc), re.search(rf"\b{b}\b", nc)
        ta, tb = re.search(rf"\b{a}\b", nt), re.search(rf"\b{b}\b", nt)
        if (ca and tb and not ta) or (cb and ta and not tb):
            return True
    return False


class DeduplicationPipeline:
    def __init__(self):
        self._supabase = None

    def open_spider(self, spider):
        try:
            self._supabase = _get_supabase()
        except Exception as exc:
            logger.warning("Supabase unavailable, dedup disabled: %s", exc)

    def process_item(self, item, spider):
        source = item.get("source", "")
        _stats_inc(source, "total_scraped")

        if self._supabase is None:
            return item

        source_url = item.get("source_url", "")
        content = item.get("content_original", "")
        new_hash = _md5(content)

        try:
            result = (
                self._supabase.table("articles")
                .select("content_hash")
                .eq("source_url", source_url)
                .maybe_single()
                .execute()
            )
        except Exception as exc:
            logger.error("Dedup query failed for %s: %s", source_url, exc)
            return item

        if result and result.data:
            stored_hash = result.data.get("content_hash", "")
            if stored_hash == new_hash:
                _stats_inc(source, "dropped_duplicate")
                raise DropItem(f"Unchanged content, skipping: {source_url}")
            item["is_update"] = True

        return item


class SemanticDuplicatePipeline:
    """AI near-duplicate detection against the last 48h of published articles.

    Split out of DeduplicationPipeline and moved AFTER scoring: it is the only
    AI call in that pipeline, so running it on every scraped item meant paying
    for articles that ScorePipeline was about to drop anyway. Running it later
    also improves precision, because the comparison corpus then contains only
    articles good enough to have been published.
    """

    def __init__(self):
        self._supabase = None

    def open_spider(self, spider):
        try:
            self._supabase = _get_supabase()
        except Exception as exc:
            logger.warning("Supabase unavailable, semantic dedup disabled: %s", exc)

    def process_item(self, item, spider):
        if self._supabase is None or item.get("is_update"):
            return item

        from scraper.duplicate import is_duplicate

        source = item.get("source", "")
        source_url = item.get("source_url", "")
        if is_duplicate(item.get("title_original", ""),
                        item.get("excerpt_original", ""),
                        self._supabase):
            _stats_inc(source, "dropped_duplicate")
            raise DropItem(f"AI duplicate detected, skipping: {source_url}")

        return item


class SanitizationPipeline:
    def process_item(self, item, spider):
        raw = item.get("content_original") or ""
        item["content_original"] = sanitize_html(raw)
        raw_tr = item.get("content_tr") or ""
        if raw_tr:
            item["content_tr"] = sanitize_html(raw_tr)
        return item


MIN_AFRICA_SCORE = 6


class ScorePipeline:
    """Drop articles scoring below MIN_AFRICA_SCORE on Africa relevance (1-10)."""

    def process_item(self, item, spider):
        from scraper.score import score_article
        from scrapy.exceptions import DropItem as _DropItem

        title = item.get("title_original", "")
        content = item.get("content_original", "")
        score = score_article(title, content)
        item["score"] = score

        if score < MIN_AFRICA_SCORE:
            _stats_inc(item.get("source", ""), "dropped_low_score")
            raise _DropItem(
                f"Africa score {score}/10 < {MIN_AFRICA_SCORE}, dropping: {title[:80]}"
            )

        return item


class MinContentPipeline:
    """Drop articles whose original content is too short (< 100 words).

    Runs at 120, i.e. before ANY AI call. It used to sit at 175, after the
    Turkey filter, scoring and semantic dedup, so a 40-word teaser burned three
    AI calls before being dropped for a reason that costs nothing to check. That
    ordering assumed scoring was free; it is not, and with 15 sources (several
    of which publish short Joomla teasers) the waste is significant.

    Threshold is 100 (raised from 80): Reuters/agency wire stubs and teasers
    top out around 90-96 source words and produce thin, structure-less articles
    that can't carry the mandatory AEO H2s (QualityCheckPipeline would drop them
    post-translation anyway). Blocking them here is the cheaper, earlier gate.
    Substantive news runs 200+ words, so this does not touch real articles.
    """

    _THRESHOLD = 100

    def process_item(self, item, spider):
        source_url = item.get("source_url", "")
        raw = item.get("content_original") or ""
        text = re.sub(r"<[^>]+>", " ", raw)
        word_count = len(re.findall(r'\w+', text))
        if word_count < self._THRESHOLD:
            logger.warning(
                "Dropping thin content (%d words): %s", word_count, source_url
            )
            _stats_inc(item.get("source", ""), "dropped_min_content")
            raise DropItem(
                f"Thin content ({word_count} words < {self._THRESHOLD}): {source_url}"
            )
        return item


class TranslationPipeline:
    """Translate source content to Turkish for articles scoring MIN_AFRICA_SCORE or higher.
    Source may be English, French or Portuguese; item["source_lang"] says which.
    Articles below MIN_AFRICA_SCORE skip translation (title_tr/excerpt_tr/content_tr remain None).
    Uses Gemini 2.5 Flash-Lite via OpenRouter.
    """

    def process_item(self, item, spider):
        from scraper.translate import translate_article

        score = item.get("score", 0)
        if score < MIN_AFRICA_SCORE:
            item["title_tr"] = None
            item["excerpt_tr"] = None
            item["content_tr"] = None
            logger.info("Translation skipped (score %d < %d): %s", score, MIN_AFRICA_SCORE, item.get("source_url", ""))
            return item

        result = translate_article(
            title=item.get("title_original", ""),
            excerpt=item.get("excerpt_original", ""),
            body=item.get("content_original", ""),
            source_url=item.get("source_url", ""),
            source_name=item.get("source", ""),
            source_lang=item.get("source_lang", ""),
        )
        if result is None:
            logger.warning("Translation failed for %s", item.get("source_url", ""))
            item["title_tr"] = None
            item["excerpt_tr"] = None
            item["content_tr"] = None
            return item

        title_tr, excerpt_tr, content_tr = result

        # Guard: the output must READ AS TURKISH. Checking "is it still English"
        # only worked while every source was English; a failed French or
        # Portuguese translation passed that check untouched.
        if content_tr and not _looks_turkish(content_tr):
            logger.warning(
                "Translation did not produce Turkish (source_lang=%s), dropping: %s",
                item.get("source_lang", "?"), item.get("source_url", ""),
            )
            raise DropItem(f"Translation failed (non-Turkish output): {item.get('source_url', '')}")

        item["title_tr"] = title_tr
        item["excerpt_tr"] = excerpt_tr
        # Strip datelines and summary labels immediately after translation,
        # before the AI clean step, as a guaranteed Python-level safety net.
        item["content_tr"] = _strip_datelines(content_tr) if content_tr else content_tr

        # Translate image alt text — separate call, not mixed with article translation
        from scraper.translate import translate_image_alt
        alt_source = (item.get("image_alt_source") or "").strip()
        if alt_source:
            alt_tr = translate_image_alt(alt_source)
            # Sources reuse a photo from a related story, and its alt text then
            # describes that other story: a "highest diesel prices" article
            # shipped a caption reading "lowest diesel prices". The caption is
            # rendered right under the headline, so a contradiction is glaring.
            # Fall back to title_tr, the same value used when no alt exists.
            if alt_tr and _contradicts_title(alt_tr, title_tr):
                logger.warning(
                    "image_alt_tr contradicts the title, using title instead: %r vs %r",
                    alt_tr[:60], (title_tr or "")[:60],
                )
                alt_tr = None
            item["image_alt_tr"] = alt_tr
            logger.debug("image_alt_tr: %s → %s", alt_source[:60], item["image_alt_tr"])
        else:
            item["image_alt_tr"] = None

        logger.info("Translated (score %d): %s", score, item.get("source_url", ""))
        return item


class ContentCleanPipeline:
    """Remove off-topic promotional content from translated body."""

    def process_item(self, item, spider):
        content_tr = item.get("content_tr") or ""
        if content_tr:
            # Strip datelines at Python level before sending to AI clean step.
            content_tr = _strip_datelines(content_tr)
            from scraper.clean_content import clean_article_body
            item["content_tr"] = clean_article_body(content_tr)
        return item


# Matches Turkish list-intro endings that indicate JS-rendered list data was not scraped.
# Catches both colon ("şunlardır:") and period ("şunlardır.") endings, plus English variants.
_TRUNCATED_LIST_RE = re.compile(
    r'(?:şunlardır|aşağıdakilerdir|bunlardır|aşağıda\s+yer\s+almaktadır|'
    r'listesi\s*(?:şöyledir|aşağıdadır)?|'
    r'(?:are|is)\s+as\s+follows|following\s+countries)\s*[:.]\s*$',
    re.IGNORECASE | re.UNICODE,
)

# A finished article ends on sentence-final punctuation. Closing quotes and
# brackets count because a body may legitimately end on a quotation.
_SENTENCE_END_CHARS = ('.', '!', '?', '"', '”', '’', "'", ')', '»', '…')

# The trailing "Kaynak: <outlet>" attribution line carries no final period, so
# it must come off before the sentence-ending test.
_SOURCE_LINK_TAIL_RE = re.compile(r'\s*Kaynak:\s*\S[^\n]*$', re.UNICODE)


class QualityCheckPipeline:
    """Post-translation quality checks that drop or repair bad output.

    1. Truncated list articles — content ends with "şunlardır:" meaning the
       list/table data was not scraped (JS-rendered or paywalled). Drop these.
    2. Missing H2 heading — MANDATORY for the AEO strategy (question-format H2s
       are the foundation of AI Overview / featured-snippet eligibility). If the
       translation ignored the H2 rule, remediate with a targeted AI call; if
       that still yields no <h2>, drop the article so nothing publishes without
       one. A dropped item is re-attempted on the next scrape run.
    """

    def process_item(self, item, spider):
        content_tr = item.get("content_tr") or ""
        if not content_tr:
            return item

        plain = re.sub(r"<[^>]+>", " ", content_tr).strip()

        if _TRUNCATED_LIST_RE.search(plain):
            source_url = item.get("source_url", "")
            logger.warning("Dropping truncated list article (missing table data): %s", source_url)
            _stats_inc(item.get("source", ""), "dropped_low_score")
            raise DropItem(f"Truncated list (no table data scraped): {source_url}")

        # Cut-off body. A finished Turkish article always ends on sentence-final
        # punctuation; anything else means the generation stopped mid-sentence
        # (an AI response that hit its token cap, or a source teaser ending in
        # "[...]"). 36 such half-articles reached the site before this check
        # existed, some cut mid-word. Drop and re-attempt on the next run rather
        # than publish half a story.
        body_end = _SOURCE_LINK_TAIL_RE.sub("", plain).rstrip()
        if body_end and not body_end.endswith(_SENTENCE_END_CHARS):
            source_url = item.get("source_url", "")
            logger.warning(
                "Dropping truncated translation (body ends mid-sentence: %r): %s",
                body_end[-60:], source_url,
            )
            _stats_inc(item.get("source", ""), "dropped_low_score")
            raise DropItem(f"Truncated translation (cut mid-sentence): {source_url}")

        # The rule is 2-3 question-format H2s, but this only ever checked for
        # "at least one", so 151 single-heading articles were published and read
        # as a different format from the rest of the site. ensure_h2() tops a
        # short body up; 0 headings after remediation is still a hard drop.
        from scraper.translate import MIN_H2, ensure_h2, h2_count
        if h2_count(content_tr) < MIN_H2:
            source_url = item.get("source_url", "")
            logger.warning(
                "Only %d <h2> (want %d); attempting AEO remediation: %s",
                h2_count(content_tr), MIN_H2, source_url,
            )
            fixed = ensure_h2(item.get("title_tr") or "", content_tr)
            if h2_count(fixed) > 0:
                item["content_tr"] = fixed
                if h2_count(fixed) < MIN_H2:
                    logger.warning(
                        "Publishing with %d <h2> after remediation: %s",
                        h2_count(fixed), source_url,
                    )
                else:
                    logger.info("H2 remediation applied: %s", source_url)
            else:
                logger.warning("H2 remediation failed; dropping article: %s", source_url)
                _stats_inc(item.get("source", ""), "dropped_low_score")
                raise DropItem(f"No <h2> after remediation (AEO structure required): {source_url}")

        return item


class MetaDescriptionPipeline:
    """Generate AI-powered SEO meta descriptions for translated articles.

    Runs after SanitizationPipeline (250) so content_tr is clean HTML.
    Uses Gemini 2.5 Flash-Lite — same model as article translation.
    Only processes articles that have content_tr set (score 6+).
    """

    def process_item(self, item, spider):
        content_tr = item.get("content_tr") or ""
        title_tr = item.get("title_tr") or ""
        if not content_tr or not title_tr:
            item["meta_description_tr"] = None
            return item

        from scraper.translate import generate_meta_description
        meta_desc = generate_meta_description(title_tr, content_tr)
        item["meta_description_tr"] = meta_desc
        if meta_desc:
            logger.info("meta_description_tr (%d chars): %.80s", len(meta_desc), meta_desc)
        else:
            logger.warning("meta_description_tr generation failed for %s", item.get("source_url", ""))
        return item


class TurkeyFilterPipeline:
    """Drop articles with negative Turkey framing before expensive translation."""

    def process_item(self, item, spider):
        from scraper.turkey_filter import should_suppress

        title = item.get("title_original", "")
        content = item.get("content_original", "")
        suppressed = should_suppress(title, content)
        item["turkey_filter_result"] = "SUPPRESS" if suppressed else "PUBLISH"
        if suppressed:
            _stats_inc(item.get("source", ""), "dropped_turkey_filter")
            raise DropItem(f"Turkey filter: suppressing article: {title[:80]}")
        return item


_INDEXNOW_KEY = "b821579c4bc8450dab6f8ec6bd0f0fc4"
_INDEXNOW_HOST = "www.afrikahaberleri.tr"
_SITE_URL = "https://www.afrikahaberleri.tr"


def _ping_indexnow(slugs: list[str]) -> None:
    if not slugs:
        return
    import urllib.request, json as _json
    urls = [f"{_SITE_URL}/haber/{s}" for s in slugs]
    payload = _json.dumps({
        "host": _INDEXNOW_HOST,
        "key": _INDEXNOW_KEY,
        "keyLocation": f"{_SITE_URL}/{_INDEXNOW_KEY}.txt",
        "urlList": urls,
    }).encode()
    req = urllib.request.Request(
        "https://api.indexnow.org/indexnow",
        data=payload,
        headers={"Content-Type": "application/json; charset=utf-8"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            logger.info("IndexNow ping: %d URLs → HTTP %s", len(urls), resp.status)
    except Exception as exc:
        logger.warning("IndexNow ping failed: %s", exc)


class StoragePipeline:
    def __init__(self):
        self._supabase = None
        self._known_slugs: set[str] = set()
        self._used_image_urls: set[str] = set()
        self._new_slugs: list[str] = []
        self._dry_run = False

    def open_spider(self, spider):
        # DRY_RUN exercises the whole pipeline (all AI calls included) but writes
        # nothing: no article row, no Storage upload, no scrape_stats, no
        # IndexNow ping. It is the only way to check a new source's translation
        # quality before it can publish. Enable with -s DRY_RUN=1.
        self._dry_run = spider.settings.getbool("DRY_RUN", False)
        if self._dry_run:
            logger.warning("DRY RUN: no DB writes, no image uploads, no IndexNow")
        try:
            self._supabase = _get_supabase()
            rows = self._supabase.table("articles").select("slug,featured_image_url").execute()
            self._known_slugs = {r["slug"] for r in (rows.data or [])}
            # Retired slugs are still live URLs: they 308 to the article that
            # used to own them. A new article must never claim one, or it would
            # silently hijack another article's incoming links. See rule 22.
            retired = (
                self._supabase.table("article_slug_history").select("old_slug").execute()
            )
            self._known_slugs |= {r["old_slug"] for r in (retired.data or [])}
            self._used_image_urls = {
                r["featured_image_url"]
                for r in (rows.data or [])
                if r.get("featured_image_url")
            }
        except Exception as exc:
            logger.warning("Supabase unavailable in StoragePipeline: %s", exc)

    def process_item(self, item, spider):
        from scraper.classify import classify_article
        from scraper.hashtags import assign_hashtags
        from scraper.authors import assign_author
        from scraper.storage import upload_image, upload_featured_image, rewrite_image_srcs

        source = item.get("source", "")
        title = item.get("title_original", "")
        content = item.get("content_original", "")
        source_url = item.get("source_url", "")

        # AI classification: nav_tab_slug, sector_slugs, region_slug
        nav_tab_slug, sector_slugs, region_slug = classify_article(title, content)
        item["nav_tab_slug"] = nav_tab_slug
        item["sector_slugs"] = sector_slugs
        item["region_slug"] = region_slug

        # Hashtag assignment
        hashtags = assign_hashtags(title, content)
        if not hashtags:
            logger.warning("assign_hashtags returned empty for %s", source_url)
        item["hashtags"] = hashtags

        # Named site author (deterministic: region/nav_tab/country-hashtag lookup;
        # continent-wide bucket spread across all 7 writers via source_url hash)
        author_slug = assign_author(region_slug, nav_tab_slug, hashtags, source_url)
        item["author_slug"] = author_slug

        # Parse published_at
        try:
            published_at = datetime.fromisoformat(
                str(item.get("published_at", "")).replace("Z", "+00:00")
            )
        except (ValueError, TypeError):
            published_at = datetime.now(timezone.utc)

        article_id = str(uuid.uuid4())

        # Upload featured image (+ responsive WebP variants → image_srcset)
        if self._dry_run:
            # Uploading would write to Supabase Storage, which a dry run must not
            # touch. Skipping it also skips the Pexels fallback below.
            featured_image_url, image_srcset = item.get("featured_image_source_url") or "", None
        else:
            featured_image_url, image_srcset = upload_featured_image(
                image_url=item.get("featured_image_source_url") or "",
                article_id=article_id,
                source=source,
                published_at=published_at,
            )

        # Image fallback when source had no image
        if not featured_image_url and not self._dry_run:
            try:
                from scraper.image_fallback import fetch_fallback_image
                fallback_url = fetch_fallback_image(
                    title_original=title,
                    region_slug=region_slug,
                    exclude_urls=self._used_image_urls,
                    source_lang=item.get("source_lang") or "en",
                )
                if fallback_url:
                    featured_image_url, image_srcset = upload_featured_image(
                        image_url=fallback_url,
                        article_id=article_id,
                        source="pexels",
                        published_at=published_at,
                    )
                    if featured_image_url:
                        self._used_image_urls.add(featured_image_url)
            except Exception as exc:
                logger.error("Image fallback failed for %s: %s", source_url, exc)

        # Compute featured image fingerprint for dedup against inline images
        featured_fp = ""
        featured_src_url = item.get("featured_image_source_url") or ""
        if featured_src_url:
            from scraper.storage import compute_image_fingerprint
            featured_fp = compute_image_fingerprint(featured_src_url)

        def _is_featured_duplicate(src: str) -> bool:
            if not featured_fp or not src:
                return False
            from scraper.storage import compute_image_fingerprint as _cfp
            fp = _cfp(src)
            return bool(fp and fp == featured_fp)

        # Build full image URL list: inline imgs already in content HTML + explicit inline_image_urls
        url_map: dict[str, str] = {}
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(content, "lxml")
        for i, img in enumerate(soup.find_all("img")):
            src = img.get("src", "")
            if src and src not in url_map:
                if _is_featured_duplicate(src):
                    logger.info("Skipping visually identical inline image: %s", src[:80])
                    continue
                new_url = upload_image(
                    image_url=src,
                    article_id=f"{article_id}-img{i}",
                    source=source,
                    published_at=published_at,
                )
                if new_url:
                    url_map[src] = new_url

        # Also upload explicit inline_image_urls (handles lazy-loaded images not in content HTML)
        for j, src in enumerate(item.get("inline_image_urls") or []):
            if src and src not in url_map:
                if _is_featured_duplicate(src):
                    logger.info("Skipping visually identical inline image: %s", src[:80])
                    continue
                new_url = upload_image(
                    image_url=src,
                    article_id=f"{article_id}-body{j}",
                    source=source,
                    published_at=published_at,
                )
                if new_url:
                    url_map[src] = new_url

        if url_map:
            item["content_original"] = rewrite_image_srcs(item.get("content_original", ""), url_map)
            content_tr = item.get("content_tr") or ""
            if content_tr:
                item["content_tr"] = rewrite_image_srcs(content_tr, url_map)

            # Inject images that are not yet present in content_tr as <figure> blocks
            content_tr_final = item.get("content_tr") or item.get("content_original") or ""
            figures = ""
            for orig_src, supabase_url in url_map.items():
                if supabase_url and supabase_url not in content_tr_final:
                    figures += f'<figure><img src="{supabase_url}" alt="" /></figure>\n'
            if figures:
                if item.get("content_tr"):
                    item["content_tr"] = item["content_tr"] + "\n" + figures
                if item.get("content_original"):
                    item["content_original"] = item["content_original"] + "\n" + figures

        # Fallback: if pipeline translation didn't run (score < 5 or API failure),
        # keep the None values so retranslate.py can pick them up later
        if item.get("title_tr") is None:
            item["title_tr"] = None  # explicit None, not original English
        if item.get("excerpt_tr") is None:
            item["excerpt_tr"] = None
        if item.get("content_tr") is None:
            item["content_tr"] = None

        content_hash = _md5(item.get("content_original") or "")
        slug_source = item.get("title_tr") or title
        slug = _make_slug(slug_source, self._known_slugs)
        self._known_slugs.add(slug)

        row = {
            "id": article_id,
            "source": source,
            "source_url": source_url,
            "slug": slug,
            "title_original": title,
            "title_tr": item.get("title_tr"),
            "excerpt_original": item.get("excerpt_original"),
            "excerpt_tr": item.get("excerpt_tr"),
            "content_original": item.get("content_original"),
            "content_tr": item.get("content_tr"),
            "content_hash": content_hash,
            "featured_image_url": featured_image_url,
            "image_srcset": image_srcset,
            "featured_image_source_url": item.get("featured_image_source_url"),
            "image_credit": item.get("image_credit"),
            "image_alt_tr": item.get("image_alt_tr") or item.get("title_tr"),
            "nav_tab_slug": nav_tab_slug,
            "sector_slugs": sector_slugs,
            "region_slug": region_slug,
            "author_slug": author_slug,
            "hashtags": hashtags,
            "meta_description_tr": item.get("meta_description_tr"),
            "score": item.get("score"),
            "turkey_filter_result": item.get("turkey_filter_result"),
            "is_suppressed": False,
            "published_at": published_at.isoformat(),
            "author_original": item.get("author_original"),
            "view_count": 0,
            "is_featured": False,
        }

        if self._dry_run:
            logger.info(
                "[DRY RUN] would insert: source=%s lang=%s score=%s slug=%s "
                "nav=%s region=%s h2=%d words=%d\n  title_tr: %s\n  meta: %s",
                row["source"], item.get("source_lang"), row["score"], row["slug"],
                row["nav_tab_slug"], row["region_slug"],
                (row.get("content_tr") or "").count("<h2"),
                len(re.sub(r"<[^>]+>", " ", row.get("content_tr") or "").split()),
                row["title_tr"], row["meta_description_tr"],
            )
            return item

        if self._supabase is None:
            logger.warning("Supabase not available, skipping DB write for %s", source_url)
            return item

        try:
            if item.get("is_update"):
                update_fields = {k: v for k, v in row.items()
                                 if k not in ("id", "view_count", "is_featured",
                                              "slug",
                                              "title_tr", "excerpt_tr", "content_tr")}
                # "slug" is excluded because a slug is PERMANENT once assigned:
                # it is the public URL. _make_slug() only appends a random hex
                # suffix on collision, and on this path the article always
                # collides with its own stored slug, so re-computing it flipped
                # the URL on every content update (base -> base-a1b2c3 -> base
                # -> ...), 404-ing every previously indexed/shared link.
                # Do NOT bump updated_at here: this path never changes the
                # Turkish content readers see (title_tr/excerpt_tr/content_tr
                # are excluded above). updated_at means "visible content
                # changed" and is only set by admin content edits, keeping
                # sitemap lastmod, JSON-LD dateModified and the UI
                # "Güncellendi:" badge honest.
                (
                    self._supabase.table("articles")
                    .update(update_fields)
                    .eq("source_url", source_url)
                    .execute()
                )
                logger.info("Updated article: %s", source_url)
            else:
                slug = self._insert_with_slug_retry(row, source_url)
                logger.info("Inserted article: %s", source_url)
                self._new_slugs.append(slug)
            _stats_inc(source, "published")
            if item.get("score"):
                _stats_inc(source, "scores", int(item["score"]))
        except Exception as exc:
            # Distinguish the failure modes: a bare "DB write failed" line made a
            # forgotten migration look identical to a transient network blip, and
            # both looked like a successful run in CI.
            if _is_source_constraint_violation(exc):
                logger.error(
                    "CONSTRAINT VIOLATION: source %r is not allowed by "
                    "articles_source_check. The migration adding it has not been "
                    "applied, so NOTHING from this source will be published. %s",
                    source, source_url,
                )
            else:
                logger.error("DB write failed for %s: %s", source_url, exc)

        return item

    def _insert_with_slug_retry(self, row: dict, source_url: str) -> str:
        """Insert, recovering from a slug collision with a concurrent spider.

        `_known_slugs` is a per-process snapshot taken in open_spider, so two
        spiders running in parallel (run.sh, and the CI matrix) can compute the
        same slug from the same Turkish title. Without this the loser's insert
        raised, was swallowed by the caller's `except`, and the article vanished
        after its full AI cost had already been paid.

        Recomputing the slug is safe *here* and only here: this is the insert
        path, where _make_slug's ordinal suffix ("-2", "-3") is exactly the
        wanted behaviour. CLAUDE.md rule 22 forbids recomputing a slug on the
        UPDATE path, which is a different branch and is untouched.
        """
        for attempt in range(3):
            try:
                self._supabase.table("articles").insert(row).execute()
                return row["slug"]
            except Exception as exc:
                if not _is_slug_conflict(exc) or attempt == 2:
                    raise
                taken = row["slug"]
                self._known_slugs.add(taken)
                row["slug"] = _make_slug(row.get("title_tr") or row["title_original"],
                                         self._known_slugs)
                self._known_slugs.add(row["slug"])
                logger.error(
                    "SLUG COLLISION: %r already taken (concurrent spider), "
                    "retrying as %r for %s", taken, row["slug"], source_url,
                )
        return row["slug"]

    def close_spider(self, spider):
        if self._dry_run:
            logger.warning("DRY RUN complete: nothing was written")
            return
        _ping_indexnow(self._new_slugs)
        if self._supabase is None or not _run_stats:
            return
        from zoneinfo import ZoneInfo
        now_istanbul = datetime.now(ZoneInfo("Europe/Istanbul"))
        today = now_istanbul.date().isoformat()
        run_slot = "sabah" if now_istanbul.hour < 12 else "oglen"
        for src, counts in _run_stats.items():
            scores = counts.get("scores", [])
            avg_score = round(sum(scores) / len(scores), 1) if scores else None

            # A source that scrapes plenty but publishes nothing is the signature
            # of a site change (paywall tightened, body selector dead), and it is
            # otherwise invisible: the run stays green and the daily report just
            # shows a quiet zero. business_daily_africa is the likeliest to hit
            # this, since it serves full text while marking articles Subscription.
            if counts["total_scraped"] > 5 and counts["published"] == 0:
                logger.error(
                    "YIELD FLOOR: %s scraped %d articles and published 0 "
                    "(duplicate=%d low_score=%d min_content=%d turkey_filter=%d). "
                    "Check whether the site changed.",
                    src, counts["total_scraped"], counts["dropped_duplicate"],
                    counts["dropped_low_score"], counts["dropped_min_content"],
                    counts["dropped_turkey_filter"],
                )
            row = {
                "run_date": today,
                "source": src,
                "run_slot": run_slot,
                "total_scraped": counts["total_scraped"],
                "dropped_duplicate": counts["dropped_duplicate"],
                "dropped_low_score": counts["dropped_low_score"],
                "dropped_min_content": counts["dropped_min_content"],
                "dropped_turkey_filter": counts["dropped_turkey_filter"],
                "published": counts["published"],
                "avg_score": avg_score,
            }
            try:
                self._supabase.table("scrape_stats").upsert(
                    row, on_conflict="run_date,source,run_slot"
                ).execute()
                logger.info("Scrape stats saved: %s", row)
            except Exception as exc:
                logger.error("Failed to write scrape_stats for %s: %s", src, exc)
