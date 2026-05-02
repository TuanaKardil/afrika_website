-- Add nav_tab_slug FK replacing old category_slug
ALTER TABLE articles ADD COLUMN nav_tab_slug text REFERENCES nav_tabs(slug) ON DELETE SET NULL;

-- Sector array (GIN indexed separately in 005)
ALTER TABLE articles ADD COLUMN sector_slugs text[] NOT NULL DEFAULT '{}';

-- Exactly 10 hashtags assigned by AI from hashtag.md
ALTER TABLE articles ADD COLUMN hashtags text[] NOT NULL DEFAULT '{}';

-- Turkey sentiment filter flag
ALTER TABLE articles ADD COLUMN is_suppressed boolean NOT NULL DEFAULT false;

-- Update source constraint to reflect new sources (BBC removed)
ALTER TABLE articles DROP CONSTRAINT IF EXISTS articles_source_check;
ALTER TABLE articles ADD CONSTRAINT articles_source_check
  CHECK (source IN ('business_insider', 'cnbc_africa', 'africa_report', 'aa_africa', 'the_conversation'));

-- GIN index for sector_slugs array queries
CREATE INDEX IF NOT EXISTS articles_sector_slugs_gin ON articles USING GIN (sector_slugs);

-- Index for nav_tab_slug filtering
CREATE INDEX IF NOT EXISTS articles_nav_tab_slug_idx ON articles (nav_tab_slug);

-- Partial index: only unsuppressed articles visible to public queries
CREATE INDEX IF NOT EXISTS articles_published_unsuppressed ON articles (published_at DESC)
  WHERE is_suppressed = false;
