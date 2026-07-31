# Dosya Haritası

> `CLAUDE.md` §12'den taşındı. Her oturumda yüklenmesi gerekmiyordu; buradan
> okunabilir. Yeni bir dosya eklerken buradaki satırı da güncelleyin.

## 12. File References

| File | Purpose |
|------|---------|
| `prompts/translate.md` | Translation prompt (journalistic Turkish, HTML preservation, strips wire service datelines) |
| `prompts/clean.md` | Content cleaning prompt (removes off-topic promos + wire service datelines from translated body) |
| `prompts/add_h2.md` | H2-remediation prompt. Input: title + numbered paragraph list. Output: JSON `[{before, h2}]` — 2-3 question-format headings + 1-based paragraph position. The model never sees/returns the body, so content is preserved. Used by `add_h2_headings()` (see H2 enforcement in §15). |
| `scraper/backfill_add_h2.py` | Idempotent backfill adding `<h2>` to score-6+ articles lacking them. `python backfill_add_h2.py [--dry-run] [--limit N] [--workers N]`. Updates `content_tr` only (never `updated_at`). |
| `prompts/turkey_filter.md` | Negative Turkey framing detection (SUPPRESS/PUBLISH) |
| `prompts/classify.md` | nav_tab + sector + region JSON classification |
| `prompts/hashtags.md` | 8-15 hashtag assignment rules |
| `docs/hashtags.md` | Canonical hashtag list (800+ tags) |
| `docs/sectors.md` | Active sector slugs + merged/deleted slug map |
| `docs/tenders.md` | Tenders module spec (schema, routes, AI pipeline, UI) |
| `n8n/workflows/daily_scrape.json` | Scraper cron trigger (07:00 + 13:00 Istanbul) |
| `n8n/workflows/daily_report.json` | Report email workflow (09:00 + 15:00 Istanbul) |

| `frontend/components/auth/AuthListener.tsx` | Client component in root layout; listens for PASSWORD_RECOVERY event and redirects to /sifre-sifirla |
| `frontend/components/auth/ForgotPasswordForm.tsx` | Forgot password form (browser-side Supabase call) |
| `frontend/components/auth/ResetPasswordForm.tsx` | New password form (server action) |
| `frontend/components/auth/GoogleSignInButton.tsx` | Google OAuth button — navigates to /api/auth/google (custom proxy, not Supabase OAuth) |
| `frontend/app/api/auth/google/route.ts` | Initiates Google OAuth; sets state cookie, redirects to Google |
| `frontend/app/api/auth/google/callback/route.ts` | Handles Google callback; exchanges code for id_token, calls signInWithIdToken, redirects |
| `frontend/app/sifremi-unuttum/page.tsx` | Forgot password page |
| `frontend/app/sifre-sifirla/page.tsx` | Reset password page (requires active session) |
| `frontend/app/hashtag/[tag]/page.tsx` | Hashtag listing page — shows all articles containing a given hashtag, paginated |
| `frontend/components/ui/SimilarArticlesPanel.tsx` | Sidebar component showing up to 5 similar articles scored by shared hashtags/sectors |
| `frontend/components/ui/NextArticleCard.tsx` + `getNextArticle()` | "Sonraki Haber" card at the end of the article body. Server component, zero client JS. `getNextArticle()` (`lib/queries/articles.ts`) is a **keyset** walk on `(published_at, id)` to the next older published article, not an OFFSET: `published_at` is not unique (one scrape batch can carry identical timestamps) so a bare `.lt()` would silently skip ties. It filters `DELETED_HABER_SLUGS` because middleware's 410 branch only matches `/haber/` paths, so nothing stops a query from linking to a 410. Deliberately complements the sidebar rather than replacing it: the sidebar offers *related* articles, the card offers the *next in the feed*, so the same article never appears twice. Renders nothing on the oldest article. |
| `frontend/components/ui/ShareButtons.tsx` | Article share row (meta line under title): WhatsApp, X, LinkedIn, Telegram + copy-link. Client component, inline SVG icons. NO native share button and NO Instagram (web share URLs for Instagram do not exist). |
| `frontend/lib/labels.ts` | `resolveCategory()` — maps nav_tab+sector+hashtags to a display label; never shows "Sektörler", "Ülkeler", "Türk İş Dünyası", or "Etkinlikler & Fuarlar" as badge text |
| `frontend/lib/seo.ts` | Canonical URL helpers: `buildCanonical()` (absolute URL, whitelisted params ulke/bolge/kategori/sayfa, sayfa=1 normalized to clean URL), `parsePageParam()`, `titleWithPage()` ("Sayfa N" title suffix), `resolveModifiedDate()` (real dateModified: updated_at only when >10 min after scraped_at, else published_at). Used by every listing page's generateMetadata. Page titles must NOT include "| Afrika Haberleri" (root layout template adds it). Homepage ?sayfa>1 variants are noindex,follow because Next 14.2 strips the query from canonical on the root path. |
| `frontend/app/arama/page.tsx` | Full-text search page with category + date filters; URL params: q, sayfa, kategori, tarih |
| `frontend/app/api/search-suggest/route.ts` | Autocomplete API — returns sector matches, hashtag matches (via `search_hashtags` RPC), then article title matches; typed `SuggestItem[]` response |
| `frontend/lib/search_synonyms.ts` | Synonym expansion + Turkish char normalization for search queries; `buildTsQuery()` builds pg tsquery string |
| `frontend/lib/queries/search.ts` | `searchArticles()` — calls `search_articles_v2` + `count_search_articles_v2` Supabase RPCs |
| `frontend/components/layout/HeaderSearch.tsx` | Desktop search bar (right side of header) with autocomplete dropdown and submit button |
| `supabase/migrations/021_search_v2.sql` | pg_trgm extension + `search_articles_v2` + `count_search_articles_v2` RPCs |
| `supabase/migrations/022_image_alt_tr.sql` | Adds `image_alt_tr TEXT` column; backfills existing rows with `title_tr` |
| `scraper/scraper/items.py` | Scrapy item fields — includes `image_alt_source` (raw alt in the source language) , `image_alt_tr` (translated Turkish, max 10 words) and `source_lang` |
| `scraper/scraper/sources.py` | **Source registry — the single source of truth.** Slug, Turkish label, homepage, acquisition strategy (Rss / NewsSitemap / HtmlIndex), language, cutoff days, body/alt/date selectors. `python3 -m scraper.sources --slugs-json` feeds the CI matrix. |
| `scraper/scraper/spiders/base_news_spider.py` | Shared article parsing for every news spider: date, title, author, image, alt, credit, body, excerpt, `ArticleItem`. A source-specific quirk overrides one `extract_*` method. |
| `scraper/scraper/spiders/strategies/` | `rss.py`, `sitemap.py`, `html_index.py` — the three ways article URLs are discovered. A new source is usually a 4-line stub subclassing one of these. |
| `scraper/tools/inspect_items.py` | Report card for a spider's raw output (`-s ITEM_PIPELINES='{}'`). No AI cost. First gate for a new source. |
| `scraper/tools/check_robots.py` | Verifies our UA may still fetch each source's entry URLs, and surfaces Cloudflare `Content-Signal` lines. |
| `frontend/lib/sources.ts` | Mirror of the Python registry for the frontend (labels + homepages). `frontend/scripts/check-sources.mjs` fails the build if the two drift. |
| `scraper/scraper/translate.py` | `translate_image_alt()` — separate Gemini call (max 80 tokens) for image alt; NEVER mixed with article body translation |
| `scraper/backfill_image_alt.py` | One-time backfill: fetches source pages, extracts real alt text, translates and updates DB |
| `scraper/scraper/storage.py` | Image pipeline. `upload_featured_image()` uploads the canonical JPEG (max 1200px, q80) AND responsive WebP variants (`_variant_widths` ladder, `<stem>-<w>.webp`), returning `(jpeg_url, srcset)`. `upload_image()` (inline/legacy) stays JPEG-only. See rule 20. |
| `scraper/backfill_webp_variants.py` | Idempotent backfill: generates WebP variants + writes `image_srcset` for articles where it is NULL. `python backfill_webp_variants.py [--dry-run] [--limit N] [--workers N]`. |
| `scraper/backfill_meta_description.py` | One-time backfill: generates meta_description_tr for articles where it is NULL (4 parallel workers) |
| `frontend/app/admin/` | Admin panel — protected by server-side middleware (ADMIN_EMAIL env var check). Never expose credentials in code or docs. |
| `frontend/app/admin/haberler/[id]/page.tsx` | Article edit page: title_tr, excerpt_tr, content_tr (Tiptap), meta_description_tr, featured_image_url (upload or URL) |
| `frontend/app/admin/blog/` | Blog editor — list, new post (`/yeni`), edit (`/[id]`). Tiptap rich text. Status: draft / published. |
| `frontend/app/api/admin/upload/route.ts` | Image upload to Supabase Storage `article-images` bucket; max 5MB; JPEG/PNG/WebP/GIF |
| `frontend/app/api/admin/blog/route.ts` | Blog CRUD (GET/POST/PATCH/DELETE); service role auth; auto-generates slug from title |
| `frontend/app/blog/page.tsx` | Public blog listing (published posts only, revalidate 1800) |
| `frontend/app/blog/[slug]/page.tsx` | Public blog post detail with sanitized content |
| `frontend/lib/ga-data.ts` | `fetchGaOverview()` — fetches active users, sessions, page views, top pages/countries via GA4 Data API (JWT service account auth) |
| `frontend/app/admin/analytics/page.tsx` | Real GA4 data panel: 4 metric cards, 7-day bar chart, top pages, top countries. Revalidates hourly. |
| `prompts/metadescription.md` | Meta description generation prompt — 145-158 chars, Turkish, no em dashes, no proper noun apostrophes. `generate_meta_description()` enforces this in code: targets 135-160 (retries once), accepts 125-170 as fallback, else None (was a loose 80-200). |
| `scraper/backfill_meta_length.py` | Backfill: regenerates out-of-band (`<125` / `>170`) meta descriptions and caps legacy `title_tr` > 120 chars. Updates content only, never `updated_at` (rule 17). |
| `frontend/app/opengraph-image.png` | Site-wide default OG/Twitter share image (1200x630, navy brand card). Served automatically by Next file convention; pages/articles with their own `openGraph.images` override it. Use `images: ... : undefined` (never `[]`) so the fallback applies. Root layout sets og site_name/locale/type + twitter summary_large_image; article/blog pages set og:type=article + published/modified times inline (child openGraph replaces the parent object wholesale). |
| `frontend/app/rss.xml/route.ts` | RSS 2.0 feed: latest 50 published articles (score>=6, not suppressed) with title, meta description, pubDate (RFC 822), media:content image. Revalidate 1800. Powers Google Discover "Follow", URL discovery, aggregators and AI systems. The feed discovery `<link rel="alternate" type="application/rss+xml">` lives in the root layout `<head>` JSX (NOT metadata alternates, which child canonicals would wipe). |
| `frontend/app/news-sitemap.xml/route.ts` | Google News sitemap: articles from the **last 48h only** (score>=6, not suppressed, title_tr not null), max 1000, `news:` namespace. Revalidate 3600. Submitted separately in Search Console (see rule 18). The 48h window is intentional per Google News guidelines, so it lists only ~5-15 URLs at any time. |
| `frontend/public/robots.txt` | Static robots. `Allow: /` plus `Disallow: /admin`, `/api/`, `/panel`, `/arama`. Lists BOTH sitemaps (`sitemap.xml` + `news-sitemap.xml`). Auth pages (`/giris`, `/kayit`, `/sifremi-unuttum`, `/sifre-sifirla`) are deliberately NOT disallowed here (see rule 18). |
| `frontend/app/sitemap.ts` | Full XML sitemap: static routes (home, nav-tab listings, `/haberler`, `/blog`) + `/haber/*` (score>=6) + `/bolge/*` (all regions) + `/sektorler/*` (all sectors) + `/hashtag/*` (only tags with >= `HASHTAG_SITEMAP_MIN_ARTICLES` = 3 articles, to skip thin pages) + published `/blog/*`. Revalidate 3600. See rule 21. |
| `frontend/lib/constants.ts` | `MIN_PUBLISHED_SCORE = 6` — the single publication-threshold constant used by every reader-facing gate (rule 21). |
| `frontend/components/analytics/AiReferralTracker.tsx` | GEO/AEO measurement: client component in root layout that detects visits from AI assistants (ChatGPT/Perplexity/Gemini/Copilot/Claude…) via referrer or `utm_source` and fires a GA4 `ai_referral` event (`ai_source` param), once per source per session. View in GA4 Reports → Events. Bing Webmaster Tools verification is env-driven: set `BING_SITE_VERIFICATION` in Vercel to emit the `msvalidate.01` meta (or verify by importing from Google Search Console). |
| `frontend/components/ui/Breadcrumb.tsx` | Reusable breadcrumb (UI `<nav>` + BreadcrumbList JSON-LD). Auto-prepends "Ana Sayfa"; pass every level incl. the current page as the last item (shown as text, still in schema). Used on nav-tab listings, `/bolge/*`, `/sektorler/*`, `/hashtag/*`, `/blog`, `/blog/*`. The article page has its own inline breadcrumb. |
| `supabase/migrations/032_article_slug_history.sql` | `article_slug_history` (old_slug PK → article_id) + `trg_articles_record_slug_change` trigger recording every slug an article has ever had, plus the `articles_slug_url_safe` CHECK. Powers the 308 rescue of moved URLs. See rule 22. |
| `frontend/lib/deleted-slugs.ts` + `frontend/scripts/check-deleted-slugs.mjs` | Slugs answered 410 Gone by `middleware.ts` (genuinely deleted articles only) and the `prebuild` guard that fails the build if any of them resolves to a live article. Never add an entry from a Search Console 404 alone. See rule 22. |
| `frontend/lib/indexnow.ts` + `scraper/scraper/pipelines.py` `_ping_indexnow` | IndexNow notifier (key `b821579c…`, file at `public/<key>.txt`, verified live). Scraper pings newly INSERTED articles (not updates); the frontend `pingIndexNow()` covers admin content edits (`/haber/<slug>`, only when live + content changed) and published blog posts (`/blog/<slug>`). Fans out to Bing/Yandex/Seznam/Naver. **Do NOT use the Google Indexing API** (limited to JobPosting/Livestream) — Google discovery is the news-sitemap + RSS. |
| `frontend/lib/seo.ts` `canonicalMeta()` / `pageOpenGraph()` | `canonicalMeta(path, params)` returns `{ alternates.canonical, openGraph }` with `og:url` = the canonical, for standard "website" pages. Root layout's `openGraph.url:"/"` is inherited wholesale otherwise, so listing/static pages must spread `...canonicalMeta(...)` to get a self-referential og:url. Articles/blog set their own richer OG and do NOT use this. |
| Homepage JSON-LD (`app/page.tsx`) | `NewsMediaOrganization` (+id `#organization`, logo, email) and `WebSite` (publisher ref) schemas, homepage only per Google guidance. NO SearchAction (sitelinks search box retired Nov 2024). `sameAs` links the brand to its LinkedIn company page (`linkedin.com/company/afrika-haberleri`); append more URLs (X, Instagram, Facebook) as accounts are created. Blog posts carry `BlogPosting` JSON-LD (`app/blog/[slug]/page.tsx`). |
| **Authors (yazar kadrosu)** — `supabase/migrations/031_authors.sql` | `authors` table (slug PK, name, role_tr, region_label_tr, bio_tr, avatar_url nullable/unused, sort_order) seeded with the 7 site writers; `articles.author_slug` FK. Public-read RLS (same pattern as sectors/regions). 7 authors: `elodie-kouassi` (Frankofon Batı Afrika), `amina-bello` (Anglofon Batı Afrika), `meriem-el-amrani` (Kuzey Afrika), `abdirahman-warsame` (Doğu Afrika), `aicha-mahamat-issa` (Orta Afrika), `yusuf-emre-karaca` (Güney Afrika + kıta geneli default), `merve-nur-aydin` (Türkiye-Afrika). |
| `scraper/scraper/authors.py` `assign_author(region_slug, nav_tab_slug, hashtags)` | Deterministic author assignment (NO AI). Priority: (1) nav_tab `turk-is-dunyasi` → Merve (overrides region); (2) kuzey/dogu/orta/guney → the regional writer; (3) `bati-afrika` → francophone country/bloc hashtag → Elodie, else (anglophone or no match) → Amina; (4) `afrika`/null/unknown → Yusuf Emre. Called inline in `StoragePipeline.process_item` (after classify, sets `item["author_slug"]` + `row`). Same fn used by `scraper/backfill_author.py` (`--dry-run` logs per-author distribution; writes only `author_slug`, never `updated_at` per rule 17; `--all` re-assigns everything). |
| `frontend/lib/queries/authors.ts` + `frontend/app/yazarlar/` | `getAuthors()` / `getAuthorBySlug()`; `getArticlesByAuthor()` in `queries/articles.ts` (mirrors `getArticlesByHashtag`). `/yazarlar` lists the 7 writers; `/yazarlar/[slug]` = bio + that author's articles (ArticleGrid + Pagination) + `ProfilePage`/`Person` JSON-LD. Article detail (`app/haber/[slug]`) shows a clickable byline linking to the author page and sets JSON-LD `author` = `Person` (falls back to `Organization`/`author_original` when no author). Admin editor has an author `<select>` (author_slug is in the PATCH whitelist but NOT contentFields, so changing it never bumps `updated_at`). Footer + MobileMenu + `sitemap.ts` include `/yazarlar`. No avatars (design decision). |

