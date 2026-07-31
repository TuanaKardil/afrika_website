-- 033: allow the ten new news sources on articles.source
--
-- The CHECK from 012 pinned articles.source to the original five slugs. Any new
-- spider's insert would fail it, and StoragePipeline only logged the error, so
-- the run would look green while publishing nothing. That silent-failure path is
-- fixed in the same change (pipelines.py now raises the log level and
-- distinguishes a constraint violation from a slug collision), and the CHECK is
-- kept: it is the only thing stopping a typo'd slug from silently opening a new
-- folder in Supabase Storage, since `source` is also the storage path prefix.
--
-- No language column is added on purpose. Language is a property of the SOURCE,
-- not the article, and every source is monolingual; scraper/scraper/sources.py
-- owns it. Revisit only if a source starts publishing multiple languages under
-- one domain.
--
-- Verified against the live database before applying: SELECT source, count(*)
-- FROM articles GROUP BY 1 returns only the five original slugs (885 rows).
--
-- Note the live constraint had drifted from migration 012: it still carried
-- 'bbc' from migration 003. Zero rows use it, so it is dropped here rather than
-- carried forward, and the constraint now matches sources.py exactly.

ALTER TABLE articles DROP CONSTRAINT IF EXISTS articles_source_check;

ALTER TABLE articles ADD CONSTRAINT articles_source_check
  CHECK (source IN (
    -- original five
    'the_conversation',
    'africa_report',
    'cnbc_africa',
    'aa_africa',
    'business_insider',
    -- added 2026-07 (see scraper/scraper/sources.py for the full registry)
    'ecofin',
    'business_daily_africa',
    'business_in_cameroon',
    'medias24',
    'nairametrics',
    'bft_online',
    'daily_news_egypt',
    'capital_ethiopia',
    'new_times_rwanda',
    'mozambique_360'
  ));

-- RLS: no new table or column, so the existing articles policies apply
-- unchanged. Reviewed per CLAUDE.md working rule 4.
