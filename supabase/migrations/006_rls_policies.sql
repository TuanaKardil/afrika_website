-- Enable RLS on all tables
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_articles ENABLE ROW LEVEL SECURITY;

-- articles: public read, service_role write
CREATE POLICY "articles_public_select"
  ON articles FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "articles_service_insert"
  ON articles FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "articles_service_update"
  ON articles FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "articles_service_delete"
  ON articles FOR DELETE
  TO service_role
  USING (true);

-- categories: public read, service_role write
CREATE POLICY "categories_public_select"
  ON categories FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "categories_service_insert"
  ON categories FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "categories_service_update"
  ON categories FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "categories_service_delete"
  ON categories FOR DELETE
  TO service_role
  USING (true);

-- regions: public read, service_role write
CREATE POLICY "regions_public_select"
  ON regions FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "regions_service_insert"
  ON regions FOR INSERT
  TO service_role
  WITH CHECK (true);

CREATE POLICY "regions_service_update"
  ON regions FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "regions_service_delete"
  ON regions FOR DELETE
  TO service_role
  USING (true);

-- saved_articles: each user sees and manages only their own rows
CREATE POLICY "saved_articles_user_select"
  ON saved_articles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "saved_articles_user_insert"
  ON saved_articles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "saved_articles_user_delete"
  ON saved_articles FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
