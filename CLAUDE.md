# Africa Business News (afrika_website) — Claude Code System File

> This file is the main reference Claude Code automatically reads in every session.
> For details, see the `prompts/`, `docs/`, and `data/` folders.

## 1. Project Summary

A Turkish-language, Africa-focused business and economy news platform. News is pulled daily from English sources (The Conversation Africa, Africa Report, CNBC Africa, AA Africa, Business Insider Africa). Items are translated to Turkish via AI, scored (1-10), classified, tagged with 8-15 hashtags, and published.

- **Update times:** 07:00 TST + 13:00 TST (n8n cron, twice daily)
- **Fetch window:** Last 24 hours
- **Duplicate check window:** Last 48 hours
- **Publication threshold:** Score 6+
- **News count limit:** NONE (filtering creates a natural ceiling)
- **Daily report:** Email to the configured report address (REPORT_EMAIL env var in n8n) at 09:00 (sabah) and 15:00 (oglen) TST

## 2. Tech Stack

- **Frontend:** Next.js 14 (App Router), Tailwind CSS, TypeScript
- **Backend:** Supabase (PostgreSQL + Auth + Storage + RLS)
- **Scraping:** Scrapy (5 sources in parallel)
- **Automation:** GitHub Actions native cron (n8n account closed; scrape.yml runs independently at 07:00 + 13:00 TST via UTC cron)
- **AI:** OpenRouter API (Gemini 2.5 Flash-Lite + GPT-5 Nano)
- **Deploy:** Vercel
- **CI/CD:** GitHub Actions

## 3. Pipeline Flow (07:00 TST + 13:00 TST)

Runs twice daily. The 13:00 run picks up articles published after the morning run; duplicates from the first run are caught by DeduplicationPipeline.

```
07:00 / 13:00  GitHub Actions scrape.yml triggered by native cron
+00:01         DeduplicationPipeline  (source_url + content_hash + AI semantic, last 48h)
+00:05         TurkeyFilterPipeline   (GPT-5 Nano, SUPPRESS items are dropped)
+00:08         ScorePipeline          (Gemini 2.5 Flash-Lite, score < 6 are dropped)
+00:15         MinContentPipeline     (drops articles < 80 words in content_original)
+00:18         TranslatePipeline      (only score 6+, 600 words, SEO+GEO+AEO, human-readable source names)
+00:22         ContentCleanPipeline   (Gemini 2.5 Flash-Lite, removes off-topic promos + datelines from content_tr)
+00:24         QualityCheckPipeline   (drops truncated list articles ending with "şunlardır:"; warns on missing H2)
+00:25         ClassifyPipeline       (nav_tab + sector + region JSON)
+00:28         HashtagsPipeline       (8-15 hashtags from canonical list)
+00:30         Written to Supabase + scrape_stats row upserted (run_slot: sabah | oglen)
09:00 / 15:00  n8n report workflow queries scrape_stats, sends HTML email
```

**Cost-driven ordering:** The cheapest steps (duplicate, turkey_filter, score) run first. Expensive translation is applied only to score 6+ items. 40-60% cost savings.

## 4. Model Configuration

| Step | Model | Temperature | Max Tokens | What Gets Processed |
|------|-------|-------------|------------|---------------------|
| score | Gemini 2.5 Flash-Lite | 0.1 | 150 | All news |
| turkey_filter | GPT-5 Nano | 0.0 | 50 | All news |
| translate | Gemini 2.5 Flash-Lite | 0.2 | 4096 | Score 6+ only |
| clean_content | Gemini 2.5 Flash-Lite | 0.0 | 4096 | Score 6+ only (after translate) |
| classify | GPT-5 Nano | 0.0 | 200 | Score 6+ only |
| hashtags | Gemini 2.5 Flash-Lite | 0.2 | 300 | Score 6+ only |
| image_alt | Gemini 2.5 Flash-Lite | 0.1 | 80 | Score 6+ only (inside TranslatePipeline, separate call) |

**Why Flash-Lite (not Flash):** Flash is $0.30/M input, Flash-Lite is $0.10/M input. 84% savings on the translation step with negligible quality difference.

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

## 7. Regions (6)

| Slug | Countries |
|------|-----------|
| afrika | Continent-wide or multi-region content |
| kuzey-afrika | Algeria, Egypt, Libya, Morocco, Tunisia, Mauritania, Sudan |
| bati-afrika | Nigeria, Ghana, Côte d'Ivoire, Senegal, Mali, Burkina Faso, Niger, Benin, Togo, Sierra Leone, Liberia, Guinea, Guinea-Bissau, Gambia, Cape Verde |
| orta-afrika | Cameroon, Chad, Central African Republic, DR Congo, Republic of Congo, Gabon, Equatorial Guinea, Sao Tome |
| dogu-afrika | Ethiopia, Kenya, Somalia, Tanzania, Uganda, Rwanda, Burundi, Djibouti, Eritrea, South Sudan, Seychelles, Comoros, Mauritius, Madagascar |
| guney-afrika | South Africa, Botswana, Namibia, Zambia, Zimbabwe, Mozambique, Malawi, Lesotho, Eswatini, Angola |

## 8. Sectors (26)

Active slugs (source of truth: `docs/sectors.md` and `prompts/classify.md`):

insaat-muteahhitlik, enerji, savunma-sanayi, madencilik, tekstil-hazir-giyim, kozmetik-hijyen, demir-celik-sanayi, tarim-gida, otomotiv, ambalaj-geri-donusum, bankacilik-finans, beyaz-esya-ev-aletleri, cimento-insaat-malzemeleri, ev-tekstili-hali, gayrimenkul-konut, havacilik-sivil-havacilik, hvac-r, kimya-petrokimya, lojistik-tasimaci, makine-yedek-parca, mobilya-dekorasyon, perakende-e-ticaret, saglik-saglik-turizmi, teknoloji-yazilim, turizm-otelcilik, diger-sektor

Notes: telecom/fintech → teknoloji-yazilim; pharma/medical → saglik-saglik-turizmi; renewable energy → enerji; events → etkinlikler-fuarlar nav_tab.

## 9. Target Audience (4 Segments)

1. **Contractors & Infrastructure Investors:** Turkish construction, engineering, logistics (railways, highways, ports, energy)
2. **Exporting SMEs:** Textile, food, chemicals, machinery manufacturers
3. **Defense & Security Professionals:** UAVs, military training, security consulting
4. **Diplomats & Researchers:** Foreign affairs, think tanks, academics

## 10. Auth & Email Configuration

### Password Reset Flow
- `/sifremi-unuttum` — forgot password page (calls `supabase.auth.resetPasswordForEmail` **client-side** via browser client)
- `/sifre-sifirla` — new password page (server component, checks session; redirects to `/giris` on success)
- `/auth/callback` — handles both `code` (PKCE) and `token_hash` (OTP) flows; reads `next` query param for redirect target
- `AuthListener` in root layout — catches `PASSWORD_RECOVERY` auth event and redirects to `/sifre-sifirla`

**Important:** `resetPasswordForEmail` must be called from the **browser client** (`lib/supabase/client.ts`), NOT from a server action. Calling it server-side breaks the PKCE cookie flow.

### Email Delivery (Resend)
- **Provider:** Resend SMTP via `smtp.resend.com:465`
- **Sender:** `noreply@afrikahaberleri.tr`
- **Sender name:** Afrika Haberleri
- **Domain:** `afrikahaberleri.tr` verified in Resend (DKIM configured)
- **SPF/DMARC:** Not yet added to Natro DNS (pending)
- **Supabase site_url:** `https://www.afrikahaberleri.tr`
- **Recovery email template:** Updated to Turkish HTML with inline styles and `{{ .ConfirmationURL }}` button

### Google OAuth (Custom Proxy)
- **Flow:** Client → `/api/auth/google` → Google → `/api/auth/google/callback` → `supabase.auth.signInWithIdToken` → `/panel`
- **Why custom proxy:** Supabase free plan uses `*.supabase.co` as redirect_uri; custom proxy routes the callback through `afrikahaberleri.tr` so Google shows "Afrika Haberleri" in the account picker instead of the Supabase domain.
- **Env vars:** `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (set in Vercel production)
- **Google Cloud Console:** Authorized redirect URI: `https://www.afrikahaberleri.tr/api/auth/google/callback`
- **Supabase Dashboard:** Authentication → Providers → Google enabled with same Client ID + Secret
- **CSRF protection:** `google_oauth_state` cookie (UUID, httpOnly, 5 min TTL) validated on callback
- Button component: `frontend/components/auth/GoogleSignInButton.tsx` — used in LoginForm and RegisterForm

### Session Persistence
- Middleware matcher covers **all non-static routes** (not just `/panel/*`) so Supabase access tokens are refreshed on every page load via refresh token rotation.

## 12. File References

| File | Purpose |
|------|---------|
| `prompts/translate.md` | Translation prompt (journalistic Turkish, HTML preservation, strips wire service datelines) |
| `prompts/clean.md` | Content cleaning prompt (removes off-topic promos + wire service datelines from translated body) |
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
| `frontend/lib/labels.ts` | `resolveCategory()` — maps nav_tab+sector+hashtags to a display label; never shows "Sektörler", "Ülkeler", "Türk İş Dünyası", or "Etkinlikler & Fuarlar" as badge text |
| `frontend/lib/seo.ts` | Canonical URL helpers: `buildCanonical()` (absolute URL, whitelisted params ulke/bolge/kategori/sayfa, sayfa=1 normalized to clean URL), `parsePageParam()`, `titleWithPage()` ("Sayfa N" title suffix), `resolveModifiedDate()` (real dateModified: updated_at only when >10 min after scraped_at, else published_at). Used by every listing page's generateMetadata. Page titles must NOT include "| Afrika Haberleri" (root layout template adds it). Homepage ?sayfa>1 variants are noindex,follow because Next 14.2 strips the query from canonical on the root path. |
| `frontend/app/arama/page.tsx` | Full-text search page with category + date filters; URL params: q, sayfa, kategori, tarih |
| `frontend/app/api/search-suggest/route.ts` | Autocomplete API — returns sector matches, hashtag matches (via `search_hashtags` RPC), then article title matches; typed `SuggestItem[]` response |
| `frontend/lib/search_synonyms.ts` | Synonym expansion + Turkish char normalization for search queries; `buildTsQuery()` builds pg tsquery string |
| `frontend/lib/queries/search.ts` | `searchArticles()` — calls `search_articles_v2` + `count_search_articles_v2` Supabase RPCs |
| `frontend/components/layout/HeaderSearch.tsx` | Desktop search bar (right side of header) with autocomplete dropdown and submit button |
| `supabase/migrations/021_search_v2.sql` | pg_trgm extension + `search_articles_v2` + `count_search_articles_v2` RPCs |
| `supabase/migrations/022_image_alt_tr.sql` | Adds `image_alt_tr TEXT` column; backfills existing rows with `title_tr` |
| `scraper/scraper/items.py` | Scrapy item fields — includes `image_alt_en` (raw English from source) and `image_alt_tr` (translated Turkish, max 10 words) |
| `scraper/scraper/translate.py` | `translate_image_alt()` — separate Gemini call (max 80 tokens) for image alt; NEVER mixed with article body translation |
| `scraper/backfill_image_alt.py` | One-time backfill: fetches source pages, extracts real alt text, translates and updates DB |
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
| `prompts/metadescription.md` | Meta description generation prompt — 140-160 chars, Turkish, no em dashes, no proper noun apostrophes |

## 13. Daily Reporting

After each pipeline run, `StoragePipeline.close_spider` writes per-source stats to the `scrape_stats` Supabase table. A separate n8n workflow queries this table and emails an HTML report.

**`scrape_stats` table columns:** `run_date`, `source`, `run_slot` (`sabah` | `oglen`), `total_scraped`, `dropped_duplicate`, `dropped_low_score`, `dropped_turkey_filter`, `published`, `avg_score`

**Unique constraint:** `(run_date, source, run_slot)` — one row per source per run per day.

**n8n workflow IDs:** stored privately — not documented here.

## 16. Features Added & Security Fixes (July 2026)

| Feature / Fix | Details |
|-----|---------|
| **Admin panel** | `/admin` — protected by Next.js middleware (server-side, ADMIN_EMAIL env var). Sub-pages: Dashboard, Haberler, Blog, Analitik. Uses service role key for DB writes. Access restricted to one email; details stored only in Vercel env vars, never in code or docs. |
| **Article editor** | `/admin/haberler/[id]` — edit title, excerpt, content (Tiptap HTML editor), meta description (char counter), featured image (file upload to Supabase Storage or URL). PATCH API allows all these fields. |
| **Blog system** | `blog_posts` table (migration 024): id, slug, title, content, excerpt, featured_image_url, status (draft/published), published_at. Admin editor at `/admin/blog`. Public pages at `/blog` and `/blog/[slug]`. |
| **Image upload API** | `POST /api/admin/upload` — uploads to `article-images` bucket, max 5MB, returns public URL. Used by both article and blog editors. |
| **Google Analytics GA4** | Measurement ID: `G-TWW2BKCGWR`, Property ID: `544012567`. Installed via `@next/third-parties` in root layout. Data API credentials in Vercel env vars: `GA_PROPERTY_ID`, `GA_SERVICE_ACCOUNT_JSON`. |
| **Real-time analytics panel** | `/admin/analytics` — fetches live GA4 data (active users, sessions, page views, avg session duration, top pages, top countries, daily chart). `fetchGaOverview()` in `frontend/lib/ga-data.ts` uses JWT service account via `google-auth-library`. Revalidates hourly. |
| **Search: sector + hashtag suggestions** | `search-suggest` API now returns `SuggestItem[]` with `type: "sector" \| "hashtag" \| "article"`. Sectors from DB, hashtags via `search_hashtags` RPC (migration 025/026). Categories appear first in dropdown with amber icon. |
| **Search hashtags RPC fixed** | Migration 026 fixes `search_hashtags` to use `unnest` correctly — returns only hashtags that match the query, not all tags from matching articles. |
| **Dashboard: top scored this week** | Admin dashboard shows top 10 highest-scored articles from last 7 days (rolling window). Score-colored badge (green ≥9, amber ≥7). |
| **Dashboard: scrape stats expanded** | Scrape stats table now shows `dropped_duplicate`, `dropped_low_score` (red), `dropped_turkey_filter` columns in addition to existing fields. |
| **Meta descriptions pipeline** | `MetaDescriptionPipeline` (priority 260) generates 140-160 char Turkish meta descriptions via Gemini 2.5 Flash-Lite. Stored in `meta_description_tr` column (migration 023). Backfill script updated 520/526 existing articles. |
| **Security hardening** | Migration 027: dropped `temp_anon_insert_seeding` policy (allowed anonymous article inserts); enabled RLS on `video_log`; fixed `search_path` on all SQL functions; switched `search_articles_v2`, `count_search_articles_v2`, `search_hashtags` from SECURITY DEFINER to SECURITY INVOKER. |
| **KVKK / Çerez pages** | `/kvkk` and `/cerez-politikasi` static pages added. |
| **Editorial cleanup** | Removed AI/automation references from `/editoryal-politika` and `/hakkimizda`. |
| **Google OAuth on register page** | `GoogleSignInButton` accepts optional `label` prop; register page shows "Google ile Kayıt Ol". |

## 15. Known Bugs Fixed & Features Added (June 2026)

| Fix / Feature | Details |
|-----|---------|
| **Accented chars in slugs** | `_make_slug` in `scraper/pipelines.py` now applies NFKD Unicode normalization after the Turkish char map. Prevents 404s for titles containing Lomé, São Tomé, Abidján, etc. |
| **Özet: label in articles** | `translate.md` AEO closing rule updated: closing paragraph must be a plain `<p>` with no bold prefix. `clean.md` and `_SUMMARY_LABEL_RE` regex strip it as safety nets. |
| **Favicon** | `frontend/app/favicon.ico`, `icon.png`, `apple-icon.png` added. Next.js App Router auto-serves them. |
| **Turkish chars in auth UI** | `lib/auth/actions.ts` and `app/panel/page.tsx` corrected (Hatali→Hatalı, Cikis→Çıkış, etc.). |
| **Wire service datelines** | `_DATELINE_RE` regex in `pipelines.py` catches all formats: `CITY (AGENCY)`, `CITY, Date (AGENCY)`, multi-word agencies like `(Thomson Reuters Vakfı)`. Applied in `TranslatePipeline` output and `ContentCleanPipeline` input. `translate.md` + `clean.md` also updated. |
| **Untranslated English content** | `_is_english()` in `TranslatePipeline` raises `DropItem` when translated output is still predominantly English (stopword ratio > 8%). |
| **Thin/paywalled articles** | `MinContentPipeline` (priority 175, between Score and Translation) drops articles with fewer than 80 words in `content_original`. Catches CNBC Africa paywall stubs. |
| **CNBC Africa body extraction** | Spider now tries `div.article-body`, `div.post-content`, `div.entry-content`, `article p` selectors before falling back to `og:description`. |
| **Missing H2 headings** | `translate.md` H2/H3 rule marked MANDATORY. `QualityCheckPipeline` (priority 235) logs a warning when published article has no `<h2>`. |
| **Truncated list articles** | `QualityCheckPipeline` drops articles whose translated body ends with "şunlardır:" — these are JS-rendered list/table pages that Scrapy cannot access. |
| **Raw source key in source-link** | `translate.py` `_SOURCE_LABELS` map converts raw keys (`business_insider`, `cnbc_africa`, etc.) to display names before passing to translate prompt. Prevents "Kaynak: business_insider" in article bodies. |
| **Table rendering in articles** | `sanitize-html` ALLOWED_TAGS in `frontend/lib/sanitize.ts` was missing `table`, `thead`, `tbody`, `tr`, `th`, `td`. Added. Navy/white table styles added to `globals.css`. |
| **Image cache-control** | Supabase Storage was serving images with `Cache-Control: no-cache` (default). `scraper/scraper/storage.py` now uploads with `public, max-age=31536000, immutable`. All 482 existing images were retroactively re-uploaded. |
| **"En Çok Okunanlar" numbers** | Ranking numbers (1-5) removed from the sidebar list in `HeroSection.tsx`. |
| **Category badge "Sektörler"** | `resolveCategory()` in `frontend/lib/labels.ts` now shows the specific sector name (e.g. "Enerji") for `sektorler` nav_tab instead of the generic "Sektörler" label. |
| **Category badge generic labels** | `resolveCategory()` extended: `ulkeler`, `turk-is-dunyasi`, and `etkinlikler-fuarlar` nav_tabs also resolve to sector name or best hashtag instead of their generic label. Badge is hidden if neither is available. |
| **Clickable hashtags** | Hashtag chips in article detail page are now `<a>` links to `/hashtag/[tag]`. New page `frontend/app/hashtag/[tag]/page.tsx` lists all articles sharing that tag, paginated, with `revalidate = 1800`. Query: `.contains("hashtags", [tag])`. |
| **Similar articles sidebar** | Article detail page (`app/haber/[slug]/page.tsx`) has a 2-column layout on desktop: article on left, "Benzer Haberler" sidebar on right (300px, sticky). Mobile: sidebar appears below the article. Similarity scoring: +2 per common hashtag, +3 per common sector, +1 same nav_tab. Tiebreaker: most recent first. Top 5 from last 60 days. Sidebar starts at the same vertical position as the featured image. Component: `frontend/components/ui/SimilarArticlesPanel.tsx`. |
| **Nav cleanup (UI-only tabs)** | `etkinlikler-fuarlar` and `turk-is-dunyasi` removed from `/haberler` category filters (`app/haberler/page.tsx`) and from the footer (`components/layout/Footer.tsx`). These slugs remain valid classifier values. |
| **İhaleler module removed** | Entire tenders module deleted: DB table dropped, all routes/components/queries removed from frontend. `/ihaleler` URLs no longer exist. `docs/tenders.md` retained for reference only. |
| **Score threshold raised to 6** | `MIN_AFRICA_SCORE` in `scraper/pipelines.py` changed from 5 to 6. Articles scoring 1-5 are now dropped before translation. All existing score-5 articles removed from DB. |
| **Full-text search** | `/arama` page with weighted pg_trgm search (`search_articles_v2` RPC), synonym expansion (50+ groups TR/EN), typo tolerance via `word_similarity()`. Category + date filter chips. |
| **Header search autocomplete** | `HeaderSearch.tsx` shows dropdown with up to 6 article suggestions as user types (250ms debounce). Turkish char normalization so "mis" matches "Mısır". Arrow key nav, ESC closes. Query stays in input after submit. |
| **Header layout** | Search bar and login button moved to RIGHT side of header. Logo stays left. Submit arrow button added inside search input for mouse users. |
| **Google OAuth (custom proxy)** | Google sign-in via `/api/auth/google` proxy — account picker shows "Afrika Haberleri" instead of Supabase domain. No Pro plan needed. Button on both /giris and /kayit pages. |
| **Image alt text (`image_alt_tr`)** | New `image_alt_tr` DB column (migration 022). All 5 spiders capture `image_alt_en` from source HTML. `translate_image_alt()` in `translate.py` translates it to Turkish (max 10 words) as a **separate API call** — never mixed with article body. `StoragePipeline` falls back to `title_tr` if alt unavailable so the field is never NULL. Article detail page shows visible Turkish caption below featured image via `<figcaption>`. `ArticleCard`, `HeroSection`, `SimilarArticlesPanel` use `image_alt_tr ?? title_tr ?? ""`. |
| **CNBC Africa figcaption** | CNBC Africa is Next.js — `<img alt>` is empty in server HTML (client-side rendered). Fix: spider reads `figcaption.wp-element-caption::text` instead. `_strip_caption_credit()` regex removes agency credits (REUTERS, AFP, Getty, etc.) from figcaption text, keeping only the visual description. Both spider and `backfill_image_alt.py` use this logic. |

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
12. **Deployments go from the repo root:** Run `vercel --prod` from `/Desktop/afrika website/` (not from `frontend/`). The `frontend` Vercel project is a ghost — `www.afrikahaberleri.tr` is served by the `afrika-website` project which is linked to the repo root.
13. **Article detail page featured image uses `alt={image_alt_tr ?? ""}`:** In `app/haber/[slug]/page.tsx`, use `alt={article.image_alt_tr ?? ""}`. If `image_alt_tr` exists it provides a real image description; if null, falls back to empty string (decorative). Do NOT use `alt={title_tr}` — it causes the title to appear twice when users copy-paste page content since the `<h1>` is adjacent. `ArticleCard`, `HeroSection`, and `SimilarArticlesPanel` use `alt={image_alt_tr ?? title_tr ?? ""}` since those components have no adjacent H1.
14. **Every new page must declare a canonical URL or noindex.** Use `buildCanonical()` from `frontend/lib/seo.ts` in metadata (`alternates.canonical`); paginated listings also use `parsePageParam()` + `titleWithPage()`. Pages that must stay out of search set `robots: { index: false }` instead. Enforced by `frontend/scripts/check-canonical.mjs`, which runs as `prebuild` and FAILS the build if a public page has neither. Page titles must NOT append "| Afrika Haberleri" (the root layout template adds it); the same prebuild guard fails the build if a page title contains it. The homepage/default title is the keyword-rich "Afrika Haberleri: Afrika Ekonomi, Ticaret ve Yatırım Haberleri" (set in `app/page.tsx` and `app/layout.tsx` title.default); do not reduce it to the bare brand name.
15. **Never remove the googleBot directives in `app/layout.tsx`.** The root layout robots block carries `max-image-preview: large` (required for Google Discover large image cards), `max-snippet: -1`, and `max-video-preview: -1`. It is site-wide and page-level, so new articles, new pages, and manually uploaded images are covered automatically; nothing per-image is needed.
16. **`updated_at` on articles means "reader-visible content changed".** Only the admin articles PATCH sets it (when title_tr/excerpt_tr/content_tr/meta_description_tr/featured_image_url change). The scraper's is_update path must NOT bump it (it never touches Turkish content). JSON-LD `dateModified`, sitemap lastmod, and the article page "Güncellendi:" badge all derive from it via `resolveModifiedDate()` in `lib/seo.ts`. Never fake-freshen dates; Google detects and discounts inconsistent date signals.