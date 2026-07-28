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
  "zambiya-275-milyon-dolar-enerji-projeleri-icin-borc-anlasmasi-sagladi",
  "afrika-madenleri-b2goldun-200-milyon-dolarlik-kârini-artirdi",
  "air-france-qatar-airways-emirates-afrikada-uc-farkli-havayolu-stratejisi-7be9ca",
  "mauritius-turizm-mucizesinden-daha-fazlasini-elde-edebilir-mi-3c217c",
  "guney-afrika-sermaye-piyasalari-nasil-coktu",
  "angola-bu-yil-ikinci-kez-eurobond-ihrac-etti-15-milyar-dolar-topladi",
  "iran-savasi-guney-afrikanin-dizel-bagimliligini-ortaya-cikariyor-neler-yanlis-gi-6eb6cd",
  "kenyadan-safaricom-etiyopyada-zarari-azaltarak-kâr-beklentisini-asti",
  "guney-afrika-randi-dolar-karsisinda-sabit-kalirken-gozler-iran-ve-abd-enflasyon-",
  "nijeryada-tinubu-reformlar-zorluklara-ragmen-ekonomiyi-istikrara-kavusturuyor",
  "guney-afrikada-spar-kâri-dustu-borclar-artarken-ticari-baskilar-yogunlasti-756df6",
  "fas-cinin-yesil-ekonomi-hakimiyetinde-stratejik-merkez-haline-geliyor",
  "guney-afrikada-sermaye-piyasalarinin-sonu-bir-donemin-ardindan-gelen-uzuntu",
  "guney-afrika-randi-petrol-fiyatlarindaki-dusus-ve-iran-anlasmasi-umutlariyla-yuk-b65d9b",
  "hurmuz-bogazi-endiseleri-afrikayi-hindistan-icin-hayati-kaynak-haline-getirdi",
  "gana-ham-altin-ihracatini-durduruyor-yeni-rafineri-anlasmasi-istihdam-ve-gelir-k",
  "guney-afrika-tfg-kâr-dususuyle-magaza-kapatiyor-harcamalari-kisiyor",
  "afrika-para-birimleri-icin-karisik-gorunum-gana-kenya-ve-uganda-zayiflayabilir",
  "guney-afrikada-spar-kâri-dustu-borclar-artarken-ticari-baskilar-yogunlasti",
  "abdden-afrikaya-yeni-yatirim-dil-maden-ve-diplomasi-odakli-reformlar",
  "etiyopya-tahvil-sahipleri-yeniden-yapilandirma-teklifini-reddetti",
  "dangote-group-nijeryadaki-rafineri-isletmesi-icin-eylul-ayinda-halka-arz-hedefli",
  "afdb-toplantisi-ebola-golgesinde-afrika-kalkinma-icin-kaynak-ariyor",
  "huawei-sonbaharda-yeni-akilli-telefon-cipleriyle-sahne-aliyor-nvidia-ve-apple-re",
  "guney-afrikada-omnianin-kâri-21-artti-amonyak-tedarikini-guvence-altina-aldi",
  "kongo-demokratik-cumhuriyeti-guney-kivuda-madencilik-faaliyetlerini-askiya-aldi-d6dae4",
  "nijeryada-telekom-harcamalari-56-milyar-dolari-asti-veri-kullanimi-ve-zamlar-gel",
  "guney-afrikada-pick-n-pay-vergi-oncesi-kâra-gecti-boxer-performansi-artirdi",
  "kongo-cumhuriyeti-afrikali-seyahatler-icin-vize-muafiyeti-yarisina-katildi",
  "rusyadan-afrikaya-20-milyar-dolarlik-savunma-anlasmasi-150-sozlesme-yapildi",
  "senegalde-borc-krizi-derinlesirken-ekonomi-bakani-basbakan-oldu",
  "nijerya-ekonomisi-2026nin-ilk-ceyreginde-yavasladi",
  "tanzanyali-amsons-dogu-afrikanin-stratejik-enerji-agini-250-milyon-dolara-aliyor",
  "guney-afrikada-pepkorun-yari-yil-kazanci-yuzde-103-artti",
  "zimbabvede-altin-uretimi-patladi-2026da-sektor-gucleniyor",
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
  "cinin-kahve-hamlesi-afrikanin-tarimsal-ihracatini-yeniden-sekillendirebilir-fe6ce4",
  "iran-savasi-guney-afrikayi-petrol-krizine-surukluyor-veri-bosluklari-ve-dusuk-st",
  "cinin-gozetim-teknolojisi-afrika-sehirlerinde-yayginlasiyor",
  "afrikada-dizel-fiyatlari-yukseliyor-mayis-2026-en-pahali-10-ulke-ea3efe",
  "afrika-icecek-pazari-50-milyar-dolarlik-yeni-kurumsal-doneme-giriyor",
]);
