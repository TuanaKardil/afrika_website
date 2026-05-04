// Sample data for the demo. All copy in Turkish, no em dashes.

const SECTORS = [
  { slug: "insaat", name: "İnşaat", change: 2.1, dir: "up" },
  { slug: "enerji", name: "Enerji", change: 4.2, dir: "up" },
  { slug: "savunma", name: "Savunma", change: -0.8, dir: "down" },
  { slug: "madencilik", name: "Madencilik", change: 1.5, dir: "up" },
  { slug: "tekstil", name: "Tekstil", change: null, dir: "flat" },
  { slug: "otomotiv", name: "Otomotiv", change: 3.4, dir: "up" },
  { slug: "tarim", name: "Tarım & Gıda", change: -1.2, dir: "down" },
  { slug: "kimya", name: "Kimya", change: 0.6, dir: "up" },
  { slug: "lojistik", name: "Lojistik", change: 1.9, dir: "up" },
  { slug: "fintech", name: "Fintech", change: 5.1, dir: "up" },
  { slug: "telekom", name: "Telekom", change: -0.3, dir: "down" },
];

const NAV_TABS = [
  { slug: "firsatlar", label: "Fırsatlar" },
  { slug: "pazarlar-ekonomi", label: "Pazarlar & Ekonomi" },
  { slug: "ticaret", label: "Ticaret" },
  { slug: "sektorler", label: "Sektör Haberleri", hasDropdown: true },
  { slug: "etkinlikler-fuarlar", label: "Etkinlikler & Fuarlar" },
  { slug: "ulkeler", label: "Ülkeler", hasCountryDropdown: true },
];

const SECTOR_DROPDOWN = [
  "İnşaat & Müteahhitlik", "Enerji", "Savunma Sanayi",
  "Madencilik", "Tekstil & Hazır Giyim", "Kozmetik & Hijyen",
  "Demir-Çelik & Sanayi", "Tarım & Gıda", "Otomotiv", "Diğer",
];

const LEAD_ARTICLE = {
  id: "lead",
  title: "Türk müteahhitler Cezayir'de 1,2 milyar dolarlık otoyol ihalesini kazandı",
  excerpt: "Üç firmadan oluşan Türk konsorsiyumu, başkent Cezayir'i Tlemcen'e bağlayacak 540 kilometrelik otoyol projesini 18 ay içinde teslim etmek üzere üstlendi.",
  category: "İNŞAAT",
  ago: "2 SAAT ÖNCE",
  imgGrad: "linear-gradient(135deg,#0a2351 0%,#1e6fb8 60%,#143063 100%)",
};

const SECONDARY = [
  {
    id: "s1",
    title: "Senegal LNG sahası ihracat faaliyetlerine resmen başladı",
    excerpt: "Yıllık 2,5 milyar metreküp kapasiteli tesis, ilk yüklemesini Avrupa pazarına gönderdi.",
    category: "ENERJİ",
    ago: "5 SAAT ÖNCE",
    imgGrad: "linear-gradient(135deg,#143063,#20407a)",
  },
  {
    id: "s2",
    title: "Aselsan'ın Mısır anlaşması son onay aşamasına geldi",
    excerpt: "İki ülke arasındaki radar sistemi ihracatı, Türkiye'nin Afrika'daki savunma ihracatında yeni bir kilometre taşı olacak.",
    category: "SAVUNMA",
    ago: "7 SAAT ÖNCE",
    imgGrad: "linear-gradient(135deg,#0a2351,#143063)",
  },
];

const SIDEBAR_LIST = [
  { id: "l1", title: "Gana altın üretiminde son on yılın rekorunu kırdı", category: "MADENCİLİK", ago: "1 SAAT ÖNCE" },
  { id: "l2", title: "Nijerya merkez bankası faizi yüzde 22,75'e indirdi", category: "PAZARLAR", ago: "3 SAAT ÖNCE" },
  { id: "l3", title: "Etiyopya'da yeni serbest ticaret bölgesi açıldı", category: "TİCARET", ago: "4 SAAT ÖNCE" },
  { id: "l4", title: "Fas yenilenebilir enerji yatırımlarını ikiye katlıyor", category: "ENERJİ", ago: "6 SAAT ÖNCE" },
  { id: "l5", title: "Türk Hava Yolları Lagos seferlerini günlüğe çıkardı", category: "HAVACILIK", ago: "9 SAAT ÖNCE" },
  { id: "l6", title: "Kenya filo yenileme ihalesinde Türk firmaları öne çıktı", category: "OTOMOTİV", ago: "11 SAAT ÖNCE" },
];

const SECTOR_BLOCK = [
  { id: "se1", title: "Dakar'daki konut projesi temel atma törenine hazır", category: "İNŞAAT", ago: "12 SAAT ÖNCE", imgGrad: "linear-gradient(135deg,#1e6fb8,#143063)" },
  { id: "se2", title: "Kıbrıs Türk şirketi Mozambik'te güneş santrali kuracak", category: "ENERJİ", ago: "1 GÜN ÖNCE", imgGrad: "linear-gradient(135deg,#20407a,#0a2351)" },
  { id: "se3", title: "BMC Tanzanya filosu için 220 araç teslim ediyor", category: "OTOMOTİV", ago: "1 GÜN ÖNCE", imgGrad: "linear-gradient(135deg,#143063,#1e6fb8)" },
  { id: "se4", title: "Mısır pamuk ihracatında Türkiye yeniden ilk sırada", category: "TEKSTİL", ago: "2 GÜN ÖNCE", imgGrad: "linear-gradient(135deg,#0a2351,#20407a)" },
];

const COUNTRY_BLOCK = [
  { id: "c1", title: "Lagos limanı genişleme ihalesi şubatta açılıyor", category: "NİJERYA", ago: "8 SAAT ÖNCE", imgGrad: "linear-gradient(135deg,#143063,#1e6fb8)" },
  { id: "c2", title: "Süveyş ekonomik bölgesi Türk yatırımcıyı çağırıyor", category: "MISIR", ago: "10 SAAT ÖNCE", imgGrad: "linear-gradient(135deg,#1e6fb8,#0a2351)" },
  { id: "c3", title: "Nairobi metro projesi finansman aşamasında", category: "KENYA", ago: "13 SAAT ÖNCE", imgGrad: "linear-gradient(135deg,#0a2351,#1e6fb8)" },
  { id: "c4", title: "Addis Ababa havalimanı genişlemesinde Türk imzası", category: "ETİYOPYA", ago: "1 GÜN ÖNCE", imgGrad: "linear-gradient(135deg,#20407a,#143063)" },
];

const POPULAR = [
  { id: "p1", title: "Senegal LNG sahası ihracata başladı", category: "ENERJİ" },
  { id: "p2", title: "Cezayir'de 1,2 milyar dolarlık otoyol ihalesi Türk konsorsiyumuna verildi", category: "İNŞAAT" },
  { id: "p3", title: "Aselsan'ın Mısır anlaşması son onay aşamasında", category: "SAVUNMA" },
  { id: "p4", title: "Gana altın üretiminde rekor kırdı", category: "MADENCİLİK" },
  { id: "p5", title: "Nijerya merkez bankası faizi indirdi", category: "PAZARLAR" },
];

window.AH_DATA = { SECTORS, NAV_TABS, SECTOR_DROPDOWN, LEAD_ARTICLE, SECONDARY, SIDEBAR_LIST, SECTOR_BLOCK, COUNTRY_BLOCK, POPULAR };
