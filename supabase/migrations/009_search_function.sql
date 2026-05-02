-- Full-text search function used by the /arama route.
-- Uses 'turkish' text search config when available, falls back to 'simple'.
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
      WHERE to_tsvector(%L, coalesce(title_tr, '') || ' ' || coalesce(content_tr, ''))
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

-- Allow public (anon + authenticated) to call the search function
GRANT EXECUTE ON FUNCTION search_articles(text, integer, integer) TO anon, authenticated;

-- View count increment function called from the article detail page
CREATE OR REPLACE FUNCTION increment_view_count(article_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE articles SET view_count = view_count + 1 WHERE id = article_id;
$$;

GRANT EXECUTE ON FUNCTION increment_view_count(uuid) TO anon, authenticated;
