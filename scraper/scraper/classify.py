import json
import logging
import re

from scraper.openrouter import chat

logger = logging.getLogger(__name__)

_NAV_TABS = [
    "firsatlar",
    "pazarlar-ekonomi",
    "ticaret-ihracat",
    "sektorler",
    "turk-is-dunyasi",
    "etkinlikler-fuarlar",
    "ulkeler",
    "diger",
]

_SECTORS = [
    "insaat-muteahhitlik", "enerji", "savunma-sanayi", "madencilik",
    "tekstil-hazir-giyim", "kozmetik-hijyen", "demir-celik-sanayi",
    "tarim-gida", "otomotiv", "ambalaj-geri-donusum", "bankacilik-finans",
    "beyaz-esya-ev-aletleri", "cimento-insaat-malzemeleri", "ev-tekstili-hali",
    "fintech-dijital-odeme", "fuarcilik-etkinlik", "gayrimenkul-konut",
    "havacilik-sivil-havacilik", "hvac-r", "ilac-tibbi-cihaz",
    "kimya-petrokimya", "lojistik-tasimaci", "makine-yedek-parca",
    "mobilya-dekorasyon", "perakende-e-ticaret", "saglik-saglik-turizmi",
    "teknoloji-yazilim", "telekomunikasyon", "turizm-otelcilik",
    "yenilenebilir-enerji", "diger-sektor",
]

_REGIONS = [
    "afrika",
    "kuzey-afrika",
    "bati-afrika",
    "orta-afrika",
    "dogu-afrika",
    "guney-afrika",
]

_SYSTEM = """\
You are a classification engine for an Africa-focused Turkish business news site.
Given an article title and body, return a JSON object with three keys:

"nav_tab_slug": one of these exactly:
  firsatlar, pazarlar-ekonomi, ticaret-ihracat, sektorler, turk-is-dunyasi,
  etkinlikler-fuarlar, ulkeler, diger

  Guidelines:
  - firsatlar: investment opportunities, tenders, project opportunities
  - pazarlar-ekonomi: market data, GDP, inflation, banking, finance, stock exchange
  - ticaret-ihracat: trade deals, exports, imports, trade agreements, customs
  - sektorler: industry-specific news not covered above (energy, mining, textiles, etc.)
  - turk-is-dunyasi: Turkish companies, Turkish investors, Turkey-Africa relations
  - etkinlikler-fuarlar: fairs, expos, business events, conferences
  - ulkeler: country-specific political or social news
  - diger: anything that does not clearly fit the above

"sector_slugs": array of 0-3 sector slugs from this exact list (empty array if none apply):
  insaat-muteahhitlik, enerji, savunma-sanayi, madencilik, tekstil-hazir-giyim,
  kozmetik-hijyen, demir-celik-sanayi, tarim-gida, otomotiv, ambalaj-geri-donusum,
  bankacilik-finans, beyaz-esya-ev-aletleri, cimento-insaat-malzemeleri,
  ev-tekstili-hali, fintech-dijital-odeme, fuarcilik-etkinlik, gayrimenkul-konut,
  havacilik-sivil-havacilik, hvac-r, ilac-tibbi-cihaz, kimya-petrokimya,
  lojistik-tasimaci, makine-yedek-parca, mobilya-dekorasyon, perakende-e-ticaret,
  saglik-saglik-turizmi, teknoloji-yazilim, telekomunikasyon, turizm-otelcilik,
  yenilenebilir-enerji, diger-sektor

"region_slug": one of these exactly:
  afrika, kuzey-afrika, bati-afrika, orta-afrika, dogu-afrika, guney-afrika

  If the article covers multiple regions or the whole continent, use "afrika".

Return ONLY the JSON object. No explanation, no markdown fences."""

_JSON_RE = re.compile(r"\{.*?\}", re.DOTALL)


def _fallback() -> tuple[str, list[str], str]:
    return "diger", [], "afrika"


def classify_article(title: str, content: str) -> tuple[str, list[str], str]:
    """Return (nav_tab_slug, sector_slugs, region_slug) using OpenRouter AI.

    Falls back to ('diger', [], 'afrika') on any failure.
    """
    plain = re.sub(r"<[^>]+>", " ", content)
    # Truncate to avoid large token usage
    user_msg = f"Title: {title}\n\nBody: {plain[:3000]}"

    raw = chat(
        [{"role": "user", "content": user_msg}],
        system=_SYSTEM,
        temperature=0.0,
        max_tokens=256,
    )

    if not raw:
        return _fallback()

    m = _JSON_RE.search(raw)
    if not m:
        logger.warning("classify_article: no JSON in response: %.200s", raw)
        return _fallback()

    try:
        data = json.loads(m.group())
    except json.JSONDecodeError:
        logger.warning("classify_article: JSON parse failed: %.200s", m.group())
        return _fallback()

    nav_tab = data.get("nav_tab_slug", "diger")
    if nav_tab not in _NAV_TABS:
        nav_tab = "diger"

    raw_sectors = data.get("sector_slugs", [])
    if not isinstance(raw_sectors, list):
        raw_sectors = []
    sectors = [s for s in raw_sectors if s in _SECTORS][:3]

    region = data.get("region_slug", "afrika")
    if region not in _REGIONS:
        region = "afrika"

    return nav_tab, sectors, region
