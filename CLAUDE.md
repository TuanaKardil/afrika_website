# Africa Business News (afrika_website) — Claude Code System File

> This file is the main reference Claude Code automatically reads in every session.
> For details, see the `prompts/`, `docs/`, and `data/` folders.

## 1. Project Summary

A Turkish-language, Africa-focused business and economy news platform. News is pulled daily from English sources (The Conversation Africa, Africa Report, CNBC Africa, AA Africa, Business Insider Africa). Items are translated to Turkish via AI, scored (1-10), classified, tagged with 8-15 hashtags, and published.

- **Update times:** 07:00 TST + 13:00 TST (n8n cron, twice daily)
- **Fetch window:** Last 24 hours
- **Duplicate check window:** Last 48 hours
- **Publication threshold:** Score 5+
- **News count limit:** NONE (filtering creates a natural ceiling)
- **Daily report:** Email to a.berkbaytar@gmail.com at 09:00 (sabah) and 15:00 (oglen) TST

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
+00:08         ScorePipeline          (Gemini 2.5 Flash-Lite, score < 5 are dropped)
+00:15         MinContentPipeline     (drops articles < 80 words in content_original)
+00:18         TranslatePipeline      (only score 5+, 600 words, SEO+GEO+AEO, human-readable source names)
+00:22         ContentCleanPipeline   (Gemini 2.5 Flash-Lite, removes off-topic promos + datelines from content_tr)
+00:24         QualityCheckPipeline   (drops truncated list articles ending with "şunlardır:"; warns on missing H2)
+00:25         ClassifyPipeline       (nav_tab + sector + region JSON)
+00:28         HashtagsPipeline       (8-15 hashtags from canonical list)
+00:30         Written to Supabase + scrape_stats row upserted (run_slot: sabah | oglen)
09:00 / 15:00  n8n report workflow queries scrape_stats, sends HTML email
```

**Cost-driven ordering:** The cheapest steps (duplicate, turkey_filter, score) run first. Expensive translation is applied only to score 5+ items. 40-60% cost savings.

## 4. Model Configuration

| Step | Model | Temperature | Max Tokens | What Gets Processed |
|------|-------|-------------|------------|---------------------|
| score | Gemini 2.5 Flash-Lite | 0.1 | 150 | All news |
| turkey_filter | GPT-5 Nano | 0.0 | 50 | All news |
| translate | Gemini 2.5 Flash-Lite | 0.2 | 4096 | Score 5+ only |
| clean_content | Gemini 2.5 Flash-Lite | 0.0 | 4096 | Score 6+ only (after translate) |
| classify | GPT-5 Nano | 0.0 | 200 | Score 6+ only |
| hashtags | Gemini 2.5 Flash-Lite | 0.2 | 300 | Score 6+ only |

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

**UI tabs (6 visible + 1 module):** firsatlar, pazarlar-ekonomi, ticaret-ihracat, sektorler, ulkeler, ihaleler (separate module), diger (hidden)

> `etkinlikler-fuarlar` was removed from the UI nav (June 2026) but remains a valid classifier nav_tab value — the AI still classifies articles into it.

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
| ihaleler | Tender listings module (separate AI pipeline, not a nav_tab classifier value) |
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
| `frontend/app/sifremi-unuttum/page.tsx` | Forgot password page |
| `frontend/app/sifre-sifirla/page.tsx` | Reset password page (requires active session) |

## 13. Daily Reporting

After each pipeline run, `StoragePipeline.close_spider` writes per-source stats to the `scrape_stats` Supabase table. A separate n8n workflow queries this table and emails an HTML report.

**`scrape_stats` table columns:** `run_date`, `source`, `run_slot` (`sabah` | `oglen`), `total_scraped`, `dropped_duplicate`, `dropped_low_score`, `dropped_turkey_filter`, `published`, `avg_score`

**Unique constraint:** `(run_date, source, run_slot)` — one row per source per run per day.

**n8n report workflow ID:** `bRRgVo9LgM48NyV0` (baytara.app.n8n.cloud)
**n8n scraper workflow ID:** `tFqlvcwvaDwcnxBY` (baytara.app.n8n.cloud)

## 15. Known Bugs Fixed (June 2026)

| Fix | Details |
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
13. **Article detail page featured image must use `alt=""`:** In `app/haber/[slug]/page.tsx`, the featured image is decorative — the title is already in the adjacent `<h1>`. Setting `alt={title}` causes the browser to include the title text in clipboard copy, making it appear twice when users select and paste page content. Rule: decorative images with an adjacent text equivalent always get `alt=""`. ArticleCard and HeroSection images keep `alt={title}` since those components have no adjacent H1.