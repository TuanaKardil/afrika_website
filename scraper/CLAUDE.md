# Scraper

> `CLAUDE.md` §3, §4 ve §13'ten taşındı. Bu dosya yalnızca `scraper/` altında
> çalışılırken yüklenir. Genel kurallar için kök `CLAUDE.md`.

## 3. Pipeline Flow (07:00 TST + 13:00 TST)

Runs twice daily. The 13:00 run picks up articles published after the morning run; duplicates from the first run are caught by DeduplicationPipeline.

```
07:00 / 13:00  GitHub Actions scrape.yml triggered by native cron
+00:01         DeduplicationPipeline  (source_url + content_hash + AI semantic, last 48h)
+00:05         TurkeyFilterPipeline   (GPT-5 Nano, SUPPRESS items are dropped)
+00:08         ScorePipeline          (Gemini 2.5 Flash-Lite, score < 6 are dropped)
+00:15         MinContentPipeline     (drops articles < 100 words in content_original)
+00:18         TranslatePipeline      (only score 6+, 600 words, SEO+GEO+AEO, human-readable source names)
+00:22         ContentCleanPipeline   (Gemini 2.5 Flash-Lite, removes off-topic promos + datelines from content_tr)
+00:24         QualityCheckPipeline   (drops truncated list articles ending with "şunlardır:"; enforces H2: remediate via AI, else drop)
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

## 13. Daily Reporting

After each pipeline run, `StoragePipeline.close_spider` writes per-source stats to the `scrape_stats` Supabase table. A separate n8n workflow queries this table and emails an HTML report.

**`scrape_stats` table columns:** `run_date`, `source`, `run_slot` (`sabah` | `oglen`), `total_scraped`, `dropped_duplicate`, `dropped_low_score`, `dropped_min_content` (MinContentPipeline thin-content drops, migration 030), `dropped_turkey_filter`, `published`, `avg_score`

**Unique constraint:** `(run_date, source, run_slot)` — one row per source per run per day.

**n8n workflow IDs:** stored privately — not documented here.

