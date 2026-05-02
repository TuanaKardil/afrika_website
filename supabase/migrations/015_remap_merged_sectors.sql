-- Remap merged/deleted sector slugs in articles.sector_slugs
-- Merged: telekomunikasyon -> teknoloji-yazilim
-- Merged: fintech-dijital-odeme -> teknoloji-yazilim
-- Merged: ilac-tibbi-cihaz -> saglik-saglik-turizmi
-- Merged: yenilenebilir-enerji -> enerji
-- Deleted: fuarcilik-etkinlik (use etkinlikler-fuarlar nav_tab instead)

UPDATE articles
SET sector_slugs = (
  SELECT COALESCE(array_agg(DISTINCT new_slug ORDER BY new_slug), '{}')
  FROM (
    SELECT
      CASE s
        WHEN 'telekomunikasyon'    THEN 'teknoloji-yazilim'
        WHEN 'fintech-dijital-odeme' THEN 'teknoloji-yazilim'
        WHEN 'ilac-tibbi-cihaz'   THEN 'saglik-saglik-turizmi'
        WHEN 'yenilenebilir-enerji' THEN 'enerji'
        WHEN 'fuarcilik-etkinlik' THEN NULL
        ELSE s
      END AS new_slug
    FROM unnest(sector_slugs) AS s
  ) t
  WHERE new_slug IS NOT NULL
)
WHERE sector_slugs && ARRAY[
  'telekomunikasyon',
  'fintech-dijital-odeme',
  'ilac-tibbi-cihaz',
  'yenilenebilir-enerji',
  'fuarcilik-etkinlik'
];

-- Remove old sector rows (cascade-safe; articles no longer reference these slugs)
DELETE FROM sectors
WHERE slug IN (
  'telekomunikasyon',
  'fintech-dijital-odeme',
  'ilac-tibbi-cihaz',
  'yenilenebilir-enerji',
  'fuarcilik-etkinlik'
);
