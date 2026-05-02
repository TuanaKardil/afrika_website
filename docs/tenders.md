# ihale.md — Tenders Module (İhaleler)

> Read CLAUDE.md first. All project-wide rules (no em dashes, Turkish UI, English code,
> bleach + sanitize-html, Conventional Commits, design tokens) apply here without exception.

---

## Overview

Add a 9th nav tab **"İhaleler"** (slug: `ihaleler`, display_order: 9) to the existing site.
Scrape Africa-focused public tender notices, translate and classify via AI, display with live
countdown timers, progress bars, and status badges. Architecture mirrors the articles module.

---

## Tender Sources

| Key | Name | URL |
|---|---|---|
| `afdb` | Afrika Kalkınma Bankası | https://projectsportal.afdb.org/dataportal/VProject/show |
| `worldbank` | Dünya Bankası | https://projects.worldbank.org/en/projects-operations/procurement |
| `undp` | UNDP | https://procurement-notices.undp.org/ |
| `afreximbank` | Afreximbank | https://www.afreximbank.com/tenders/ |
| `african_union` | Afrika Birliği | https://au.int/en/tenders |
| `dgmarket` | DG Market | https://www.dgmarket.com/tenders/adminRegion-Africa.do |
| `ungm` | BM Global Marketplace | https://www.ungm.org/Public/Notice |

Scrape window: tenders with `deadline_at` in the future OR published within last 7 days.
Spider settings identical to article spiders (ROBOTSTXT_OBEY, DOWNLOAD_DELAY=2, same User-Agent).

---

## Supabase Schema

```sql
CREATE TABLE tenders (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source               text NOT NULL CHECK (source IN ('afdb','worldbank','undp','afreximbank','african_union','dgmarket','ungm')),
  source_url           text UNIQUE NOT NULL,
  slug                 text UNIQUE NOT NULL,
  reference_number     text,
  institution          text,
  country              text,
  title_original       text NOT NULL,
  description_original text,
  content_hash         text,
  title_tr             text,
  description_tr       text,
  institution_tr       text,
  country_tr           text,
  tender_type          text CHECK (tender_type IN ('goods','works','services','consulting','expression_of_interest','rfp','other')),
  sector_slug          text REFERENCES sectors(slug),
  region_slug          text REFERENCES regions(slug),
  category_slug        text REFERENCES tender_categories(slug),
  published_at         timestamptz,
  deadline_at          timestamptz,
  project_start_at     timestamptz,
  project_end_at       timestamptz,
  budget_usd           numeric,
  document_urls        text[],
  contact_email        text,
  status               text GENERATED ALWAYS AS (
                         CASE
                           WHEN deadline_at < now()      THEN 'expired'
                           WHEN project_start_at > now() THEN 'planned'
                           ELSE 'active'
                         END
                       ) STORED,
  scraped_at           timestamptz DEFAULT now(),
  updated_at           timestamptz DEFAULT now(),
  view_count           int DEFAULT 0,
  is_featured          bool DEFAULT false,
  is_suppressed        bool DEFAULT false
);

CREATE TABLE tender_categories (
  slug text PRIMARY KEY, name_tr text NOT NULL, icon text, display_order int
);
INSERT INTO tender_categories VALUES
  ('altyapi','Altyapı & İnşaat','hard-hat',1), ('enerji','Enerji & Çevre','zap',2),
  ('saglik','Sağlık','heart-pulse',3),          ('tarim','Tarım & Gıda','wheat',4),
  ('teknoloji','Teknoloji & Dijital','cpu',5),  ('lojistik','Lojistik & Ulaşım','truck',6),
  ('danismanlik','Danışmanlık','briefcase',7),  ('diger','Diğer','folder',8);

CREATE TABLE saved_tenders (
  user_id uuid REFERENCES auth.users ON DELETE CASCADE,
  tender_id uuid REFERENCES tenders ON DELETE CASCADE,
  saved_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, tender_id)
);
```

RLS: `tenders` and `tender_categories` public SELECT (where `is_suppressed = false`),
service_role write. `saved_tenders` user sees only own rows — identical pattern to `saved_articles`.

Indexes on: `deadline_at DESC`, `published_at DESC`, `status`, `sector_slug`, `region_slug`,
`category_slug`, `source`. GIN full-text on `title_tr || ' ' || description_tr`.

---

## Routes

`/ihaleler` listing, `/ihaleler/[slug]` detail, `/ihaleler/kategori/[slug]`,
`/ihaleler/ulke/[slug]`. Filters (status, category, region, source, budget range) sync to
URL query params via `nuqs`.

---

## AI Pipeline

Same model and OpenRouter key as articles (`google/gemini-flash-1.5`).

**Translate:** `title`, `description`, `institution`, `country` into Turkish.
Country names must use standard Turkish forms (e.g. "Ivory Coast" -> "Fildişi Sahili").
Institution names use official Turkish equivalents where they exist.

**Classify:** `sector_slug` (from CLAUDE.md sectors list, nullable), `region_slug`,
`category_slug`, `tender_type`. Send title + first 500 chars of description.

**Turkey filter:** Same suppression rule as articles. Set `is_suppressed = true` if negative
framing toward Turkey is detected.

All AI system prompts must include: "Do not use em dashes anywhere in the output."

---

## UI Specification

### /ihaleler Page

Stats hero bar (primary color #c2652a): active tender count, added this week, expiring in 7
days, total budget. Count-up animation on load.

Sticky filter bar below hero: status tabs (Tümü / Aktif / Planlandı / Süresi Doldu),
category dropdown, region dropdown, source dropdown, budget range slider.

Two-column card grid (single on mobile), infinite scroll via `react-intersection-observer`.

### TenderCard

Show: status badge, category chip, source logo (32x32), title (2-line clamp, EB Garamond),
institution, reference number, country flag + name, progress bar, published/deadline dates,
live countdown, budget (compact format, hidden if null).

**Status badge colors:** active=green, planned=amber, expired=red.

**Progress bar:** if project dates known use project completion %, else use deadline countdown %.
Color: green <60%, amber 60-85%, red >85%. Animate from 0 on mount (CSS 0.8s ease-out).

**Countdown:** live ticking client-side hook (`useCountdown`), SSR-safe with `ClientOnly`
wrapper to avoid hydration mismatch. Format: "X Gün Y Saat" or "Y Saat Z Dk W Sn" if <24h
(red text, pulsing dot). Past deadline: "Süresi Doldu" in red.

Card hover: `scale-[1.02]`, elevated shadow with primary color tint, `0.25s` transition.

### /ihaleler/[slug] Detail Page

70/30 desktop layout. Left: full `description_tr` (sanitized HTML), document download links.
Right sticky sidebar: large countdown, full timeline, progress bar, budget, source logo +
link, reference number chip, "Başvur" button (opens `source_url` in new tab), "Kaydet"
button (auth required, writes to `saved_tenders`). Below: "Benzer İhaleler" (same category,
max 4 cards). Saved tenders surface in `/panel` under a "Kayıtlı İhaleler" tab.

---

## Automation

Second n8n cron at **15:00 Europe/Istanbul** triggers `scrape_tenders.yml` GitHub Actions
workflow. All 7 spiders run sequentially. Reuses existing env vars (no new secrets needed).

---

## Scraper File Structure

```
scraper/spiders/  afdb_tenders.py  worldbank_tenders.py  undp_tenders.py
                  afreximbank_tenders.py  african_union_tenders.py
                  dgmarket_tenders.py  ungm_tenders.py
scraper/          tender_translate.py  tender_classify.py
                  tender_filter.py     tender_storage.py
```

All spiders extend a shared `BaseTenderSpider` handling rate limits, dedup by `source_url`,
and change detection via `md5(description_original)`.