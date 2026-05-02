-- Performance indexes
CREATE INDEX idx_articles_published_at ON articles (published_at DESC);
CREATE INDEX idx_articles_category ON articles (category_slug);
CREATE INDEX idx_articles_region ON articles (region_slug);
CREATE INDEX idx_articles_is_featured ON articles (is_featured) WHERE is_featured = true;

-- Full-text search index on Turkish content.
-- Falls back to 'simple' if the 'turkish' text search configuration is unavailable.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_ts_config WHERE cfgname = 'turkish'
  ) THEN
    EXECUTE $i$
      CREATE INDEX idx_articles_fulltext ON articles
      USING gin(to_tsvector('turkish', coalesce(title_tr, '') || ' ' || coalesce(content_tr, '')));
    $i$;
  ELSE
    EXECUTE $i$
      CREATE INDEX idx_articles_fulltext ON articles
      USING gin(to_tsvector('simple', coalesce(title_tr, '') || ' ' || coalesce(content_tr, '')));
    $i$;
  END IF;
END;
$$;
