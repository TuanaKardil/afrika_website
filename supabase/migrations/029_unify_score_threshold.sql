-- Unify the publication score threshold to 6 across the search RPCs so they
-- match the article page, listings, sitemap, news-sitemap and RSS (all now
-- MIN_PUBLISHED_SCORE = 6). Previously these two filtered `score IS NULL OR
-- score >= 5`, leaving the search surface one rung looser than everything else.
-- Bodies are identical to the live definitions except the score predicate.

CREATE OR REPLACE FUNCTION public.search_articles_v2(
  raw_query text, tsq_string text,
  filter_nav text DEFAULT NULL::text,
  filter_from timestamp with time zone DEFAULT NULL::timestamp with time zone,
  lim integer DEFAULT 12, off integer DEFAULT 0
)
RETURNS SETOF articles
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $function$
DECLARE
  parsed_tsq tsquery;
BEGIN
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
      word_similarity(lower(raw_query), lower(coalesce(a.title_tr, ''))) AS trgm_rank
  ) scores ON true
  WHERE
    a.is_suppressed = false
    AND a.score >= 6
    AND a.title_tr IS NOT NULL
    AND (filter_nav IS NULL OR a.nav_tab_slug = filter_nav)
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
    )
  ORDER BY
    (scores.ft_rank * 2.0 + scores.trgm_rank * 0.5) DESC,
    a.published_at DESC
  LIMIT lim
  OFFSET off;
END;
$function$;

CREATE OR REPLACE FUNCTION public.count_search_articles_v2(
  raw_query text, tsq_string text,
  filter_nav text DEFAULT NULL::text,
  filter_from timestamp with time zone DEFAULT NULL::timestamp with time zone
)
RETURNS bigint
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $function$
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
    AND a.score >= 6
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
$function$;
