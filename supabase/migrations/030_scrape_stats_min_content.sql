-- Track articles dropped by MinContentPipeline (too few words to publish)
-- separately from dropped_low_score, so the admin scrape-stats table can show
-- how many were rejected for thin content specifically.
ALTER TABLE scrape_stats
  ADD COLUMN IF NOT EXISTS dropped_min_content integer NOT NULL DEFAULT 0;
