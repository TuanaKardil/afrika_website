-- tender_categories (must exist before tenders FK)
CREATE TABLE tender_categories (
  slug         text PRIMARY KEY,
  name_tr      text NOT NULL,
  icon         text,
  display_order int
);

INSERT INTO tender_categories (slug, name_tr, icon, display_order) VALUES
  ('altyapi',     'Altyapı & İnşaat',      'hard-hat',    1),
  ('enerji',      'Enerji & Çevre',         'zap',         2),
  ('saglik',      'Sağlık',                 'heart-pulse', 3),
  ('tarim',       'Tarım & Gıda',           'wheat',       4),
  ('teknoloji',   'Teknoloji & Dijital',    'cpu',         5),
  ('lojistik',    'Lojistik & Ulaşım',      'truck',       6),
  ('danismanlik', 'Danışmanlık',            'briefcase',   7),
  ('diger',       'Diğer',                  'folder',      8);

-- tenders (status computed in app layer)
CREATE TABLE tenders (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source               text NOT NULL CHECK (source IN ('afdb','worldbank','undp','afreximbank','african_union','dgmarket','ungm')),
  source_url           text UNIQUE NOT NULL,
  slug                 text UNIQUE NOT NULL,
  reference_number     text,
  institution          text,
  country              text,
  title_original       text NOT NULL,
  description_original text,
  content_hash         text,
  title_tr             text,
  description_tr       text,
  institution_tr       text,
  country_tr           text,
  tender_type          text CHECK (tender_type IN ('goods','works','services','consulting','expression_of_interest','rfp','other')),
  sector_slug          text REFERENCES sectors(slug),
  region_slug          text REFERENCES regions(slug),
  category_slug        text REFERENCES tender_categories(slug),
  published_at         timestamptz,
  deadline_at          timestamptz,
  project_start_at     timestamptz,
  project_end_at       timestamptz,
  budget_usd           numeric,
  document_urls        text[],
  contact_email        text,
  scraped_at           timestamptz DEFAULT now(),
  updated_at           timestamptz DEFAULT now(),
  view_count           int DEFAULT 0,
  is_featured          bool DEFAULT false,
  is_suppressed        bool DEFAULT false
);

-- saved_tenders
CREATE TABLE saved_tenders (
  user_id   uuid REFERENCES auth.users ON DELETE CASCADE,
  tender_id uuid REFERENCES tenders ON DELETE CASCADE,
  saved_at  timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, tender_id)
);

-- Indexes
CREATE INDEX idx_tenders_deadline   ON tenders (deadline_at DESC);
CREATE INDEX idx_tenders_published  ON tenders (published_at DESC);
CREATE INDEX idx_tenders_sector     ON tenders (sector_slug);
CREATE INDEX idx_tenders_region     ON tenders (region_slug);
CREATE INDEX idx_tenders_category   ON tenders (category_slug);
CREATE INDEX idx_tenders_source     ON tenders (source);
CREATE INDEX idx_tenders_suppressed ON tenders (is_suppressed);
CREATE INDEX idx_tenders_fts ON tenders
  USING gin(to_tsvector('simple', coalesce(title_tr,'') || ' ' || coalesce(description_tr,'')));

-- RLS
ALTER TABLE tenders           ENABLE ROW LEVEL SECURITY;
ALTER TABLE tender_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_tenders     ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_select_tenders"
  ON tenders FOR SELECT TO anon, authenticated USING (is_suppressed = false);
CREATE POLICY "service_role_write_tenders"
  ON tenders FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "public_select_tender_categories"
  ON tender_categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "service_role_write_tender_categories"
  ON tender_categories FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "users_own_saved_tenders"
  ON saved_tenders FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- auto-update updated_at
CREATE OR REPLACE FUNCTION update_tenders_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER tenders_updated_at
  BEFORE UPDATE ON tenders
  FOR EACH ROW EXECUTE FUNCTION update_tenders_updated_at();
