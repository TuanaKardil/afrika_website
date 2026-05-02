# Sectors Reference

## Active Sectors (26)

| Slug | Display Name |
|---|---|
| `insaat-muteahhitlik` | İnşaat & Müteahhitlik |
| `enerji` | Enerji |
| `savunma-sanayi` | Savunma Sanayi |
| `madencilik` | Madencilik |
| `tekstil-hazir-giyim` | Tekstil & Hazır Giyim |
| `kozmetik-hijyen` | Kozmetik & Hijyen |
| `demir-celik-sanayi` | Demir-Çelik & Sanayi |
| `tarim-gida` | Tarım & Gıda |
| `otomotiv` | Otomotiv |
| `ambalaj-geri-donusum` | Ambalaj & Geri Dönüşüm |
| `bankacilik-finans` | Bankacılık & Finans |
| `beyaz-esya-ev-aletleri` | Beyaz Eşya & Ev Aletleri |
| `cimento-insaat-malzemeleri` | Çimento & İnşaat Malzemeleri |
| `ev-tekstili-hali` | Ev Tekstili & Halı |
| `gayrimenkul-konut` | Gayrimenkul & Konut |
| `havacilik-sivil-havacilik` | Havacılık & Sivil Havacılık |
| `hvac-r` | HVAC-R (Isıtma-Soğutma) |
| `kimya-petrokimya` | Kimya & Petrokimya |
| `lojistik-tasimaci` | Lojistik & Taşımacılık |
| `makine-yedek-parca` | Makine & Yedek Parça |
| `mobilya-dekorasyon` | Mobilya & Dekorasyon |
| `perakende-e-ticaret` | Perakende & E-ticaret |
| `saglik-saglik-turizmi` | Sağlık & Sağlık Turizmi |
| `teknoloji-yazilim` | Teknoloji & Yazılım |
| `turizm-otelcilik` | Turizm & Otelcilik |
| `diger-sektor` | Diğer Sektörler |

## Merged / Deleted Slugs

These slugs no longer exist in the DB. Do not use them in classification.

| Old slug | Action | Maps to |
|---|---|---|
| `telekomunikasyon` | merged | `teknoloji-yazilim` |
| `fintech-dijital-odeme` | merged | `teknoloji-yazilim` |
| `ilac-tibbi-cihaz` | merged | `saglik-saglik-turizmi` |
| `yenilenebilir-enerji` | merged | `enerji` |
| `fuarcilik-etkinlik` | deleted | use `etkinlikler-fuarlar` nav_tab instead |

## Classifier Guidance

- Telecom / fintech / software → `teknoloji-yazilim`
- Pharma / medical devices / health tourism → `saglik-saglik-turizmi`
- Renewable / solar / wind → `enerji`
- Fairs / expos / conferences → `nav_tab_slug: etkinlikler-fuarlar` (not a sector slug)
- Return 0-3 sector slugs per article; empty array if none apply.
