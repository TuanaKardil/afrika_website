-- Create public storage bucket for article images
INSERT INTO storage.buckets (id, name, public)
VALUES ('article-images', 'article-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: public read
CREATE POLICY "storage_article_images_public_select"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'article-images');

-- Storage RLS: service_role write
CREATE POLICY "storage_article_images_service_insert"
  ON storage.objects FOR INSERT
  TO service_role
  WITH CHECK (bucket_id = 'article-images');

CREATE POLICY "storage_article_images_service_update"
  ON storage.objects FOR UPDATE
  TO service_role
  USING (bucket_id = 'article-images')
  WITH CHECK (bucket_id = 'article-images');

CREATE POLICY "storage_article_images_service_delete"
  ON storage.objects FOR DELETE
  TO service_role
  USING (bucket_id = 'article-images');
