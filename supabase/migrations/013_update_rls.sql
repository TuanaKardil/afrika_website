-- RLS for new nav_tabs and sectors tables
ALTER TABLE nav_tabs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sectors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "nav_tabs_public_select"
  ON nav_tabs FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "nav_tabs_service_write"
  ON nav_tabs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "sectors_public_select"
  ON sectors FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "sectors_service_write"
  ON sectors FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Update articles public SELECT to exclude suppressed articles
DROP POLICY IF EXISTS "articles_public_select" ON articles;

CREATE POLICY "articles_public_select"
  ON articles FOR SELECT
  TO anon, authenticated
  USING (is_suppressed = false);
