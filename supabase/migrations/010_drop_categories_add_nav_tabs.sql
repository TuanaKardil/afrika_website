-- Drop old categories table and replace with nav_tabs
-- categories was the old navigation structure; nav_tabs reflects the 8-tab spec

-- Remove FK before dropping
ALTER TABLE articles DROP CONSTRAINT IF EXISTS articles_category_slug_fkey;
ALTER TABLE articles DROP COLUMN IF EXISTS category_slug;

DROP TABLE IF EXISTS categories CASCADE;

CREATE TABLE nav_tabs (
  slug text PRIMARY KEY,
  name_tr text NOT NULL,
  display_order integer NOT NULL DEFAULT 0
);

INSERT INTO nav_tabs (slug, name_tr, display_order) VALUES
  ('firsatlar',           'Fırsatlar',                    1),
  ('pazarlar-ekonomi',    'Pazarlar & Ekonomi',           2),
  ('ticaret-ihracat',     'Ticaret & İhracat',            3),
  ('sektorler',           'Sektörler',                    4),
  ('turk-is-dunyasi',     'Türk İş Dünyası Afrika''da',   5),
  ('etkinlikler-fuarlar', 'Etkinlikler & Fuarlar',        6),
  ('ulkeler',             'Ülkeler',                      7),
  ('diger',               'Diğer',                        8);
