# Afrika Haberleri

Türkçe Afrika iş dünyası haber platformu. 5 İngilizce kaynaktan günlük haber çeker, yapay zeka ile Türkçeye çevirir, sınıflandırır, filtreler ve Vercel üzerinde Next.js ile yayınlar.

**Live:** https://afrika-website.vercel.app

---

## Özellikler

- 5 kaynaktan günlük otomatik haber çekme (Business Insider Africa, CNBC Africa, The Africa Report, Anadolu Ajansı, The Conversation Africa)
- Afrika alaka puanlaması (1-10) — 6 altı haberler otomatik elenir
- Türkçe çeviri (OpenRouter `google/gemini-2.5-flash-lite`) — maks 600 kelime
- 8 navigasyon sekmesi + 26 sektör + 6 bölge otomatik sınıflandırma
- Türkiye duygu filtresi — Türkiye'ye negatif çerçeveleme içeren haberler gizlenir
- Semantik yineleme tespiti (48 saatlik pencere)
- Makale başına 8-15 hashtag (800+ etiket havuzundan, `docs/hashtags.md`)
- Pexels API ile HD görsel fallback (kaynak görseli yoksa)
- İhale modülü — süresi dolmuş ilanlar otomatik gizlenir
- Kayıtlı haberler (üye girişi gerekli)
- İçerik linkleri temizlenir — makale gövdesinde tıklanabilir bağlantı bulunmaz

---

## Pipeline Akışı (06:00 TST)

```
06:00  n8n cron tetikler
06:01  5 spider paralel çalışır
06:05  DeduplicationPipeline   — son 48 saatteki yinelemeler düşer
06:06  TurkeyFilterPipeline    — Türkiye'ye negatif haberler düşer
06:07  SanitizationPipeline    — HTML temizleme, link kaldırma
06:09  ScorePipeline           — Afrika alaka puanı 1-10 (< 6 düşer)
06:18  TranslatePipeline       — Türkçe çeviri, maks 600 kelime
06:22  ContentCleanStep        — Yapay zeka ile alakasız promosyon içerik temizleme
06:25  ClassifyPipeline        — nav_tab + sector_slugs + region_slug
06:28  HashtagsPipeline        — 8-15 hashtag
06:30  Supabase'e yazılır
```

**Maliyet sıralaması:** En ucuz adımlar (duplicate, turkey_filter, score) önce çalışır. Pahalı çeviri ve temizleme yalnızca geçen haberlere uygulanır.

---

## Tech Stack

| Katman | Teknoloji |
|---|---|
| Frontend | Next.js 14 App Router + TypeScript + Tailwind CSS |
| Veritabanı | Supabase (Postgres + Storage + Auth + RLS) |
| Scraping | Scrapy + trafilatura + bleach + BeautifulSoup |
| Yapay Zeka | OpenRouter `google/gemini-2.5-flash-lite` + `openai/gpt-5-nano` |
| Görseller | Pexels API (HD fallback) |
| Otomasyon | n8n + GitHub Actions |
| Hosting | Vercel |

---

## Proje Yapısı

```
frontend/
  app/                    Next.js App Router sayfaları
  components/             UI bileşenleri (ArticleCard, Header, vb.)
  lib/
    queries/              Supabase sorgu fonksiyonları
    sanitize.ts           Frontend HTML sanitize (<a> tag'leri engellenir)

scraper/
  scraper/
    spiders/              Kaynak başına bir spider
    pipelines.py          Dedup, Sanitize, Score, Storage pipeline'ları
    score.py              Afrika alaka puanlayıcı (1-10)
    translate.py          AI çevirisi (maks 600 kelime)
    clean_content.py      Çeviri sonrası AI içerik temizleyici (promosyon kaldırma)
    classify.py           nav_tab + sector + region sınıflandırma
    hashtags.py           8-15 hashtag seçimi (docs/hashtags.md)
    turkey_filter.py      Türkiye duygu filtresi
    duplicate.py          Semantik yineleme tespiti
    image_fallback.py     Pexels + Wikipedia görsel fallback
    sanitize.py           HTML temizleme (<a> tag'leri kaldırılır)
    trim.py               600 kelime aşan içerikleri AI ile kırpar
    rehash.py             Hashtag + sınıflandırma yenileme (--force-all)
    retranslate.py        Çevrilmemiş haberleri yeniden çevirir
    postprocess_db.py     Em-dash temizleme + Türkçe kesme işareti düzeltmesi
  reprocess_all.py        Tek komutla tam backfill
  backfill_images.py      Manuel görsel doldurma

prompts/
  score.md                Afrika alaka puanlama rubriği
  translate.md            Çeviri prompt + 600 kelime kuralı
  clean.md                Çeviri sonrası içerik temizleme prompt'u
  classify.md             nav_tab + sector + region sınıflandırma
  turkey_filter.md        SUPPRESS/PUBLISH kararı
  hashtags.md             8-15 hashtag seçim kuralları

docs/
  sectors.md              Aktif sektör listesi + birleştirilen slug'lar
  hashtags.md             Kanonik hashtag listesi (800+ etiket, AI kaynak)
  tenders.md              İhale modülü spesifikasyonu

supabase/migrations/      Sıralı SQL migration dosyaları
n8n/workflows/            n8n workflow JSON'ları
.github/workflows/
  scrape.yml              Günlük haber çekme + çeviri pipeline'ı
  scrape_tenders.yml      Günlük ihale çekme pipeline'ı
```

---

## Kurulum

### Gereksinimler

- Node.js 20+, Python 3.11+
- Supabase projesi
- OpenRouter API key
- Pexels API key

### Frontend

```bash
cd frontend
cp .env.example .env.local
# NEXT_PUBLIC_SUPABASE_URL ve NEXT_PUBLIC_SUPABASE_ANON_KEY ekle
npm install
npm run dev
```

### Scraper

```bash
cd scraper
cp .env.example .env
# Aşağıdaki değerleri .env'e ekle
pip install -r requirements.txt
bash run.sh
```

### Veritabanı

```bash
supabase db push
```

---

## Ortam Değişkenleri

### Vercel (Frontend)

| Değişken | Açıklama |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase proje URL'si |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |

### Scraper / GitHub Actions

| Değişken | Açıklama |
|---|---|
| `SUPABASE_URL` | Supabase proje URL'si |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (yazma erişimi) |
| `OPENROUTER_API_KEY` | Tüm AI çağrıları için OpenRouter key |
| `PEXELS_API_KEY` | HD görsel fallback için Pexels key |
| `SCRAPER_WEBHOOK_SECRET` | n8n webhook doğrulama secret'ı |

---

## Otomasyon

| Zaman | İş |
|---|---|
| 06:00 TST | n8n cron → GitHub Actions → haber scraping + çeviri |
| 15:00 TST | n8n cron → GitHub Actions → ihale scraping |

---

## Backfill Komutları

```bash
cd scraper

# Çevrilmemiş haberleri yeniden çevir
python3 -m scraper.retranslate

# Hashtag + sınıflandırma yenile (sadece eksikler)
python3 -m scraper.rehash

# Hashtag + sınıflandırma tüm haberlerde yenile
python3 -m scraper.rehash --force-all

# 600 kelime aşan içerikleri kırp
python3 -m scraper.trim

# Hepsini sırayla çalıştır (retranslate → rehash --force-all → postprocess)
python3 reprocess_all.py
```

---

## Navigasyon Sekmeleri

| Slug | İçerik |
|---|---|
| `firsatlar` | Yatırım fırsatları, ihaleler, projeler |
| `pazarlar-ekonomi` | Makro veri, borsalar, enflasyon, döviz |
| `ticaret-ihracat` | Ticaret anlaşmaları, ihracat/ithalat istatistikleri |
| `sektorler` | Sektör analizleri, şirket haberleri |
| `etkinlikler-fuarlar` | Konferanslar, fuarlar, zirveler |
| `ulkeler` | Ülke profilleri, ikili ilişkiler |
| `ihaleler` | İhale ilanları modülü (ayrı pipeline) |
| `diger` | Yukarıdaki kategorilere girmeyen genel haberler |

---

## Commit Kuralı

[Conventional Commits](https://www.conventionalcommits.org/): `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`, `test:`, `perf:`
