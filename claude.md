# CLAUDE.md — Afrika Haber Sitesi

## Skills & Agents (Run Before Each Phase)

Install all required skills and agents in order before coding:

```bash
npx claude-code-templates@latest --skill creative-design/frontend-design
npx claude-code-templates@latest --skill development/senior-frontend
npx claude-code-templates@latest --skill development/code-reviewer
npx claude-code-templates@latest --agent development-team/frontend-developer
npx claude-code-templates@latest --agent database/supabase-schema-architect
```

**Enforcement rules:**
- Do not start Phase 2 (UI components) without loading `frontend-design` and `senior-frontend` skills.
- Do not design the Supabase schema without loading the `supabase-schema-architect` agent.
- Run `code-reviewer` before finalizing any non-trivial file.
- Read this file fully before planning. All constraints are non-negotiable.

---

## Project Summary

Turkish-language Africa news aggregator. Scrapes full articles from multiple English-language Africa-focused sources, translates and categorizes via AI, filters negative Turkey-related content, tags with relevant hashtags, and serves via Next.js on Vercel.

Repo: https://github.com/TuanaKardil/afrika_website

---

## Non-Negotiable Rules

- No em dashes anywhere, in Turkish or English output, code, comments, or translated content.
- User-facing text: Turkish. Code, comments, commits, docs: English.
- Sanitize scraped HTML before storing (`bleach`) AND before rendering (`sanitize-html`).
- Never use em dashes in translated output (enforce in every AI system prompt).
- Conventional Commits format for all git commits.
- Only the last 2 days of articles are scraped per run.
- AI must detect and skip duplicate or near-identical articles across sources.
- AI must suppress any article with negative framing toward Turkey.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 App Router + TypeScript strict + Tailwind |
| Database | Supabase (Postgres + Storage + Auth) |
| Scraping | Scrapy + trafilatura + bleach |
| Automation | n8n (cron trigger) |
| AI (translation, classification, hashtags) | OpenRouter API (model: `google/gemini-flash-1.5`) |
| Deployment | Vercel |

**Model selection rationale:** `google/gemini-flash-1.5` via OpenRouter offers the best cost-to-quality ratio for translation, classification, and hashtag extraction at scale.

---

## Design Tokens

Port verbatim from Stitch HTML into `tailwind.config.js`. Do not invent new tokens.

```js
colors: {
  primary: '#c2652a',
  background: '#faf5ee',
  surface: '#faf5ee',
  'on-surface': '#3a302a',
  'surface-container': '#f2ece4',
  'outline-variant': '#d8d0c8',
  tertiary: '#8c3c3c',
}
```

**Fonts:** EB Garamond (headlines), Manrope (body/labels)

**Cards:** `group-hover:scale-105`, `rounded-xl`, `shadow-[0_2px_16px_rgba(58,48,42,0.04)]`

Full token set in Stitch HTML; port all.

---

## Navigation (8 Top-Level Tabs)

| # | Tab Label | Slug |
|---|---|---|
| 1 | Fırsatlar | /firsatlar |
| 2 | Pazarlar & Ekonomi | /pazarlar-ekonomi |
| 3 | Ticaret & İhracat | /ticaret-ihracat |
| 4 | Sektörler | /sektorler |
| 5 | Türk İş Dünyası Afrika'da | /turk-is-dunyasi |
| 6 | Etkinlikler & Fuarlar | /etkinlikler-fuarlar |
| 7 | Ülkeler | /ulkeler |
| 8 | Diğer | /diger |

### Sektörler Hover Dropdown (9 featured + overflow link)

On hover over the "Sektörler" tab, display a dropdown with these 9 sectors:

1. İnşaat & Müteahhitlik
2. Enerji
3. Savunma Sanayi
4. Madencilik
5. Tekstil & Hazır Giyim
6. Kozmetik & Hijyen
7. Demir-Çelik & Sanayi
8. Tarım & Gıda
9. Otomotiv

Item 10 in the dropdown: **"Daha Fazla Sektör"** links to `/sektorler`.

### /sektorler Full Page — All Sectors

The sectors page lists all sectors including a "Tüm Sektörler" filter option:

Tüm Sektörler / Ambalaj & Geri Dönüşüm / Bankacılık & Finans / Beyaz Eşya & Ev Aletleri / Çimento & İnşaat Malzemeleri / Demir-Çelik & Sanayi / Enerji / Ev Tekstili & Halı / Fintech & Dijital Ödeme / Fuarcılık & Etkinlik / Gayrimenkul & Konut / Havacılık & Sivil Havacılık / HVAC-R (Isıtma-Soğutma) / İlaç & Tıbbi Cihaz / İnşaat & Müteahhitlik / Kimya & Petrokimya / Kozmetik & Hijyen / Lojistik & Taşımacılık / Madencilik / Makine & Yedek Parça / Mobilya & Dekorasyon / Otomotiv / Perakende & E-ticaret / Sağlık & Sağlık Turizmi / Savunma Sanayi / Tarım & Gıda / Teknoloji & Yazılım / Tekstil & Hazır Giyim / Telekomünikasyon / Turizm & Otelcilik / Yenilenebilir Enerji

---

## Routes

| Route | Purpose |
|---|---|
| `/` | Homepage |
| `/haber/[slug]` | Article detail |
| `/sektorler` | All sectors listing |
| `/sektorler/[slug]` | Single sector articles |
| `/bolge/[slug]` | Regional articles |
| `/firsatlar` | Opportunities |
| `/pazarlar-ekonomi` | Markets & Economy |
| `/ticaret-ihracat` | Trade & Export |
| `/turk-is-dunyasi` | Turkish business in Africa |
| `/etkinlikler-fuarlar` | Events & Fairs |
| `/ulkeler` | Countries |
| `/diger` | Other |
| `/arama` | Search |
| `/giris` | Login |
| `/kayit` | Register |
| `/panel` | User dashboard |

---

## News Sources

Scrape ONLY from the following sources. BBC Africa has been removed.

| Source | URL |
|---|---|
| Business Insider Africa | https://africa.businessinsider.com/ |
| CNBC Africa | https://www.cnbcafrica.com/ |
| The Africa Report | https://www.theafricareport.com/ |
| Anadolu Agency Africa | https://www.aa.com.tr/en/africa |
| The Conversation Africa | https://theconversation.com/africa |

**Time window:** Only articles published within the last 2 days are scraped per run.

---

## Scraping Rules

- Content extraction: trafilatura primary, CSS selectors fallback.
- Keep HTML tags: `h2 h3 p blockquote ul ol li strong em figure figcaption img a`. Strip everything else.
- `ROBOTSTXT_OBEY=True`, `DOWNLOAD_DELAY=2`, `CONCURRENT_REQUESTS_PER_DOMAIN=2`.
- User-Agent: `AfrikaHaberleriBot/1.0 (+https://github.com/TuanaKardil/afrika_website)`
- Deduplication: by `source_url`; change detection via `md5(content_original)`.
- Download images to Supabase Storage; rewrite `img src` in stored HTML.
- Extract per article: `title`, `full body (clean HTML)`, `excerpt (first 200 chars)`, `author`, `published_at`, `featured_image_url`, `image_credit`, `source_url`.

---

## AI Processing Pipeline (OpenRouter)

All AI calls use OpenRouter with model `google/gemini-flash-1.5`. Batch 3-5 parallel calls per run.

### 1. Duplicate Detection

Before storing, send article title + excerpt to AI. If semantically identical to a recently stored article (within last 48 hours), skip it. Do not publish near-duplicate content across sources.

### 2. Turkey Filter

Any article with negative framing toward Turkey, Turkish companies, Turkish government, or Turkish citizens must be suppressed. AI evaluates sentiment and context. If negative Turkey framing is detected, mark `is_suppressed=true` and do not publish.

### 3. Translation

Translate `title`, `excerpt`, and full `body HTML` into Turkish.

**System prompt must include:**
- Preserve proper nouns in their Turkish forms.
- Do not use em dashes anywhere.
- Do not summarize; translate the full content faithfully.
- Preserve all HTML tag structure in output.
- Skip if `content_hash` is unchanged since last run.

### 4. Classification

Classify each article into:

**Navigation tab** (one of): firsatlar / pazarlar-ekonomi / ticaret-ihracat / sektorler / turk-is-dunyasi / etkinlikler-fuarlar / ulkeler / diger

**Sector** (one or more from the full sectors list, or null if not applicable)

**Region** (one of): afrika / kuzey-afrika / bati-afrika / orta-afrika / dogu-afrika / guney-afrika

AI performs classification based on full article title and body.

### 5. Hashtag Assignment

Each article gets exactly 10 hashtags. AI selects the 10 most relevant hashtags from `hashtag.md` (project root). Do not invent hashtags outside that file. Return as an ordered array.

**System prompt for hashtags:**
- Only choose from the canonical list in hashtag.md.
- Rank by relevance to article content.
- Return exactly 10 hashtags, no more, no less.
- No em dashes.

---

## Supabase Schema

### articles table (key columns)

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| source | text | CHECK IN ('business_insider','cnbc_africa','africa_report','aa_africa','the_conversation') |
| source_url | text UNIQUE | |
| slug | text UNIQUE | |
| title_original | text | |
| title_tr | text | |
| excerpt_original | text | |
| excerpt_tr | text | |
| content_original | text | |
| content_tr | text | |
| content_hash | text | md5 of content_original |
| featured_image_url | text | Supabase Storage URL |
| featured_image_source_url | text | |
| image_credit | text | |
| nav_tab_slug | text FK | references nav_tabs(slug) |
| sector_slugs | text[] | array of sector slugs |
| region_slug | text FK | references regions(slug) |
| hashtags | text[] | exactly 10 values from hashtag.md |
| published_at | timestamptz | |
| scraped_at | timestamptz | |
| updated_at | timestamptz | |
| author_original | text | |
| reading_time_minutes | int | |
| view_count | int | default 0 |
| is_featured | bool | default false |
| is_suppressed | bool | default false (AI Turkey filter) |

**Indexes:** `published_at DESC`, `nav_tab_slug`, `sector_slugs` (GIN), `region_slug`, GIN full-text on `title_tr || ' ' || content_tr`

### Other Tables

**nav_tabs** `(slug PK, name_tr, display_order)`

**sectors** `(slug PK, name_tr, display_order, is_dropdown_featured bool)`

**regions** `(slug PK, name_tr)`

**saved_articles** `(user_id FK auth.users, article_id FK articles, saved_at)`

### RLS

- `articles`, `nav_tabs`, `sectors`, `regions`: public SELECT, service_role write.
- `saved_articles`: user sees only their own rows.

### Storage

Bucket: `article-images`
Path pattern: `{source}/{YYYY}/{MM}/{article_id}/{filename}`

---

## Directory Structure

```
frontend/           Next.js App Router
scraper/
  spiders/
    business_insider.py
    cnbc_africa.py
    africa_report.py
    aa_africa.py
    conversation_africa.py
  pipelines.py
  extractors.py
  translate.py      OpenRouter translation calls
  classify.py       OpenRouter nav + sector + region classification
  hashtags.py       OpenRouter hashtag selection from hashtag.md
  duplicate.py      OpenRouter semantic duplicate detection
  turkey_filter.py  OpenRouter Turkey sentiment filter
  storage.py
  sanitize.py
supabase/
  migrations/
n8n/
  workflows/
.github/
  workflows/
    scrape.yml
hashtag.md          Canonical hashtag list (source of truth for AI)
CLAUDE.md
```

---

## Automation

**n8n cron** at `05:00 Europe/Istanbul` triggers a webhook that dispatches the GitHub Actions `workflow_dispatch` event, which runs `scraper/run.sh`.

---

## Environment Variables

### Vercel (frontend)

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### Scraper

```
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
OPENROUTER_API_KEY=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
SCRAPER_WEBHOOK_SECRET
```

> **Security note:** Rotate `OPENROUTER_API_KEY` before making this repo public. Never commit it directly.

---

## When to Invoke Skills and Agents

| Phase | Skills / Agents to Load |
|---|---|
| Phase 2: Design system + components | `frontend-design`, `senior-frontend`, `frontend-developer` agent |
| Phase 3: Schema + RLS | `supabase-schema-architect` agent |
| Before any PR or code review | `code-reviewer` skill |