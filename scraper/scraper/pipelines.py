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


def _make_slug(title: str, existing_slugs: set[str]) -> str:
    # First apply Turkish character map, then normalize all remaining accented
    # characters (e.g. é→e, ã→a, ô→o) via Unicode decomposition.
    base = title.translate(_TR_CHARS)
    base = unicodedata.normalize("NFKD", base)
    base = base.encode("ascii", "ignore").decode("ascii")
    base = base.lower()
    base = re.sub(r"[^\w\s-]", "", base)
    base = re.sub(r"[\s_]+", "-", base).strip("-")
    base = base[:80]
    slug = base
    if slug in existing_slugs:
        slug = f"{base}-{uuid.uuid4().hex[:6]}"
    return slug


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

        # AI semantic duplicate check (new articles only)
        if not item.get("is_update"):
            from scraper.duplicate import is_duplicate
            title = item.get("title_original", "")
            excerpt = item.get("excerpt_original", "")
            if is_duplicate(title, excerpt, self._supabase):
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


MIN_AFRICA_SCORE = 5


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
    """Drop articles whose original content is too short (< 80 English words).

    Runs after ScorePipeline so only scored-5+ items reach this check, and
    before TranslationPipeline so we do not waste AI translation cost on
    stub or paywalled articles.
    """

    _THRESHOLD = 80

    def process_item(self, item, spider):
        source_url = item.get("source_url", "")
        raw = item.get("content_original") or ""
        text = re.sub(r"<[^>]+>", " ", raw)
        word_count = len(re.findall(r'\w+', text))
        if word_count < self._THRESHOLD:
            logger.warning(
                "Dropping thin content (%d words): %s", word_count, source_url
            )
            _stats_inc(item.get("source", ""), "dropped_low_score")
            raise DropItem(
                f"Thin content ({word_count} words < {self._THRESHOLD}): {source_url}"
            )
        return item


class TranslationPipeline:
    """Translate English content to Turkish for articles scoring MIN_AFRICA_SCORE or higher.
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
        )
        if result is None:
            logger.warning("Translation failed for %s", item.get("source_url", ""))
            item["title_tr"] = None
            item["excerpt_tr"] = None
            item["content_tr"] = None
            return item

        title_tr, excerpt_tr, content_tr = result

        # Guard: if the "translated" body is still predominantly English, the
        # translation silently failed. Drop the item rather than publish English.
        if content_tr and _is_english(content_tr):
            logger.warning("Translation produced English output, dropping: %s", item.get("source_url", ""))
            raise DropItem(f"Translation failed (English output): {item.get('source_url', '')}")

        item["title_tr"] = title_tr
        item["excerpt_tr"] = excerpt_tr
        # Strip datelines and summary labels immediately after translation,
        # before the AI clean step, as a guaranteed Python-level safety net.
        item["content_tr"] = _strip_datelines(content_tr) if content_tr else content_tr
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


class QualityCheckPipeline:
    """Post-translation quality checks that drop or warn on bad output.

    1. Truncated list articles — content ends with "şunlardır:" meaning the
       list/table data was not scraped (JS-rendered or paywalled). Drop these.
    2. Missing H2 heading — log a warning so the issue is trackable.
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

        if not re.search(r'<h[23]', content_tr, re.I):
            logger.warning("Article published without H2/H3 heading: %s", item.get("source_url", ""))

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


class StoragePipeline:
    def __init__(self):
        self._supabase = None
        self._known_slugs: set[str] = set()
        self._used_image_urls: set[str] = set()

    def open_spider(self, spider):
        try:
            self._supabase = _get_supabase()
            rows = self._supabase.table("articles").select("slug,featured_image_url").execute()
            self._known_slugs = {r["slug"] for r in (rows.data or [])}
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
        from scraper.storage import upload_image, rewrite_image_srcs

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

        # Parse published_at
        try:
            published_at = datetime.fromisoformat(
                str(item.get("published_at", "")).replace("Z", "+00:00")
            )
        except (ValueError, TypeError):
            published_at = datetime.now(timezone.utc)

        article_id = str(uuid.uuid4())

        # Upload featured image
        featured_image_url = upload_image(
            image_url=item.get("featured_image_source_url") or "",
            article_id=article_id,
            source=source,
            published_at=published_at,
        )

        # Image fallback when source had no image
        if not featured_image_url:
            try:
                from scraper.image_fallback import fetch_fallback_image
                fallback_url = fetch_fallback_image(
                    title_original=title,
                    region_slug=region_slug,
                    exclude_urls=self._used_image_urls,
                )
                if fallback_url:
                    featured_image_url = upload_image(
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
            "featured_image_source_url": item.get("featured_image_source_url"),
            "image_credit": item.get("image_credit"),
            "nav_tab_slug": nav_tab_slug,
            "sector_slugs": sector_slugs,
            "region_slug": region_slug,
            "hashtags": hashtags,
            "score": item.get("score"),
            "turkey_filter_result": item.get("turkey_filter_result"),
            "is_suppressed": False,
            "published_at": published_at.isoformat(),
            "author_original": item.get("author_original"),
            "view_count": 0,
            "is_featured": False,
        }

        if self._supabase is None:
            logger.warning("Supabase not available, skipping DB write for %s", source_url)
            return item

        try:
            if item.get("is_update"):
                update_fields = {k: v for k, v in row.items()
                                 if k not in ("id", "view_count", "is_featured",
                                              "title_tr", "excerpt_tr", "content_tr")}
                update_fields["updated_at"] = datetime.now(timezone.utc).isoformat()
                (
                    self._supabase.table("articles")
                    .update(update_fields)
                    .eq("source_url", source_url)
                    .execute()
                )
                logger.info("Updated article: %s", source_url)
            else:
                self._supabase.table("articles").insert(row).execute()
                logger.info("Inserted article: %s", source_url)
            _stats_inc(source, "published")
            if item.get("score"):
                _stats_inc(source, "scores", int(item["score"]))
        except Exception as exc:
            logger.error("DB write failed for %s: %s", source_url, exc)

        return item

    def close_spider(self, spider):
        if self._supabase is None or not _run_stats:
            return
        from zoneinfo import ZoneInfo
        now_istanbul = datetime.now(ZoneInfo("Europe/Istanbul"))
        today = now_istanbul.date().isoformat()
        run_slot = "sabah" if now_istanbul.hour < 12 else "oglen"
        for src, counts in _run_stats.items():
            scores = counts.get("scores", [])
            avg_score = round(sum(scores) / len(scores), 1) if scores else None
            row = {
                "run_date": today,
                "source": src,
                "run_slot": run_slot,
                "total_scraped": counts["total_scraped"],
                "dropped_duplicate": counts["dropped_duplicate"],
                "dropped_low_score": counts["dropped_low_score"],
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
