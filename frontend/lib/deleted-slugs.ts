// Slugs confirmed permanently deleted (originally sourced from Google Search
// Console, July 2026). middleware.ts answers these with 410 Gone so Google
// deindexes them quickly.
//
// DANGER: a 410 is irreversible for ranking purposes. This list once contained
// 12 slugs that were NOT deleted at all: 10 were merely OLD slugs of still-live
// articles (killed by the slug-churn bug, see CLAUDE.md rule 22) and 2 were
// live articles whose slug held a non-ASCII char. They 404-ed in Search
// Console, were read as "deleted", and were hard-410-ed, destroying the
// ranking of real articles.
//
// Never add a slug here from a Search Console 404 alone. A 404 is far more
// likely to be a moved slug than a deleted article, and app/haber/[slug]
// already 308s those to the live URL. Only list slugs whose article is truly
// gone from the DB. scripts/check-deleted-slugs.mjs runs as prebuild and FAILS
// the build if any entry here resolves to a live article.
export const DELETED_HABER_SLUGS = new Set([
  "ruanda-merkez-bankasi-enflasyon-hedefin-cok-uzerindeyken-politika-faizini-yenide",
  "afrika-madenleri-b2goldun-200-milyon-dolarlik-kârini-artirdi",
  "mauritius-turizm-mucizesinden-daha-fazlasini-elde-edebilir-mi-3c217c",
  "iran-savasi-guney-afrikanin-dizel-bagimliligini-ortaya-cikariyor-neler-yanlis-gi-6eb6cd",
  "kenyadan-safaricom-etiyopyada-zarari-azaltarak-kâr-beklentisini-asti",
  "guney-afrika-randi-dolar-karsisinda-sabit-kalirken-gozler-iran-ve-abd-enflasyon-",
  "nijeryada-tinubu-reformlar-zorluklara-ragmen-ekonomiyi-istikrara-kavusturuyor",
  "guney-afrikada-spar-kâri-dustu-borclar-artarken-ticari-baskilar-yogunlasti-756df6",
  "guney-afrikada-sermaye-piyasalarinin-sonu-bir-donemin-ardindan-gelen-uzuntu",
  "guney-afrika-randi-petrol-fiyatlarindaki-dusus-ve-iran-anlasmasi-umutlariyla-yuk-b65d9b",
  "guney-afrika-tfg-kâr-dususuyle-magaza-kapatiyor-harcamalari-kisiyor",
  "afrika-para-birimleri-icin-karisik-gorunum-gana-kenya-ve-uganda-zayiflayabilir",
  "guney-afrikada-spar-kâri-dustu-borclar-artarken-ticari-baskilar-yogunlasti",
  "abdden-afrikaya-yeni-yatirim-dil-maden-ve-diplomasi-odakli-reformlar",
  "etiyopya-tahvil-sahipleri-yeniden-yapilandirma-teklifini-reddetti",
  "afdb-toplantisi-ebola-golgesinde-afrika-kalkinma-icin-kaynak-ariyor",
  "huawei-sonbaharda-yeni-akilli-telefon-cipleriyle-sahne-aliyor-nvidia-ve-apple-re",
  "kongo-demokratik-cumhuriyeti-guney-kivuda-madencilik-faaliyetlerini-askiya-aldi-d6dae4",
  "guney-afrikada-pick-n-pay-vergi-oncesi-kâra-gecti-boxer-performansi-artirdi",
  "kongo-cumhuriyeti-afrikali-seyahatler-icin-vize-muafiyeti-yarisina-katildi",
  "senegalde-borc-krizi-derinlesirken-ekonomi-bakani-basbakan-oldu",
  "nijerya-ekonomisi-2026nin-ilk-ceyreginde-yavasladi",
  "guney-afrikada-pepkorun-yari-yil-kazanci-yuzde-103-artti",
  "ekonomist-wantchekon-afrikada-kayit-disi-ekonomiyi-kayit-altina-almak-142-milyar",
  "guney-afrikada-pick-n-pay-vergi-oncesi-kâra-dondu-boxer-performansi-guclendirdi",
  "guney-afrikada-2026-misir-hasadi-yuzde-25-artisla-17-milyon-ton-bekleniyor",
  "standard-bank-afrikanin-en-degerli-bankasi-unvanini-capitec-ve-firstranddan-aldi",
  "zambiya-2053-vadeli-tahvilini-geri-almak-icin-afdb-kredisi-kullanacak",
  "afrika-borc-tuzagindan-nasil-kurtulabilir",
  "mozambik-faiz-oranini-sabit-tuttu-enflasyon-riski-uyarisi-yapti",
  "fildisi-sahilinde-artan-yagislar-kakao-hasadini-destekliyor",
  "guney-afrikada-tfgnin-yillik-kâri-tuketici-harcamalarindaki-dususle-azaldi",
  "guney-afrikada-tfgnin-yillik-kâri-tuketici-harcamalarindaki-daralma-nedeniyle-du",
  "nijerya-lideri-tinubu-reformlar-zorluklara-ragmen-ekonomiyi-istikrara-kavusturuy",
  "iran-savasi-guney-afrikayi-petrol-krizine-surukluyor-veri-bosluklari-ve-dusuk-st",
  "cinin-gozetim-teknolojisi-afrika-sehirlerinde-yayginlasiyor",
  "afrikada-dizel-fiyatlari-yukseliyor-mayis-2026-en-pahali-10-ulke-ea3efe",
]);
