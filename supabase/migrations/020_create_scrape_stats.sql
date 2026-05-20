CREATE TABLE IF NOT EXISTS scrape_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_date date NOT NULL DEFAULT CURRENT_DATE,
  source text NOT NULL,
  total_scraped int NOT NULL DEFAULT 0,
  dropped_duplicate int NOT NULL DEFAULT 0,
  dropped_low_score int NOT NULL DEFAULT 0,
  dropped_turkey_filter int NOT NULL DEFAULT 0,
  published int NOT NULL DEFAULT 0,
  avg_score numeric(3,1),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT scrape_stats_run_date_source_key UNIQUE (run_date, source)
);

ALTER TABLE scrape_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on scrape_stats"
  ON scrape_stats FOR ALL TO service_role
  USING (true) WITH CHECK (true);
