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

// Hashtags that are geographic (countries, regions, cities) or personal names —
// these are not meaningful as article category labels.
const GEO_SKIP = new Set([
  // 54 African countries
  "Angola","Benin","Botsvana","Burkina Faso","Burundi","Cezayir","Cibuti","Çad",
  "DR Kongo","Ekvator Ginesi","Eritre","Esvatini","Etiyopya","Fas","Fildişi Sahili",
  "Gabon","Gambiya","Gana","Gine","Gine-Bissau","Güney Afrika Cumhuriyeti",
  "Güney Sudan","Kamerun","Kenya","Komorlar","Kongo Cumhuriyeti","Lesoto",
  "Liberya","Libya","Madagaskar","Malavi","Mali","Mauritius","Mısır","Moritanya",
  "Mozambik","Namibya","Nijer","Nijerya","Orta Afrika Cumhuriyeti","Ruanda",
  "Sao Tome ve Principe","Senegal","Seyşeller","Sierra Leone","Somali","Sudan",
  "Tanzanya","Togo","Tunus","Uganda","Yeşil Burun Adaları","Zambiya","Zimbabve",
  // Regions & geographic concepts
  "Sahra Altı Afrika","Sahel","Mağrip","Doğu Afrika","Batı Afrika","Kuzey Afrika",
  "Güney Afrika","Orta Afrika","Boynuz Afrika","Frankofon Afrika","Anglofon Afrika",
  "Lusofon Afrika","Frankofon Batı Afrika","Pan-Afrika","MENA","EMEA","Afrika",
  // Turkish cities
  "İstanbul","Ankara","İzmir","Bursa","Gaziantep","Mersin","Kayseri",
  // Person names (Section R of hashtag doc)
  "Recep Tayyip Erdoğan","Cumhurbaşkanlığı","Cyril Ramaphosa","Bola Tinubu",
  "Abdülfettah el-Sisi","William Ruto","Macky Sall","Bassirou Diomaye Faye",
  "Alassane Ouattara","Paul Kagame","Aliko Dangote","Patrice Motsepe",
  "Mo Ibrahim","Strive Masiyiwa","Tony Elumelu",
  // Turkey itself (too broad as a category)
  "Türkiye",
]);

function pickBestHashtag(hashtags: string[]): string | null {
  // First pass: skip geographic/personal hashtags and DEİK bilateral councils
  for (const tag of hashtags) {
    if (GEO_SKIP.has(tag)) continue;
    if (tag.startsWith("Türkiye-") && tag.endsWith(" İK")) continue;
    return tag;
  }
  return null;
}

export function resolveCategory(
  navTabSlug: string | null,
  sectorSlugs: string[],
  hashtags?: string[] | null,
): string | null {
  // For sektorler articles, show the specific sector name instead of "Sektörler"
  if (navTabSlug === "sektorler") {
    const specificSector = sectorSlugs.find((s) => s !== "diger-sektor");
    if (specificSector) return SECTOR_LABELS[specificSector] ?? null;
    return SECTOR_LABELS["diger-sektor"] ?? "Sektörler";
  }
  if (navTabSlug && navTabSlug !== "diger") {
    return NAV_LABELS[navTabSlug] ?? null;
  }
  // navTabSlug is null or "diger": sector first, then best hashtag
  const specificSector = sectorSlugs.find((s) => s !== "diger-sektor");
  if (specificSector) return SECTOR_LABELS[specificSector] ?? null;
  return pickBestHashtag(hashtags ?? []);
}
