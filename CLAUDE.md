# Africa Business News (afrika_website) — Claude Code System File

> This file is the main reference Claude Code automatically reads in every session.
> For details, see the `prompts/`, `docs/`, and `data/` folders.

## 1. Project Summary

A Turkish-language, Africa-focused business and economy news platform. News is pulled daily from 15 sources in English, French and Portuguese. Items are translated to Turkish via AI, scored (1-10), classified, tagged with 8-15 hashtags, and published.

**Sources are declared in exactly one place: `scraper/scraper/sources.py`** (slug, Turkish label, homepage, acquisition strategy, language, cutoff window, selectors). The spiders, `extractors.py`, `translate.py`, `run.sh` and the CI matrix all read from it; `frontend/lib/sources.ts` mirrors it and `frontend/scripts/check-sources.mjs` fails the build on drift. Adding a source means a registry entry, a 4-line spider stub, and a migration widening the `articles_source_check` CHECK.

- **Update times:** 07:00 TST + 13:00 TST (n8n cron, twice daily)
- **Fetch window:** Last 24 hours
- **Duplicate check window:** Last 48 hours
- **Publication threshold:** Score 6+
- **News count limit:** NONE (filtering creates a natural ceiling)
- **Daily report:** Email to the configured report address (REPORT_EMAIL env var in n8n) at 09:00 (sabah) and 15:00 (oglen) TST

## 3. Pipeline

Tarama hattı, model yapılandırması ve günlük raporlama `scraper/CLAUDE.md` dosyasında; `scraper/` altında çalışırken otomatik yüklenir.

## 5. Operational Rules (STRICT)

| Rule | Description |
|------|-------------|
| **No em dashes** | `—`, `–`, `--` are forbidden anywhere. Replace with comma or period. ESLint rule is mandatory. |
| **Language policy** | Everything user-facing is in Turkish. Code, commits, comments, and logs are in English. |
| **600-word limit** | Translated body is max 600 words (excluding source link). 1000+ word originals are summarized. |
| **Source link required** | Every news item must include a source via `<p class="source-link">`. |
| **8-15 hashtags required** | Between 8 and 15, drawn from the canonical list (`docs/hashtags.md`). |
| **Score 6+ is published** | 1-5 are dropped (not translated, not classified). |
| **Conventional Commits** | `type(scope): description` format is mandatory. |
| **HTML sanitization** | Clean with `bleach`, then re-sanitize before render with `sanitize-html`. |
| **TypeScript types** | Type definitions are required for every API endpoint and function. |
| **Tailwind classes** | Always use Tailwind classes instead of inline styles. |
| **Supabase RLS** | Policy review on every schema change. |

## 6. Navigation

**UI tabs (5 visible):** firsatlar, pazarlar-ekonomi, ticaret-ihracat, sektorler, ulkeler, diger (hidden)

> `etkinlikler-fuarlar` was removed from the UI nav, footer, and `/haberler` filters (June 2026) but remains a valid classifier nav_tab value — the AI still classifies articles into it.
> `turk-is-dunyasi` was also removed from the UI nav, footer, and `/haberler` filters (June 2026) but remains a valid classifier nav_tab value.

**Classifier nav_tab values (8):** firsatlar, pazarlar-ekonomi, ticaret-ihracat, sektorler, turk-is-dunyasi, etkinlikler-fuarlar, ulkeler, diger

| Slug | Description |
|------|-------------|
| firsatlar | Investment opportunities, tenders, deals |
| pazarlar-ekonomi | Macro data, stock markets, inflation, GDP, foreign exchange |
| ticaret-ihracat | Trade agreements, export/import statistics, customs |
| sektorler | Sector analysis, industry trends, company news |
| turk-is-dunyasi | Turkish companies, joint ventures, government initiatives (classifier only, removed from UI nav) |
| etkinlikler-fuarlar | Conferences, fairs, expos, summits |
| ulkeler | Country profiles, political developments, bilateral relations |
| diger | General Africa news that does not fit the categories above |

## 9. Target Audience (4 Segments)

1. **Contractors & Infrastructure Investors:** Turkish construction, engineering, logistics (railways, highways, ports, energy)
2. **Exporting SMEs:** Textile, food, chemicals, machinery manufacturers
3. **Defense & Security Professionals:** UAVs, military training, security consulting
4. **Diplomats & Researchers:** Foreign affairs, think tanks, academics

## 10. Auth & E-posta

Kimlik doğrulama, e-posta ve Google OAuth yapılandırması `frontend/CLAUDE.md` dosyasında; `frontend/` altında çalışırken otomatik yüklenir.

## 12. Dosya Referansları

Dosya haritası `docs/file-map.md` dosyasına taşındı, her oturumda yüklenmesi gerekmiyordu.

## 15. Değişiklik Günlüğü

Düzeltilen hatalar ve eklenen özelliklerin kaydı `docs/CHANGELOG.md` dosyasında. Kalıcı dersler §14'teki kurallara terfi ettirildi.

## 14. Claude Code Working Rules

1. **CLAUDE.md is updated before any new feature is built.**
2. **TypeScript types are defined for every API endpoint and function.**
3. **Tailwind classes are always used instead of inline styles.**
4. **Supabase RLS policies are reviewed on every schema change.**
5. **Em dash usage is strictly forbidden; this is auto-checked in PR review.**
6. **Before changing any prompt, the relevant `prompts/*.md` file is read and updated.**
7. **Prompts are written in English (the model performs better in English).**
8. **Output languages:** Prompts in English, outputs in Turkish.
9. **Conventional Commits:** `feat(scrape): add CNBC Africa source`, `fix(score): handle null summary`
10. **Translation cache:** Skip if the same news item arrives again, keyed by `content_hash`.
11. **Never use `next/image`:** Vercel Hobby plan has a 1,000 image/month quota on `/_next/image`. All image tags must be plain `<img>` with direct Supabase Storage URLs. ESLint enforces this.
12. **Deployments go from the repo root:** Run `vercel deploy --prod --yes` from the repo root (`~/dev/afrika website/`, moved out of iCloud-synced `~/Desktop` in July 2026), not from `frontend/`. The `frontend` Vercel project is a ghost — `www.afrikahaberleri.tr` is served by the `afrika-website` project linked to the repo root. **Apex redirect:** `afrikahaberleri.tr` → `www` must be a **permanent 308** (set via the project domain's `redirectStatusCode`, Vercel API/dashboard, NOT code). If `redirectStatusCode` is left unset Vercel defaults to a temporary **307**, which weakens the canonical signal — re-set it to 308 if the apex domain is ever removed/re-added.
13. **Article detail page featured image uses `alt={image_alt_tr ?? ""}`:** In `app/haber/[slug]/page.tsx`, use `alt={article.image_alt_tr ?? ""}`. If `image_alt_tr` exists it provides a real image description; if null, falls back to empty string (decorative). Do NOT use `alt={title_tr}` — it causes the title to appear twice when users copy-paste page content since the `<h1>` is adjacent. `ArticleCard`, `HeroSection`, and `SimilarArticlesPanel` use `alt={image_alt_tr ?? title_tr ?? ""}` since those components have no adjacent H1.
14. **Every new page must declare a canonical URL or noindex.** Use `buildCanonical()` from `frontend/lib/seo.ts` in metadata (`alternates.canonical`); paginated listings also use `parsePageParam()` + `titleWithPage()`. Pages that must stay out of search set `robots: { index: false }` instead. Enforced by `frontend/scripts/check-canonical.mjs`, which runs as `prebuild` and FAILS the build if a public page has neither. Page titles must NOT append "| Afrika Haberleri" (the root layout template adds it); the same prebuild guard fails the build if a page title contains it. The homepage/default title is the keyword-rich "Afrika Haberleri: Afrika Ekonomi, Ticaret ve Yatırım Haberleri" (set in `app/page.tsx` and `app/layout.tsx` title.default); do not reduce it to the bare brand name.
15. **Never remove the googleBot directives in `app/layout.tsx`.** The root layout robots block carries `max-image-preview: large` (required for Google Discover large image cards), `max-snippet: -1`, and `max-video-preview: -1`. It is site-wide and page-level, so new articles, new pages, and manually uploaded images are covered automatically; nothing per-image is needed. **AEO/GEO guardrail:** `max-snippet: -1` means UNLIMITED snippet (permissive) — never change it to a positive/zero limit, and never add `nosnippet`, `noarchive`, or `notranslate` anywhere; they directly shrink AI-answer (AI Overviews / Copilot / ChatGPT) eligibility. Likewise never add an AI-crawler `Disallow` (GPTBot, OAI-SearchBot, ClaudeBot, Claude-SearchBot, PerplexityBot, bingbot, Google-Extended, CCBot, Applebot, MistralAI-User, etc.) to `robots.txt`; the single `User-agent: *` intentionally allows them all (only /admin, /api/, /panel, /arama are disallowed, none of which are content).
16. **Never read `cookies()` in the root layout tree or use `no-store` in `createBuildClient`.** Both silently force EVERY page into dynamic rendering and disable ISR/SSG site-wide (this happened: TTFB was 2-5s until July 2026). Header auth state is client-side (`components/layout/HeaderAuth.tsx` + `lib/auth/useIsLoggedIn.ts`); `createBuildClient` fetches use `next: { revalidate: 1800 }`; middleware exits early for visitors without a Supabase auth cookie. After any change to layout/middleware/queries, verify `.next/prerender-manifest.json` still lists ~546 `/haber/*` routes.
17. **`updated_at` on articles means "reader-visible content changed".** Only the admin articles PATCH sets it (when title_tr/excerpt_tr/content_tr/meta_description_tr/featured_image_url change). The scraper's is_update path must NOT bump it (it never touches Turkish content). JSON-LD `dateModified`, sitemap lastmod, and the article page "Güncellendi:" badge all derive from it via `resolveModifiedDate()` in `lib/seo.ts`. Never fake-freshen dates; Google detects and discounts inconsistent date signals.
18. **Auth pages are noindex, never robots-disallowed; both sitemaps live in robots.txt.** `/giris`, `/kayit`, `/panel`, `/sifremi-unuttum`, `/sifre-sifirla` each set `robots: { index: false, follow: false }` in their page metadata (NOT `alternates.canonical`, which would signal indexable). They must **NOT** be listed under `Disallow` in `public/robots.txt`: a robots block would stop the crawler from ever reading the `noindex` tag, leaving the URL stuck in the index. Only truly non-HTML or private paths are disallowed there (`/admin`, `/api/`, `/panel`, `/arama`). `robots.txt` lists **both** sitemaps (`sitemap.xml` + `news-sitemap.xml`). **Search Console submission** is separate from robots.txt discovery: submit each sitemap once under the **`afrikahaberleri.tr` Domain property** (Alan adı mülkü) — the full URL `https://www.afrikahaberleri.tr/news-sitemap.xml` is accepted (Domain properties cover all subdomains, so the www 307 redirect is not a problem). A fresh submission may briefly show "Getirilemedi"/"Couldn't fetch" in the list view while the detail drill-down already reads "Site haritası başarıyla işlendi"; the list self-corrects. (Submitted & processed 2026-07-05: 7 pages discovered.)
19. **Every `<img>` carries explicit `width`/`height`, and LCP heroes are preloaded.** The `next/image` ban stands (rule 11), so CLS/LCP are handled manually. Two invariants: (a) every public `<img>` has `width`+`height` attributes matching its wrapper's aspect-ratio box (article/blog hero + blog detail `aspect-video` → 1600×900; `ArticleCard` `aspect-[16/10]` → 1600×1000; HeroSection lead `aspect-[4/5]` → 1200×1500; secondary → 1200×900; `SimilarArticlesPanel` → 300×130; blog list → 160×112). Values encode the BOX ratio, not each image's real pixels — `object-cover` crops, and the box already reserves space, so this only satisfies Lighthouse's explicit-dimensions audit and guards against CSS-fails-to-load CLS. (b) The above-the-fold hero image on the homepage (`HeroSection`), article detail (`app/haber/[slug]`), and blog detail (`app/blog/[slug]`) is preloaded via `ReactDOM.preload(url, { as: "image", fetchPriority: "high" })` called in the server component render, paired with `fetchPriority="high"` on the `<img>`. Do NOT preload lazy/below-fold images. Featured images are served as responsive WebP (see rule 20); the `<img>` keeps the JPEG `src` as fallback.
20. **Responsive WebP variants live in `articles.image_srcset` (migration 028).** The `next/image` ban (rule 11) means we pre-generate variants ourselves. `scraper/scraper/storage.py` `upload_featured_image()` produces WebP at a ladder of widths (400/800/1200, capped at source width, NEVER upscaled) alongside the canonical JPEG, and returns a ready-made srcset string ("`<url> 400w, <url> 800w, ...`") stored in `articles.image_srcset`. Naming: `<stem>-<w>.webp` next to `<stem>.jpg`. The string is self-describing, so the frontend needs no width metadata: every featured `<img>` drops `srcSet={article.image_srcset ?? undefined}` + a `sizes` attr, keeping `src={featured_image_url}` (JPEG) as the universal fallback; the three LCP heroes also pass `imageSrcSet`/`imageSizes` to `ReactDOM.preload`. `search_articles_v2` `RETURNS SETOF articles`, so search results get `image_srcset` for free. Inline body images and admin-uploaded blog/article images stay JPEG-only (no variants). Backfill for pre-028 rows: `scraper/backfill_webp_variants.py` (idempotent — only touches `image_srcset IS NULL`). Measured saving: same-resolution WebP ~25% smaller than JPEG; the 400w mobile rung ~55-60% smaller than the 1200px JPEG a phone used to download.
21. **One publication threshold (`MIN_PUBLISHED_SCORE = 6`) and full sitemap coverage.** The score gate used to drift: article page rendered `>= 4`, listings/search `>= 5`, sitemap/RSS `>= 6`, so score 4-5 articles could be linked but missing from the sitemap. Everything now imports `MIN_PUBLISHED_SCORE` from `lib/constants.ts` (article page render — null score also 404s — listings, search-suggest, sitemap, news-sitemap, RSS) and the search RPCs `search_articles_v2`/`count_search_articles_v2` filter `score >= 6` (migration 029). Never reintroduce a bare `.gte("score", N)` literal; use the constant. `sitemap.ts` now covers every indexable route type: static + `/haber/*` + `/bolge/*` + `/sektorler/*` + published `/blog/*` + `/hashtag/*` (gated at >= 3 articles so thin tag pages stay out). When adding a new indexable route type, add it to `sitemap.ts` in the same commit.
22. **A slug is permanent once assigned; never recompute it on update.** `StoragePipeline` used to include `slug` in the `is_update` write. `_make_slug()` appends a random 6-hex suffix only on collision, and on re-scrape an article always collides with its own stored slug, so every content update flipped the public URL (`base` → `base-a1b2c3` → `base` → …) and 404-ed the previously indexed/shared link. 120 of 840 rows carried a hex suffix while **zero** bases were shared by two articles, proving the suffixes came from self-collision. `slug` now sits alongside `title_tr`/`excerpt_tr`/`content_tr` in the update-exclusion set, and `scraper/backfill_slugs.py` was **deleted** (it re-slugged every article from `title_tr` using a stale `_make_slug()` without the NFKD/ASCII pass and seeded its used-slug set empty, so one run would have moved every URL on the site; it is also how two rows ended up with `â` in the slug). Never add a slug rewrite to any backfill or to the admin PATCH.

    Four layers now defend article URLs:
    - **DB records every slug a row has ever had.** `article_slug_history` + the `trg_articles_record_slug_change` trigger (migration 032) capture the outgoing slug on any `UPDATE OF slug`, including a manual Supabase dashboard edit. `resolveLegacyArticleSlug()` consults it first.
    - **DB refuses an unusable slug.** `articles_slug_url_safe` CHECK (`^[a-z0-9][a-z0-9-]*$`, migration 032). An accented slug can never be matched by an incoming request, so it 404s while still being listed in `sitemap.xml`.
    - **Read-time rescue for slugs moved before the history table existed.** `resolveLegacyArticleSlug()` (`lib/queries/articles.ts`) percent-decodes, strips accents, drops the hex suffix, then matches `slug.eq.<base>` OR `slug.like.<base>-______` (exactly six wildcard chars, so a longer unrelated slug sharing the prefix cannot match). `app/haber/[slug]` `permanentRedirect`s (308) instead of `notFound()`. Unknown slugs still 404.
    - **Slugs are clean; a collision gets an ordinal, not a hex blob.** All 120 hex-suffixed slugs were renamed to their plain base in July 2026 (the trigger recorded each old slug, so they 308 permanently). `_make_slug()` now returns `<base>`, then `<base>-2`, `<base>-3`, … on a genuine title collision, with random hex only as an unreachable last resort, and strips a trailing dash left by the 80-char truncation. `StoragePipeline.open_spider` seeds `_known_slugs` from **both** `articles.slug` and `article_slug_history.old_slug`, so a new article can never claim a retired URL and hijack another article's redirects.
    - **No live article may be answered 410.** `lib/deleted-slugs.ts` hard-410s permanently deleted articles via middleware. **A Search Console 404 is NOT evidence of deletion** — far more often it is a moved slug. 12 of that list's original 64 entries pointed at still-live articles (10 old slugs of live articles, 2 accented slugs) and the 410 destroyed their ranking irreversibly. `scripts/check-deleted-slugs.mjs` runs as `prebuild` and FAILS the build if any entry resolves to a live article, including one that returns to the DB via a later re-scrape. Only list slugs whose article is genuinely gone.
23. **Thin and paginated listing surfaces are `noindex, follow` — never offered for indexing.** Every listing paginates, so `?sayfa=2..N` produced ~986 crawlable URLs against 838 articles, and 152 hashtag pages carrying 1-2 articles were excluded from `sitemap.xml` yet still fully indexable. Google crawled all of them and filed them under "Taranan, ancak dizine eklenmedi" (~972 URLs in Search Console). Forcing them INTO the index is the wrong goal: they are duplicative slices of articles that are each already indexed individually. Two helpers enforce it. `paginatedRobots(page)` in `lib/seo.ts` returns `{robots:{index:false, follow:true}}` for page 2+ and is spread **after** `canonicalMeta()` in every paginated listing's `generateMetadata` (13 pages, plus the homepage's inline equivalent in `app/page.tsx`). `HASHTAG_MIN_ARTICLES` in `lib/constants.ts` drives **both** the `sitemap.ts` gate and the hashtag page's robots tag, so those two signals can never drift apart again. `follow` is deliberate: crawl paths stay intact, and discovery never depends on them anyway because every published article is in `sitemap.xml`. When adding a new paginated listing, spread `paginatedRobots(page)` in the same commit.
24. **Every path that produces a Turkish body goes through `finalize_content_tr()`.** The quality rules used to live only inside the Scrapy pipeline, so a backfill that wrote `content_tr` straight to Supabase skipped `ContentCleanPipeline` and `QualityCheckPipeline` entirely: `backfill_refetch_body.py --retranslate` published 81 CNBC articles with **no `<h2>` at all**. `scraper/scraper/translate.py` now owns the gate. `finalize_content_tr(title_tr, content_tr)` runs clean, then the truncation test, then H2 enforcement, and returns `(content, None)` or `(None, reason)`; `ensure_h2()`, `h2_count()` and `is_truncated_body()` hold the thresholds so they are never re-implemented as ad-hoc regexes. **Any new script that regenerates an article body must call it** (`backfill_refetch_body.py`, `backfill_truncated.py`, `backfill_add_h2.py` all do). Related: the H2 rule is `MIN_H2 = 2`, not "at least one". Checking only for a single heading let 151 of 851 articles publish with one H2 and read as a different format from the rest of the site; the pipeline now remediates anything below 2 and still hard-drops at 0. Corpus after the repair: 18 articles with no H2 (all under 3 paragraphs, nothing to anchor a heading to), 2 with one, average 3.04.
