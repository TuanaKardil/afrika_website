-- Add meta_description_tr column for AI-generated SEO meta descriptions
ALTER TABLE articles ADD COLUMN IF NOT EXISTS meta_description_tr TEXT;
