-- Enable trigram extension for fuzzy/typo-tolerant search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ─────────────────────────────────────────────────────────────
-- search_articles_v2
--   raw_query  : original user input (used for trigram similarity)
--   tsq_string : pre-built tsquery string from the frontend
--                e.g. "(mısır | misir | egypt) & (altın | altin | gold)"
--   filter_nav : optional nav_tab_slug filter
--   filter_from: optional lower bound on published_at
--   lim / off  : pagination
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION search_articles_v2(
  raw_query    text,
  tsq_string   text,
  filter_nav   text    DEFAULT NULL,
  filter_from  timestamptz DEFAULT NULL,
  lim          integer DEFAULT 12,
  off          integer DEFAULT 0
)
RETURNS SETOF articles
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  parsed_tsq tsquery;
BEGIN
  -- Parse tsq_string; fall back to plainto_tsquery on syntax error
  BEGIN
    parsed_tsq := to_tsquery('simple', tsq_string);
  EXCEPTION WHEN OTHERS THEN
    parsed_tsq := plainto_tsquery('simple', raw_query);
  END;

  RETURN QUERY
  SELECT a.*
  FROM articles a
  JOIN LATERAL (
    SELECT
      ts_rank(
        setweight(to_tsvector('simple', coalesce(a.title_tr,   '')), 'A') ||
        setweight(to_tsvector('simple', coalesce(a.excerpt_tr, '')), 'B') ||
        setweight(to_tsvector('simple',
          array_to_string(coalesce(a.hashtags, ARRAY[]::text[]), ' ')
        ), 'B') ||
        setweight(to_tsvector('simple', coalesce(a.content_tr, '')), 'C'),
        parsed_tsq
      ) AS ft_rank,
      -- word_similarity: how well raw_query matches any word in title
      -- only computed per row; used as typo-tolerance boost
      word_similarity(lower(raw_query), lower(coalesce(a.title_tr, ''))) AS trgm_rank
  ) scores ON true
  WHERE
    a.is_suppressed = false
    AND (a.score IS NULL OR a.score >= 5)
    AND a.title_tr IS NOT NULL
    -- Category filter (optional)
    AND (filter_nav IS NULL OR a.nav_tab_slug = filter_nav)
    -- Date filter (optional)
    AND (filter_from IS NULL OR a.published_at >= filter_from)
    -- Must match either full-text OR trigram (only for queries >= 4 chars to avoid noise)
    AND (
      (
        setweight(to_tsvector('simple', coalesce(a.title_tr,   '')), 'A') ||
        setweight(to_tsvector('simple', coalesce(a.excerpt_tr, '')), 'B') ||
        setweight(to_tsvector('simple',
          array_to_string(coalesce(a.hashtags, ARRAY[]::text[]), ' ')
        ), 'B') ||
        setweight(to_tsvector('simple', coalesce(a.content_tr, '')), 'C')
      ) @@ parsed_tsq
      OR (
        length(raw_query) >= 4
        AND word_similarity(lower(raw_query), lower(coalesce(a.title_tr, ''))) > 0.3
      )
    )
  ORDER BY
    (scores.ft_rank * 2.0 + scores.trgm_rank * 0.5) DESC,
    a.published_at DESC
  LIMIT lim
  OFFSET off;
END;
$$;

GRANT EXECUTE ON FUNCTION search_articles_v2(text, text, text, timestamptz, integer, integer)
  TO anon, authenticated;

-- ─────────────────────────────────────────────────────────────
-- count_search_articles_v2 — for pagination total count
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION count_search_articles_v2(
  raw_query   text,
  tsq_string  text,
  filter_nav  text        DEFAULT NULL,
  filter_from timestamptz DEFAULT NULL
)
RETURNS bigint
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  parsed_tsq tsquery;
  result     bigint;
BEGIN
  BEGIN
    parsed_tsq := to_tsquery('simple', tsq_string);
  EXCEPTION WHEN OTHERS THEN
    parsed_tsq := plainto_tsquery('simple', raw_query);
  END;

  SELECT count(*)
  INTO result
  FROM articles a
  WHERE
    a.is_suppressed = false
    AND (a.score IS NULL OR a.score >= 5)
    AND a.title_tr IS NOT NULL
    AND (filter_nav  IS NULL OR a.nav_tab_slug  = filter_nav)
    AND (filter_from IS NULL OR a.published_at >= filter_from)
    AND (
      (
        setweight(to_tsvector('simple', coalesce(a.title_tr,   '')), 'A') ||
        setweight(to_tsvector('simple', coalesce(a.excerpt_tr, '')), 'B') ||
        setweight(to_tsvector('simple',
          array_to_string(coalesce(a.hashtags, ARRAY[]::text[]), ' ')
        ), 'B') ||
        setweight(to_tsvector('simple', coalesce(a.content_tr, '')), 'C')
      ) @@ parsed_tsq
      OR (
        length(raw_query) >= 4
        AND word_similarity(lower(raw_query), lower(coalesce(a.title_tr, ''))) > 0.3
      )
    );

  RETURN coalesce(result, 0);
END;
$$;

GRANT EXECUTE ON FUNCTION count_search_articles_v2(text, text, text, timestamptz)
  TO anon, authenticated;
