-- Add image_alt_tr column to articles table
ALTER TABLE articles ADD COLUMN IF NOT EXISTS image_alt_tr TEXT;

-- Backfill existing articles: use title_tr as alt text
UPDATE articles
SET image_alt_tr = title_tr
WHERE image_alt_tr IS NULL
  AND title_tr IS NOT NULL;
