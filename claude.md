BEFORE ANY CODING: Install all required skills and agents by running these commands in order:

npx claude-code-templates@latest --skill creative-design/frontend-design
npx claude-code-templates@latest --skill development/senior-frontend
npx claude-code-templates@latest --skill development/code-reviewer
npx claude-code-templates@latest --agent development-team/frontend-developer
npx claude-code-templates@latest --agent database/supabase-schema-architect

Do not start Phase 2 (UI components) without loading the frontend-design and senior-frontend skills.
Do not design the Supabase schema without loading the supabase-schema-architect agent.
Run code-reviewer before finalizing any non-trivial file.

Then read CLAUDE.md fully before planning. All constraints there are non-negotiable.
Turkish-language Africa news aggregator. Scrapes full articles from BBC Africa and The Conversation Africa, translates to Turkish via Claude API, serves via Next.js on Vercel.
Repo: https://github.com/TuanaKardil/afrika_website
Rules (always enforce)

No em dashes anywhere, Turkish or English
User-facing text: Turkish. Code, comments, commits, docs: English
Sanitize scraped HTML before storing (bleach) AND before rendering (sanitize-html)
Never use em dashes in translated output (include in translation system prompt)
Conventional Commits

Tech Stack
Next.js 14 App Router + TypeScript strict + Tailwind | Supabase (Postgres + Storage + Auth) | Scrapy + trafilatura + bleach | n8n (cron) | Claude Haiku API (translation) | Vercel
Design Tokens (port verbatim from Stitch HTML into tailwind.config.js)

primary: #c2652a | background/surface: #faf5ee | on-surface: #3a302a
surface-container: #f2ece4 | outline-variant: #d8d0c8 | tertiary: #8c3c3c
Fonts: EB Garamond (headlines), Manrope (body/labels)
Cards: group-hover:scale-105, rounded-xl, shadow-[0_2px_16px_rgba(58,48,42,0.04)]
Full token set in Stitch HTML; port all. Do not invent new tokens.

Routes
/ (home) | /haber/[slug] | /kategori/[slug] | /bolge/[slug] | /arama | /giris | /kayit | /panel
Categories & Regions
Categories: siyaset | ekonomi | saglik | bilim-teknoloji | cevre-enerji | genel
Regions: afrika (default) | kuzey-afrika | bati-afrika | orta-afrika | dogu-afrika | guney-afrika
Scraping

BBC: https://www.bbc.com/news/world/africa + regional sub-pages, last 30 days
The Conversation: https://theconversation.com/africa sections mapped as: business-economy->ekonomi, politics->siyaset, health->saglik, science-tech->bilim-teknoloji, environment-energy->cevre-enerji, last 30 days
Extract: title, full body (clean HTML), excerpt (first 200 chars), author, published_at, featured_image_url, image_credit, source_url
Content extraction: trafilatura primary, CSS selectors fallback
Keep tags: h2 h3 p blockquote ul ol li strong em figure figcaption img a. Strip everything else.
ROBOTSTXT_OBEY=True, DOWNLOAD_DELAY=2, CONCURRENT_REQUESTS_PER_DOMAIN=2
User-Agent: AfrikaHaberleriBot/1.0 (+https://github.com/TuanaKardil/afrika_website)
Dedup by source_url; change detection via md5(content_original)
Download images to Supabase Storage, rewrite img src in stored HTML
Classify category + region via keyword rules on title + body

Translation

Model: claude-haiku-4-5-20251001
Translate: title + excerpt + full body HTML per article
Preserve HTML tag structure in output
System prompt must include: preserve proper nouns in Turkish forms, no em dashes, no summarizing
Batch 3-5 parallel API calls per run; skip if content_hash unchanged

Supabase Schema (articles table, key columns)
id uuid PK | source text CHECK('bbc','the_conversation') | source_url text UNIQUE | slug text UNIQUE | title_original | title_tr | excerpt_original | excerpt_tr | content_original | content_tr | content_hash text | featured_image_url (Storage URL) | featured_image_source_url | image_credit | category_slug FK | region_slug FK | published_at timestamptz | scraped_at | updated_at | author_original | reading_time_minutes int | view_count int | is_featured bool
Indexes: published_at DESC, category_slug, region_slug, GIN full-text on title_tr||content_tr
Other tables: categories(slug PK, name_tr, display_order) | regions(slug PK, name_tr) | saved_articles(user_id FK auth.users, article_id FK, saved_at)
RLS: articles/categories/regions public SELECT, service_role write | saved_articles: user sees only own rows
Storage bucket: article-images, path: {source}/{YYYY}/{MM}/{article_id}/{filename}
Directory Structure
frontend/ (Next.js) | scraper/ (Scrapy: spiders/bbc_africa.py, spiders/conversation_africa.py, pipelines.py, extractors.py, translate.py, classify.py, storage.py, sanitize.py) | supabase/migrations/ | n8n/workflows/ | .github/workflows/scrape.yml
Automation
n8n cron 05:00 Europe/Istanbul -> webhook -> GitHub Actions workflow_dispatch -> scraper/run.sh
Env Vars
Vercel: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
Scraper: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY, SCRAPER_WEBHOOK_SECRET
Skills & Agents (run these before starting the relevant phase)
Install skills and agents with these exact commands:
npx claude-code-templates@latest --skill creative-design/frontend-design
npx claude-code-templates@latest --skill development/senior-frontend
npx claude-code-templates@latest --skill development/code-reviewer
npx claude-code-templates@latest --agent development-team/frontend-developer
npx claude-code-templates@latest --agent database/supabase-schema-architect
When to invoke:

Phase 2 (design system + components): run frontend-design, senior-frontend, frontend-developer agent
Phase 3 (schema + RLS): run supabase-schema-architect agent
Before any PR / code review step: run code-reviewer skill
Do not proceed with UI components without loading frontend-design skill first