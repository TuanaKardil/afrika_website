"""Translate tender fields into Turkish using OpenRouter."""
import json
import logging
import re

from scraper.openrouter import chat

logger = logging.getLogger(__name__)

_EM_DASH_RE = re.compile(r"[—–]|(?<!\-)\-\-(?!\-)")

_SYSTEM = """\
You are a professional Turkish translator specializing in procurement and tender notices for an \
Africa-focused Turkish business intelligence platform.

Translate the given tender fields from English to Turkish. Follow these rules strictly:

- Do not use em dashes anywhere in the output. Replace any em dash with a comma or rephrase.
- Preserve proper nouns with their standard Turkish forms:
  Nigeria -> Nijerya, Kenya -> Kenya, Egypt -> Misir, Ethiopia -> Etiyopya, Ghana -> Gana,
  Sudan -> Sudan, Somalia -> Somali, Tanzania -> Tanzanya, Uganda -> Uganda, Rwanda -> Ruanda,
  Cameroon -> Kamerun, Congo -> Kongo, Zimbabwe -> Zimbabve, Ivory Coast -> Fildisi Sahili,
  Mozambique -> Mozambik, Senegal -> Senegal, Mali -> Mali, Niger -> Nijer, Chad -> Cad,
  Morocco -> Fas, Algeria -> Cezayir, Tunisia -> Tunus, Libya -> Libya, Zambia -> Zambiya,
  Angola -> Angola, Botswana -> Botsvana, Namibia -> Namibya, Malawi -> Malavi,
  Madagascar -> Madagaskar, Guinea -> Gine.
- When adding Turkish case suffixes to proper nouns, ALWAYS use an apostrophe:
  Afrika'da (not "Afrikada"), Nijerya'da (not "Nijeryada").
- Use official Turkish equivalents for institutions where they exist:
  World Bank -> Dunya Bankasi,
  African Development Bank -> Afrika Kalkinma Bankasi,
  African Union -> Afrika Birligi,
  United Nations -> Birlesmis Milletler,
  UNDP -> UNDP (Birlesmis Milletler Kalkinma Programi),
  African Export-Import Bank -> Afrika Ihracat-Ithalat Bankasi (Afreximbank),
  International Monetary Fund -> Uluslararasi Para Fonu.
- Translate country names using standard Turkish forms (see list above).
- Do not summarize or omit any content. Translate faithfully.
- Do not add commentary or translator remarks.
- Do not use em dashes anywhere in the output.

Return ONLY a valid JSON object with keys: title_tr, description_tr, institution_tr, country_tr.
No markdown fences, no explanation."""

_USER_TEMPLATE = """\
Translate the following tender fields to Turkish.

<title>{title}</title>
<description>{description}</description>
<institution>{institution}</institution>
<country>{country}</country>"""

_JSON_RE = re.compile(r"\{.*?\}", re.DOTALL)


def _strip_em_dashes(text: str) -> str:
    return _EM_DASH_RE.sub(",", text)


def translate_tender(
    title: str,
    description: str,
    institution: str,
    country: str,
) -> dict[str, str | None]:
    """Translate tender fields to Turkish.

    Returns dict with keys: title_tr, description_tr, institution_tr, country_tr.
    Values are None if translation fails.
    """
    user_msg = _USER_TEMPLATE.format(
        title=title or "",
        description=(description or "")[:2000],
        institution=institution or "",
        country=country or "",
    )

    raw = chat(
        [{"role": "user", "content": user_msg}],
        system=_SYSTEM,
        temperature=0.0,
        max_tokens=2048,
    )

    fallback: dict[str, str | None] = {
        "title_tr": None,
        "description_tr": None,
        "institution_tr": None,
        "country_tr": None,
    }

    if not raw:
        logger.warning("tender_translate: AI call returned None for title: %.80s", title)
        return fallback

    m = _JSON_RE.search(raw)
    if not m:
        logger.warning(
            "tender_translate: no JSON in response for title %.80s: %.200s", title, raw
        )
        return fallback

    try:
        data = json.loads(m.group())
    except json.JSONDecodeError:
        logger.warning(
            "tender_translate: JSON parse failed for title %.80s: %.200s", title, m.group()
        )
        return fallback

    return {
        "title_tr": _strip_em_dashes(data.get("title_tr") or "") or None,
        "description_tr": _strip_em_dashes(data.get("description_tr") or "") or None,
        "institution_tr": _strip_em_dashes(data.get("institution_tr") or "") or None,
        "country_tr": _strip_em_dashes(data.get("country_tr") or "") or None,
    }
