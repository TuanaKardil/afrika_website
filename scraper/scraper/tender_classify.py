"""Classify a tender into sector, region, category, and tender type using OpenRouter."""
import json
import logging
import re

from scraper.openrouter import chat

logger = logging.getLogger(__name__)

_SECTORS = [
    "insaat-muteahhitlik", "enerji", "savunma-sanayi", "madencilik",
    "tekstil-hazir-giyim", "kozmetik-hijyen", "demir-celik-sanayi",
    "tarim-gida", "otomotiv", "bankacilik-finans", "fintech-dijital-odeme",
    "ilac-tibbi-cihaz", "kimya-petrokimya", "lojistik-tasimaci",
    "saglik-saglik-turizmi", "teknoloji-yazilim", "telekomunikasyon",
    "turizm-otelcilik", "yenilenebilir-enerji",
]

_REGIONS = [
    "afrika", "kuzey-afrika", "bati-afrika", "orta-afrika",
    "dogu-afrika", "guney-afrika",
]

_CATEGORIES = [
    "altyapi", "enerji", "saglik", "tarim", "teknoloji",
    "lojistik", "danismanlik", "diger",
]

_TENDER_TYPES = [
    "goods", "works", "services", "consulting",
    "expression_of_interest", "rfp", "other",
]

_SYSTEM = """\
You are a classification engine for an Africa-focused Turkish business intelligence platform.
Classify the given tender notice and return a JSON object.

Do not use em dashes anywhere in the output.

Return a JSON object with these four keys:

"sector_slug": one value from this list, or null if none applies:
  insaat-muteahhitlik, enerji, savunma-sanayi, madencilik, tekstil-hazir-giyim,
  kozmetik-hijyen, demir-celik-sanayi, tarim-gida, otomotiv, bankacilik-finans,
  fintech-dijital-odeme, ilac-tibbi-cihaz, kimya-petrokimya, lojistik-tasimaci,
  saglik-saglik-turizmi, teknoloji-yazilim, telekomunikasyon, turizm-otelcilik,
  yenilenebilir-enerji

"region_slug": one of these exactly:
  afrika, kuzey-afrika, bati-afrika, orta-afrika, dogu-afrika, guney-afrika
  Use "afrika" if the tender covers multiple regions or the whole continent.

"category_slug": one of these exactly:
  altyapi, enerji, saglik, tarim, teknoloji, lojistik, danismanlik, diger

  Guidelines:
  - altyapi: infrastructure, construction, roads, bridges, buildings
  - enerji: energy, power, electricity, oil and gas
  - saglik: health, hospitals, pharmaceuticals, medical equipment
  - tarim: agriculture, food, rural development, irrigation
  - teknoloji: IT, software, ICT, telecommunications
  - lojistik: transport, logistics, freight, ports
  - danismanlik: consulting, advisory, technical assistance, studies
  - diger: anything that does not clearly fit the above

"tender_type": one of these exactly:
  goods, works, services, consulting, expression_of_interest, rfp, other

Return ONLY the JSON object. No explanation, no markdown fences."""

_JSON_RE = re.compile(r"\{.*?\}", re.DOTALL)


def _fallback() -> dict[str, str | None]:
    return {
        "sector_slug": None,
        "region_slug": "afrika",
        "category_slug": "diger",
        "tender_type": "other",
    }


def classify_tender(title: str, description: str) -> dict[str, str | None]:
    """Classify a tender. Returns dict with sector_slug, region_slug, category_slug, tender_type.

    Falls back to safe defaults on any failure.
    """
    user_msg = f"Title: {title}\n\nDescription: {(description or '')[:500]}"

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
        logger.warning("tender_classify: no JSON in response: %.200s", raw)
        return _fallback()

    try:
        data = json.loads(m.group())
    except json.JSONDecodeError:
        logger.warning("tender_classify: JSON parse failed: %.200s", m.group())
        return _fallback()

    sector_slug = data.get("sector_slug")
    if sector_slug not in _SECTORS:
        sector_slug = None

    region_slug = data.get("region_slug", "afrika")
    if region_slug not in _REGIONS:
        region_slug = "afrika"

    category_slug = data.get("category_slug", "diger")
    if category_slug not in _CATEGORIES:
        category_slug = "diger"

    tender_type = data.get("tender_type", "other")
    if tender_type not in _TENDER_TYPES:
        tender_type = "other"

    return {
        "sector_slug": sector_slug,
        "region_slug": region_slug,
        "category_slug": category_slug,
        "tender_type": tender_type,
    }
