-- 034: make search use a stored tsvector instead of rebuilding it per row
--
-- search_articles_v2 built its weighted tsvector at RUNTIME, for every row, and
-- twice (once in WHERE, once for the ts_rank in ORDER BY). The existing
-- idx_articles_fulltext is on a DIFFERENT expression
-- (to_tsvector('turkish', title_tr || ' ' || content_tr)), so it could never
-- serve this query, and every search re-tokenised all 1031 article bodies.
--
-- Measured before: 1304 ms / 7092 buffers, which is why /arama took 4.58 s end
-- to end and the suggest API 1.2-2.1 s per keystroke.
-- Measured after: 4-42 ms, with byte-identical results and counts on
-- "nijerya" (339), "fas" (113), "maden" (378) and the fuzzy "nijerja" (148).

-- array_to_string(anyarray, text) is STABLE, because its volatility is declared
-- for the generic anyarray case. That blocks a GENERATED column. For text[] the
-- result is deterministic, so an IMMUTABLE wrapper is safe and is the only way
-- to store this exact expression.
CREATE OR REPLACE FUNCTION public.immutable_array_to_string(text[], text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
SET search_path TO 'public'
AS $$ SELECT array_to_string($1, $2) $$;

-- The stored column must match what the function tests, character for
-- character, or the index cannot be used. Note 'simple'::regconfig: the bare
-- literal resolves to the one-argument to_tsvector(text), which is STABLE and
-- would also block the generated column.
ALTER TABLE articles ADD COLUMN IF NOT EXISTS search_vector tsvector
  GENERATED ALWAYS AS (
    setweight(to_tsvector('simple'::regconfig, coalesce(title_tr,   '')), 'A') ||
    setweight(to_tsvector('simple'::regconfig, coalesce(excerpt_tr, '')), 'B') ||
    setweight(to_tsvector('simple'::regconfig,
      immutable_array_to_string(coalesce(hashtags, ARRAY[]::text[]), ' ')), 'B') ||
    setweight(to_tsvector('simple'::regconfig, coalesce(content_tr, '')), 'C')
  ) STORED;

CREATE INDEX IF NOT EXISTS articles_search_vector_gin
  ON articles USING gin (search_vector);

-- Supports the fuzzy branch. Note it is not reachable through the `<%` operator
-- here: that needs pg_trgm.word_similarity_threshold, which Supabase does not
-- let this role set. Keeping `word_similarity(...) > 0.3` means the branch is a
-- scan, but it only touches short titles and measures ~30 ms on its own, versus
-- the 1300 ms that came from tokenising full article bodies.
CREATE INDEX IF NOT EXISTS articles_title_trgm
  ON articles USING gin (lower(title_tr) gin_trgm_ops);


CREATE OR REPLACE FUNCTION public.search_articles_v2(
  raw_query   text,
  tsq_string  text,
  filter_nav  text DEFAULT NULL,
  filter_from timestamptz DEFAULT NULL,
  lim         integer DEFAULT 12,
  off         integer DEFAULT 0
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
  WHERE
    a.is_suppressed = false
    AND a.score >= 6
    AND a.title_tr IS NOT NULL
    AND (filter_nav  IS NULL OR a.nav_tab_slug  = filter_nav)
    AND (filter_from IS NULL OR a.published_at >= filter_from)
    AND (
      a.search_vector @@ parsed_tsq
      OR (
        length(raw_query) >= 4
        AND word_similarity(lower(raw_query), lower(coalesce(a.title_tr, ''))) > 0.3
      )
    )
  ORDER BY
    (
      ts_rank(a.search_vector, parsed_tsq) * 2.0
      + word_similarity(lower(raw_query), lower(coalesce(a.title_tr, ''))) * 0.5
    ) DESC,
    a.published_at DESC
  LIMIT lim
  OFFSET off;
END;
$function$;


CREATE OR REPLACE FUNCTION public.count_search_articles_v2(
  raw_query   text,
  tsq_string  text,
  filter_nav  text DEFAULT NULL,
  filter_from timestamptz DEFAULT NULL
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
      a.search_vector @@ parsed_tsq
      OR (
        length(raw_query) >= 4
        AND word_similarity(lower(raw_query), lower(coalesce(a.title_tr, ''))) > 0.3
      )
    );

  RETURN coalesce(result, 0);
END;
$function$;

-- RLS: no new table and no policy change. search_vector is a generated column
-- on articles, covered by the existing SELECT policy (CLAUDE.md working rule 4).
-- Postgres maintains it; the scraper never writes it.
--
-- Frontend: search_articles_v2 still RETURNS SETOF articles, so the new column
-- rides along in RPC responses. lib/queries uses an explicit column list for
-- listings, so payloads are unaffected, but database.types.ts should be
-- regenerated so the type matches the table.
