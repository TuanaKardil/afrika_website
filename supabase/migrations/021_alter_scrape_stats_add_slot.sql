ALTER TABLE scrape_stats ADD COLUMN IF NOT EXISTS run_slot text NOT NULL DEFAULT 'sabah';

ALTER TABLE scrape_stats DROP CONSTRAINT IF EXISTS scrape_stats_run_date_source_key;

ALTER TABLE scrape_stats ADD CONSTRAINT scrape_stats_run_date_source_slot_key
  UNIQUE (run_date, source, run_slot);
