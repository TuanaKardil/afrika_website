-- Permanent URL guarantee for /haber/<slug>.
--
-- Background: StoragePipeline used to re-compute and re-write articles.slug on
-- every content update. _make_slug() appends a random 6-hex suffix only on
-- collision, and on the update path an article always collides with its own
-- stored slug, so each update flipped the public URL
-- (base -> base-a1b2c3 -> base -> ...) and 404-ed every previously indexed or
-- shared link. The code no longer touches slug on update, but code fixes only
-- bind the code paths we know about: a manual Supabase dashboard edit, a future
-- backfill, or a deliberate title correction could still move a URL.
--
-- This migration makes the guarantee structural instead of procedural: the
-- database itself records every slug a row has ever had, so any old URL stays
-- resolvable to a 308 forever, no matter which code path moved it.

CREATE TABLE article_slug_history (
  old_slug   text PRIMARY KEY,
  article_id uuid NOT NULL REFERENCES articles(id) ON DELETE CASCADE,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_article_slug_history_article_id ON article_slug_history(article_id);

COMMENT ON TABLE article_slug_history IS
  'Every slug an article has ever had. Populated automatically by the '
  'trg_articles_record_slug_change trigger. Read by '
  'resolveLegacyArticleSlug() to 308 old URLs to the current one. '
  'Rows are never deleted except when the slug is re-taken by its own article.';

-- Records the outgoing slug whenever articles.slug changes.
--
-- SECURITY INVOKER (migration 027 convention): only the service role can update
-- articles.slug under RLS, and the service role bypasses RLS on the history
-- table too, so no elevated rights are needed here.
CREATE OR REPLACE FUNCTION record_article_slug_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF NEW.slug IS DISTINCT FROM OLD.slug THEN
    -- Remember where the old URL should now point.
    INSERT INTO public.article_slug_history (old_slug, article_id, changed_at)
    VALUES (OLD.slug, OLD.id, now())
    ON CONFLICT (old_slug) DO UPDATE
      SET article_id = EXCLUDED.article_id,
          changed_at = EXCLUDED.changed_at;

    -- The slug being moved TO is live again, so it must not also be
    -- advertised as a historical redirect (that would be a redirect loop).
    DELETE FROM public.article_slug_history WHERE old_slug = NEW.slug;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_articles_record_slug_change
  AFTER UPDATE OF slug ON articles
  FOR EACH ROW
  EXECUTE FUNCTION record_article_slug_change();

-- RLS: public read (the redirect lookup runs with the anon key),
-- service-role write. Same pattern as sectors/regions/authors.
ALTER TABLE article_slug_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "article_slug_history_public_select"
  ON article_slug_history FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "article_slug_history_service_write"
  ON article_slug_history FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Slugs must be ASCII url-safe. The now-deleted scraper/backfill_slugs.py
-- carried an older _make_slug() that lacked the NFKD/ASCII pass, so Python's
-- Unicode-aware \w let accented chars through: two rows shipped with "kâri" /
-- "kârlari" in the slug. Those URLs can never be matched by an incoming
-- request, so both articles 404-ed while still being listed in sitemap.xml.
-- Repair any stragglers, then let the database refuse them for good.
UPDATE articles
   SET slug = regexp_replace(
                lower(translate(slug,
                  'àáâãäåèéêëìíîïòóôõöùúûüýÿñçÀÁÂÃÄÅÈÉÊËÌÍÎÏÒÓÔÕÖÙÚÛÜÝÑÇ',
                  'aaaaaaeeeeiiiiooooouuuuyyncAAAAAAEEEEIIIIOOOOOUUUUYNC')),
                '[^a-z0-9-]', '', 'g')
 WHERE slug ~ '[^a-z0-9-]';

ALTER TABLE articles
  ADD CONSTRAINT articles_slug_url_safe CHECK (slug ~ '^[a-z0-9][a-z0-9-]*$');
