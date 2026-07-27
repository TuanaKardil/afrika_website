-- Named site authors (yazar kadrosu) + per-article author assignment.
--
-- The 7 authors are assigned to articles deterministically by region_slug /
-- nav_tab_slug (see scraper/scraper/authors.py assign_author). This table powers
-- the /yazarlar pages, the article byline, and JSON-LD Person author.

CREATE TABLE authors (
  slug            text PRIMARY KEY,
  name            text NOT NULL,
  role_tr         text NOT NULL,   -- byline title, e.g. "Kuzey Afrika Editoru"
  region_label_tr text,            -- human region label, e.g. "Frankofon Bati Afrika"
  bio_tr          text NOT NULL,   -- site-ready biography paragraph
  avatar_url      text,            -- nullable; reserved for future use (no photos yet)
  sort_order      integer NOT NULL DEFAULT 0
);

INSERT INTO authors (slug, name, role_tr, region_label_tr, bio_tr, sort_order) VALUES
  (
    'elodie-kouassi',
    'Elodie Aya Kouassi',
    'Frankofon Batı Afrika Muhabiri',
    'Frankofon Batı Afrika',
    'Fildişi Sahili''nin Bouaké kentinde büyüyen Elodie Aya Kouassi, Anadolu Üniversitesi Gazetecilik Bölümü son sınıf öğrencisidir. Eskişehir''de yerel medya deneyimi kazanan Kouassi, Afrika Haberleri''nde Frankofon Batı Afrika''nın tarım, tüketici pazarları, girişimcilik ve toplumsal gelişmelerini takip etmektedir.',
    1
  ),
  (
    'amina-bello',
    'Amina Yusuf Bello',
    'Anglosakson Batı Afrika Muhabiri',
    'Anglosakson Batı Afrika',
    'Nijerya''nın Kano kentinden Amina Yusuf Bello, Karabük Üniversitesi Uluslararası Ticaret ve Finansman Bölümü mezunudur. Yerel medya ve ihracat operasyonlarında deneyim kazanan Bello, Afrika Haberleri''nde Anglosakson Batı Afrika''nın ticaret, lojistik, finans, teknoloji ve altyapı gelişmelerini takip etmektedir.',
    2
  ),
  (
    'meriem-el-amrani',
    'Meriem El Amrani',
    'Kuzey Afrika Editörü',
    'Kuzey Afrika',
    'Faslı gazeteci ve iletişim araştırmacısı Meriem El Amrani, Sakarya Üniversitesi Gazetecilik Bölümü mezunudur. Eğitimine bir yıl Université Bordeaux Montaigne''de devam eden El Amrani, Afrika Haberleri''nde Kuzey Afrika''nın sanayi, enerji, turizm, ticaret ve kamu politikalarını takip etmektedir.',
    3
  ),
  (
    'abdirahman-warsame',
    'Abdirahman Nur Warsame',
    'Doğu Afrika Muhabiri',
    'Doğu Afrika',
    'Mogadişu doğumlu Abdirahman Nur Warsame, Kütahya Dumlupınar Üniversitesi''nde Siyaset Bilimi ve Uluslararası İlişkiler eğitiminin son sınıfındadır. Türkiye ve Somali''de yerel medya çalışmaları gerçekleştiren Warsame, Afrika Haberleri''nde Doğu Afrika''nın bölgesel siyaseti, ticareti, limanları, teknoloji ve altyapı gelişmelerini takip etmektedir.',
    4
  ),
  (
    'aicha-mahamat-issa',
    'Aïcha Mahamat Issa',
    'Orta Afrika Muhabiri',
    'Orta Afrika',
    'Çad''ın başkenti N''Djamena''da büyüyen Aïcha Mahamat Issa, Erciyes Üniversitesi Gazetecilik Bölümü mezunudur. Kayseri ve N''Djamena''daki yerel medya deneyimlerinin ardından Afrika Haberleri''nde Orta Afrika''nın altyapı, enerji, doğal kaynaklar, kamu politikaları ve iş dünyası gelişmelerini takip etmektedir.',
    5
  ),
  (
    'yusuf-emre-karaca',
    'Yusuf Emre Karaca',
    'Güney Afrika Masası Editörü',
    'Güney Afrika',
    'Yusuf Emre Karaca, Necmettin Erbakan Üniversitesi İngilizce Siyaset Bilimi ve Uluslararası İlişkiler Bölümü mezunudur. Yerel basın ve dış haber editörlüğü deneyimine sahip olan Karaca, Afrika Haberleri''nin Güney Afrika Masası''nda şirketler, finans, enerji, sanayi, madencilik ve altyapı gelişmelerini takip etmektedir.',
    6
  ),
  (
    'merve-nur-aydin',
    'Merve Nur Aydın',
    'Türkiye-Afrika İlişkileri Editörü',
    'Türkiye-Afrika İlişkileri',
    'Merve Nur Aydın, Kırklareli Üniversitesi Uluslararası İlişkiler Bölümü mezunudur ve İstanbul''da Afrika Çalışmaları ve Uluslararası İlişkiler yüksek lisansına devam etmektedir. Afrika Haberleri''nde Türk şirketlerinin kıtadaki yatırımları, ihracat, diplomasi, eğitim, havacılık ve kalkınma iş birliklerini takip etmektedir.',
    7
  );

-- Per-article author (nullable; legacy rows are backfilled by scraper/backfill_author.py).
ALTER TABLE articles ADD COLUMN author_slug text REFERENCES authors(slug);
CREATE INDEX idx_articles_author_slug ON articles(author_slug);

-- RLS: public read, service-role write (same pattern as sectors/regions/nav_tabs).
ALTER TABLE authors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authors_public_select"
  ON authors FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "authors_service_write"
  ON authors FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
