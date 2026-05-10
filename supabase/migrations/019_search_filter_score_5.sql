-- Update search_articles to use score >= 5 (lowered from 6).
CREATE OR REPLACE FUNCTION search_articles(
  query text,
  lim integer DEFAULT 20,
  off integer DEFAULT 0
)
RETURNS SETOF articles
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  ts_config text;
BEGIN
  SELECT CASE WHEN EXISTS (
    SELECT 1 FROM pg_ts_config WHERE cfgname = 'turkish'
  ) THEN 'turkish' ELSE 'simple' END INTO ts_config;

  RETURN QUERY EXECUTE format(
    $q$
      SELECT *
      FROM articles
      WHERE is_suppressed = false
        AND (score IS NULL OR score >= 5)
        AND to_tsvector(%L, coalesce(title_tr, '') || ' ' || coalesce(content_tr, ''))
          @@ plainto_tsquery(%L, $1)
      ORDER BY
        ts_rank(
          to_tsvector(%L, coalesce(title_tr, '') || ' ' || coalesce(content_tr, '')),
          plainto_tsquery(%L, $1)
        ) DESC,
        published_at DESC
      LIMIT $2
      OFFSET $3
    $q$,
    ts_config, ts_config, ts_config, ts_config
  )
  USING query, lim, off;
END;
$$;

GRANT EXECUTE ON FUNCTION search_articles(text, integer, integer) TO anon, authenticated;
