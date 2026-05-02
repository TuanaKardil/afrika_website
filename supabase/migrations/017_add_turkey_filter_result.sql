ALTER TABLE articles
  ADD COLUMN IF NOT EXISTS turkey_filter_result text CHECK (turkey_filter_result IN ('PUBLISH', 'SUPPRESS'));
