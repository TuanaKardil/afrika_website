# Africa Business News (afrika_website) — Claude Code System File

> This file is the main reference Claude Code automatically reads in every session.
> For details, see the `prompts/`, `docs/`, and `data/` folders.

## 1. Project Summary

A Turkish-language, Africa-focused business and economy news platform. News is pulled daily from English sources (The Conversation Africa, Africa Report, CNBC Africa, AA Africa, Business Insider Africa). Items are translated to Turkish via AI, scored (1-10), classified, tagged with 8-15 hashtags, and published.

- **Update time:** 06:00 TST (n8n cron `0 6 * * *`)
- **Fetch window:** Last 24 hours
- **Duplicate check window:** Last 48 hours
- **Publication threshold:** Score 4+
- **News count limit:** NONE (filtering creates a natural ceiling)

## 2. Tech Stack

- **Frontend:** Next.js 14 (App Router), Tailwind CSS, TypeScript
- **Backend:** Supabase (PostgreSQL + Auth + Storage + RLS)
- **Scraping:** Scrapy (5 sources in parallel)
- **Automation:** n8n (cron + pipeline orchestration)
- **AI:** OpenRouter API (Gemini 2.5 Flash-Lite + GPT-5 Nano)
- **Deploy:** Vercel
- **CI/CD:** GitHub Actions

## 3. Pipeline Flow (06:00 TST)

```
06:00 n8n cron triggers
06:01 scraper/run.sh        (5 sources scraped in parallel)
06:05 DuplicatePipeline      (semantic similarity over last 48 hours)
06:08 TurkeyFilterPipeline   (GPT-5 Nano, BLOCK items are dropped)
06:10 ScorePipeline          (Gemini 2.5 Flash-Lite, 1-3 are dropped)
06:18 TranslatePipeline      (only score 4+, 600 words, SEO+GEO+AEO)
06:22 ContentCleanStep       (Gemini 2.5 Flash-Lite, removes off-topic promos from content_tr)
06:25 ClassifyPipeline       (nav_tab + sector + region JSON)
06:28 HashtagsPipeline       (8-15 hashtags from canonical list)
06:30 Written to Supabase
```

**Cost-driven ordering:** The cheapest steps (duplicate, turkey_filter, score) run first. Expensive translation is applied only to score 4+ items. 40-60% cost savings.

## 4. Model Configuration

| Step | Model | Temperature | Max Tokens | What Gets Processed |
|------|-------|-------------|------------|---------------------|
| score | Gemini 2.5 Flash-Lite | 0.1 | 150 | All news |
| turkey_filter | GPT-5 Nano | 0.0 | 50 | All news |
| translate | Gemini 2.5 Flash-Lite | 0.2 | 4096 | Score 4+ only |
| clean_content | Gemini 2.5 Flash-Lite | 0.0 | 4096 | Score 4+ only (after translate) |
| classify | GPT-5 Nano | 0.0 | 200 | Score 4+ only |
| hashtags | Gemini 2.5 Flash-Lite | 0.2 | 300 | Score 4+ only |

**Why Flash-Lite (not Flash):** Flash is $0.30/M input, Flash-Lite is $0.10/M input. 84% savings on the translation step with negligible quality difference.

## 5. Operational Rules (STRICT)

| Rule | Description |
|------|-------------|
| **No em dashes** | `—`, `–`, `--` are forbidden anywhere. Replace with comma or period. ESLint rule is mandatory. |
| **Language policy** | Everything user-facing is in Turkish. Code, commits, comments, and logs are in English. |
| **600-word limit** | Translated body is max 600 words (excluding source link). 1000+ word originals are summarized. |
| **Source link required** | Every news item must include a source via `<p class="source-link">`. |
| **8-15 hashtags required** | Between 8 and 15, drawn from the canonical list (`docs/hashtags.md`). |
| **Score 4+ is published** | 1-3 are dropped (not translated, not classified). |
| **Conventional Commits** | `type(scope): description` format is mandatory. |
| **HTML sanitization** | Clean with `bleach`, then re-sanitize before render with `sanitize-html`. |
| **TypeScript types** | Type definitions are required for every API endpoint and function. |
| **Tailwind classes** | Always use Tailwind classes instead of inline styles. |
| **Supabase RLS** | Policy review on every schema change. |

## 6. Navigation (8 Tabs)

| Slug | Description |
|------|-------------|
| firsatlar | Investment opportunities, tenders, deals |
| pazarlar-ekonomi | Macro data, stock markets, inflation, GDP, foreign exchange |
| ticaret-ihracat | Trade agreements, export/import statistics, customs |
| sektorler | Sector analysis, industry trends, company news |
| turk-is-dunyasi | Turkish companies, joint ventures, government initiatives |
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

## 8. Sectors (30)

Packaging & Recycling, Banking & Finance, White Goods & Home Appliances, Cement & Construction Materials, Iron-Steel & Industry, Energy, Home Textiles & Carpets, Fintech & Digital Payments, Trade Fairs & Events, Real Estate & Housing, Aviation & Civil Aviation, HVAC-R (Heating-Cooling), Pharmaceuticals & Medical Devices, Construction & Contracting, Chemicals & Petrochemicals, Cosmetics & Hygiene, Logistics & Transportation, Mining, Machinery & Spare Parts, Furniture & Decoration, Automotive, Retail & E-commerce, Healthcare & Health Tourism, Defense Industry, Agriculture & Food, Technology & Software, Textile & Apparel, Telecommunications, Tourism & Hospitality, Renewable Energy

## 9. Target Audience (4 Segments)

1. **Contractors & Infrastructure Investors:** Turkish construction, engineering, logistics (railways, highways, ports, energy)
2. **Exporting SMEs:** Textile, food, chemicals, machinery manufacturers
3. **Defense & Security Professionals:** UAVs, military training, security consulting
4. **Diplomats & Researchers:** Foreign affairs, think tanks, academics

## 10. File References

| File | Purpose |
|------|---------|
| `prompts/translate.md` | Translation prompt (journalistic Turkish, HTML preservation) |
| `prompts/clean.md` | Content cleaning prompt (removes off-topic promos from translated body) |
| `prompts/turkey_filter.md` | Negative Turkey framing detection (SUPPRESS/PUBLISH) |
| `prompts/classify.md` | nav_tab + sector + region JSON classification |
| `prompts/hashtags.md` | 8-15 hashtag assignment rules |
| `docs/hashtags.md` | Canonical hashtag list (800+ tags) |
| `docs/sectors.md` | Active sector slugs + merged/deleted slug map |
| `docs/tenders.md` | Tenders module spec (schema, routes, AI pipeline, UI) |

## 11. Claude Code Working Rules

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