-- Add image_srcset column to articles.
-- Stores a ready-to-use WebP srcset string (full public URLs + `w` descriptors)
-- built at upload/backfill time, e.g.
--   ".../name-400.webp 400w, .../name-800.webp 800w, .../name-1200.webp 1200w"
-- The frontend drops this straight into <img srcSet>; featured_image_url (the
-- JPEG) remains the src fallback. NULL when the article has no responsive
-- variants (admin-uploaded images, generation failure). The string is
-- self-describing, so no per-image width metadata is needed anywhere else.
ALTER TABLE articles ADD COLUMN IF NOT EXISTS image_srcset text;
