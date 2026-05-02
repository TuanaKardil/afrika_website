export const NAV_LABELS: Record<string, string> = {
  firsatlar: "Fırsatlar",
  "pazarlar-ekonomi": "Pazarlar & Ekonomi",
  "ticaret-ihracat": "Ticaret & İhracat",
  sektorler: "Sektörler",
  "turk-is-dunyasi": "Türk İş Dünyası",
  "etkinlikler-fuarlar": "Etkinlikler & Fuarlar",
  ulkeler: "Ülkeler",
  diger: "Diğer",
  ihaleler: "İhaleler",
};

export const SECTOR_LABELS: Record<string, string> = {
  "insaat-muteahhitlik":     "İnşaat & Müteahhitlik",
  "enerji":                  "Enerji",
  "savunma-sanayi":          "Savunma Sanayi",
  "madencilik":              "Madencilik",
  "tekstil-hazir-giyim":     "Tekstil & Hazır Giyim",
  "kozmetik-hijyen":         "Kozmetik & Hijyen",
  "demir-celik-sanayi":      "Demir-Çelik & Sanayi",
  "tarim-gida":              "Tarım & Gıda",
  "otomotiv":                "Otomotiv",
  "ambalaj-geri-donusum":    "Ambalaj & Geri Dönüşüm",
  "bankacilik-finans":       "Bankacılık & Finans",
  "beyaz-esya-ev-aletleri":  "Beyaz Eşya & Ev Aletleri",
  "cimento-insaat-malzemeleri": "Çimento & İnşaat Malzemeleri",
  "ev-tekstili-hali":        "Ev Tekstili & Halı",
  "gayrimenkul-konut":       "Gayrimenkul & Konut",
  "havacilik-sivil-havacilik": "Havacılık & Sivil Havacılık",
  "hvac-r":                  "HVAC-R",
  "kimya-petrokimya":        "Kimya & Petrokimya",
  "lojistik-tasimaci":       "Lojistik & Taşımacılık",
  "makine-yedek-parca":      "Makine & Yedek Parça",
  "mobilya-dekorasyon":      "Mobilya & Dekorasyon",
  "perakende-e-ticaret":     "Perakende & E-ticaret",
  "saglik-saglik-turizmi":   "Sağlık & Sağlık Turizmi",
  "teknoloji-yazilim":       "Teknoloji & Yazılım",
  "turizm-otelcilik":        "Turizm & Otelcilik",
  "diger-sektor":            "Diğer Sektörler",
};

export function resolveCategory(
  navTabSlug: string | null,
  sectorSlugs: string[],
  hashtags?: string[] | null,
): string | null {
  if (!navTabSlug) return null;
  if (navTabSlug === "diger") {
    const specificSector = sectorSlugs.find((s) => s !== "diger-sektor");
    if (specificSector) return SECTOR_LABELS[specificSector] ?? null;
    return hashtags?.[0] ?? null;
  }
  return NAV_LABELS[navTabSlug] ?? null;
}
