"""Seed current Africa tenders from UNGM, World Bank, and UNDP into Supabase."""
import hashlib
import logging
import os
import re
import time
from datetime import datetime, timedelta, timezone
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from parsel import Selector

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
OPENROUTER_KEY = os.environ.get("OPENROUTER_API_KEY", "")

UNGM_BASE = "https://www.ungm.org"
UNGM_SEARCH = f"{UNGM_BASE}/Public/Notice/Search"
WB_API = "https://search.worldbank.org/api/v2/procnotices"
UNDP_BASE = "https://procurement-notices.undp.org"

HEADERS = {
    "User-Agent": "AfrikaHaberleriBot/1.0 (+https://github.com/TuanaKardil/afrika_website)",
    "Accept": "*/*",
}
UNGM_HEADERS = {
    **HEADERS,
    "X-Requested-With": "XMLHttpRequest",
    "Content-Type": "application/json",
    "Referer": f"{UNGM_BASE}/Public/Notice",
}

AFRICA_COUNTRY_IDS = [
    2295, 2298, 2314, 2319, 2324, 2325, 2327, 2329, 2331, 2332,
    2337, 2338, 2346, 2348, 2353, 2355, 2356, 2487, 2358, 2366,
    2367, 2370, 2378, 2379, 2397, 2406, 2407, 2408, 2414, 2415,
    2418, 2423, 2431, 2432, 2434, 2442, 2443, 2462, 2470, 2472,
    2474, 2475, 2480, 2481, 2526, 2484, 2507, 2494, 2498, 2503,
    2519, 2520,
]

AFRICA_COUNTRIES_EN = {
    "nigeria", "kenya", "ghana", "ethiopia", "tanzania", "uganda",
    "south africa", "zimbabwe", "mozambique", "zambia", "malawi", "angola",
    "cameroon", "senegal", "ivory coast", "cote d'ivoire", "mali", "burkina faso",
    "niger", "guinea", "benin", "togo", "sierra leone", "liberia", "gambia",
    "guinea-bissau", "cape verde", "mauritania", "rwanda", "burundi", "somalia",
    "djibouti", "eritrea", "south sudan", "comoros", "seychelles", "madagascar",
    "mauritius", "dr congo", "congo", "central african", "gabon", "equatorial guinea",
    "sao tome", "chad", "botswana", "lesotho", "namibia", "swaziland", "eswatini",
    "egypt", "morocco", "algeria", "tunisia", "libya", "sudan", "africa",
    "eastern and southern africa", "western and central africa",
    "mid east,north africa", "north africa",
}

WB_AFRICA_REGIONS = [
    "Eastern+And+Southern+Africa",
    "Western+And+Central+Africa",
    "Mid+East%2CNorth+Africa%2CAfg%2CPak",
]
WB_OPEN_TYPES = [
    "Invitation+for+Bids",
    "Request+for+Expression+of+Interest",
    "General+Procurement+Notice",
]

# Patterns that indicate a personnel/job posting rather than a procurement tender
_JOB_PATTERNS = [
    "individual contractor",
    "national consultant",
    "international consultant",
    "national professional officer",
    "international professional officer",
    "national expert",
    "international expert",
    "vacancy announcement",
    "job opening",
    "call for applications",
    "hiring an ",
    "ic - individual",
    "- ic -",
    "- ic:",
    "terms of reference for a consultant",
    "terms of reference for consultant",
    "lta for individual",
    "programme officer",
    "programme associate",
    "project officer",
    "programme analyst",
    "field officer",
]


def _is_job_posting(title: str) -> bool:
    t = title.lower()
    return any(p in t for p in _JOB_PATTERNS)


def _slugify(text: str, max_len: int = 80) -> str:
    s = text.lower()
    s = re.sub(r"[^\w\s-]", "", s)
    s = re.sub(r"[\s_-]+", "-", s)
    return s.strip("-")[:max_len] or "tender"


def _unique_slug(base: str, existing: set) -> str:
    slug = base
    i = 1
    while slug in existing:
        slug = f"{base}-{i}"
        i += 1
    existing.add(slug)
    return slug


def _md5(text: str) -> str:
    return hashlib.md5(text.encode()).hexdigest()


def _parse_date(raw: str | None) -> str | None:
    if not raw:
        return None
    raw = raw.strip()
    for fmt in (
        "%d-%b-%Y", "%d-%b-%y", "%B %d, %Y", "%Y-%m-%d", "%d/%m/%Y",
        "%d %B %Y", "%m/%d/%Y", "%d.%m.%Y", "%Y/%m/%d",
    ):
        try:
            dt = datetime.strptime(raw, fmt).replace(tzinfo=timezone.utc)
            return dt.isoformat()
        except ValueError:
            continue
    return None


def _ungm_datetime_to_iso(raw: str) -> str | None:
    """Parse '28-Apr-2026 00:00 (GMT -4.00)' into UTC ISO string."""
    if not raw:
        return None
    raw = raw.strip()
    m = re.match(r"(\d{1,2}-\w{3}-\d{2,4})\s+(\d{2}:\d{2})\s*\(GMT\s*([-+]?\d+\.?\d*)\)", raw)
    if m:
        date_str, time_str, offset_str = m.groups()
        try:
            offset_hours = float(offset_str)
            fmt = "%d-%b-%Y" if len(date_str.split("-")[2]) == 4 else "%d-%b-%y"
            dt_local = datetime.strptime(f"{date_str} {time_str}", f"{fmt} %H:%M")
            dt_utc = dt_local - timedelta(hours=offset_hours)
            return dt_utc.replace(tzinfo=timezone.utc).isoformat()
        except Exception:
            pass
    date_only = re.sub(r"\s+\d{1,2}:\d{2}.*$", "", raw).strip()
    return _parse_date(date_only)


def _undp_datetime_to_iso(raw: str) -> str | None:
    """Parse '13-May-26 @ 10:00 AM (New York time)' or '14-May-2610:00' into UTC ISO."""
    if not raw:
        return None
    raw = raw.strip()
    # Handle concatenated format "14-May-2610:00" -> "14-May-26 10:00"
    raw = re.sub(r"(\d{2})(\d{2}:\d{2})$", r"\1 \2", raw)
    # Extract date part: "13-May-26" or "13-May-2026"
    m = re.match(r"(\d{1,2}-\w{3}-\d{2,4})", raw)
    if not m:
        return None
    date_str = m.group(1)
    # If 4-digit year looks wrong (year > 2100), strip to 2 digits
    parts = date_str.split("-")
    if len(parts) == 3 and len(parts[2]) == 4:
        yr = int(parts[2])
        if yr > 2100:
            date_str = f"{parts[0]}-{parts[1]}-{parts[2][:2]}"
    # Try to extract time
    time_m = re.search(r"(\d{1,2}):(\d{2})\s*(AM|PM)", raw, re.IGNORECASE)
    if time_m:
        hour, minute, meridiem = int(time_m.group(1)), int(time_m.group(2)), time_m.group(3).upper()
        if meridiem == "PM" and hour != 12:
            hour += 12
        elif meridiem == "AM" and hour == 12:
            hour = 0
        # New York time: UTC-4 (EDT summer) or UTC-5 (EST winter) - use -4 as conservative
        fmt = "%d-%b-%Y" if len(date_str.split("-")[2]) == 4 else "%d-%b-%y"
        try:
            dt_local = datetime.strptime(date_str, fmt).replace(hour=hour, minute=minute)
            dt_utc = dt_local + timedelta(hours=4)
            return dt_utc.replace(tzinfo=timezone.utc).isoformat()
        except Exception:
            pass
    return _parse_date(date_str)


def _ai_translate(title: str, description: str, institution: str, country: str) -> dict:
    if not OPENROUTER_KEY:
        return {"title_tr": title, "description_tr": description, "institution_tr": institution, "country_tr": country}
    from scraper.openrouter import chat
    import json as _json

    snippet = description[:800] if description else ""
    prompt = (
        "Translate the following tender fields into Turkish.\n"
        "Return ONLY a valid JSON object with exactly these keys: title_tr, description_tr, institution_tr, country_tr.\n"
        "Rules:\n"
        "- Always use correct Turkish special characters: ş ğ ö ü ç ı İ. Never substitute ASCII equivalents (e.g. 's' for 'ş').\n"
        "- Title must be sentence case: capitalize only the first word and proper nouns. Never output ALL CAPS.\n"
        "- Do not use em dashes anywhere in the output.\n"
        "- Use natural, fluent Turkish with correct grammar and punctuation. Avoid literal word-for-word translation.\n"
        '- Country names use standard Turkish forms (e.g. "Nigeria" -> "Nijerya", "Mozambique" -> "Mozambik", "Ethiopia" -> "Etiyopya").\n'
        "- Keep project codes, reference numbers, and proper nouns (names of projects, organisations) as-is.\n"
        "- description_tr: translate faithfully; do not summarise or shorten.\n\n"
        f"title: {title}\n"
        f"description: {snippet}\n"
        f"institution: {institution}\n"
        f"country: {country}\n"
    )
    raw = chat([{"role": "user", "content": prompt}], temperature=0.0, max_tokens=1024)
    if not raw:
        return {"title_tr": title, "description_tr": description, "institution_tr": institution, "country_tr": country}
    m = re.search(r"\{.*\}", raw, re.DOTALL)
    if not m:
        return {"title_tr": title, "description_tr": description, "institution_tr": institution, "country_tr": country}
    try:
        return _json.loads(m.group())
    except Exception:
        return {"title_tr": title, "description_tr": description, "institution_tr": institution, "country_tr": country}


def _ai_filter_job_postings(items: list[dict]) -> list[dict]:
    """Batch AI check: filter out job/personnel postings, keep real procurement tenders."""
    if not OPENROUTER_KEY or not items:
        return items
    from scraper.openrouter import chat
    import json as _json

    BATCH = 25
    kept: list[dict] = []

    for i in range(0, len(items), BATCH):
        batch = items[i:i + BATCH]
        numbered = "\n".join(
            f"{j + 1}. {item['title_original'][:120]}" for j, item in enumerate(batch)
        )
        prompt = (
            "You will receive a numbered list of procurement notice titles from Africa.\n"
            "For each item decide: is it a JOB POSTING (hiring an individual person such as "
            "consultant, specialist, coordinator, officer, advisor, accountant, driver, engineer, "
            "analyst, assistant, manager, expert) or a REAL TENDER (procuring goods, construction "
            "works, or contracting a company/firm for services)?\n\n"
            "Rules:\n"
            "- 'Consulting firm to conduct study X' = REAL TENDER\n"
            "- 'Consultant for X / Specialist for Y / Coordinator Z' = JOB POSTING\n"
            "- 'Supply of goods / Construction of / Rehabilitation of' = REAL TENDER\n"
            "- 'Recruitment of individual / Selection of individual advisor' = JOB POSTING\n\n"
            f"{numbered}\n\n"
            "Return ONLY a JSON array of booleans, one per item in order.\n"
            "true = job posting (exclude), false = real tender (keep).\n"
            "Example for 3 items: [false, true, false]"
        )
        raw = chat([{"role": "user", "content": prompt}], temperature=0.0, max_tokens=256)
        flags: list[bool] = []
        if raw:
            arr_m = re.search(r"\[.*?\]", raw, re.DOTALL)
            if arr_m:
                try:
                    flags = _json.loads(arr_m.group())
                except Exception:
                    pass

        for j, item in enumerate(batch):
            is_job = bool(flags[j]) if j < len(flags) else False
            if is_job:
                logger.info("AI skip job posting: %s", item["title_original"][:70])
            else:
                kept.append(item)

        time.sleep(0.5)

    logger.info("AI job filter: %d -> %d items kept", len(items), len(kept))
    return kept


def _ai_classify(title: str, description: str) -> dict:
    if not OPENROUTER_KEY:
        return {"sector_slug": None, "region_slug": "afrika", "category_slug": "diger", "tender_type": "other"}
    from scraper.openrouter import chat
    import json as _json

    snippet = description[:500] if description else ""
    prompt = (
        "Classify this tender. Return ONLY a JSON object with these keys:\n"
        "- sector_slug: one of [insaat-muteahhitlik, enerji, savunma-sanayi, madencilik, tarim-gida, "
        "bankacilik-finans, ilac-tibbi-cihaz, lojistik-tasimaci, saglik-saglik-turizmi, teknoloji-yazilim, "
        "telekomunikasyon, yenilenebilir-enerji] or null\n"
        "- region_slug: one of [kuzey-afrika, bati-afrika, orta-afrika, dogu-afrika, guney-afrika, afrika]\n"
        "- category_slug: one of [altyapi, enerji, saglik, tarim, teknoloji, lojistik, danismanlik, diger]\n"
        "- tender_type: one of [goods, works, services, consulting, expression_of_interest, rfp, other]\n"
        "Do not use em dashes. Return only the JSON.\n\n"
        f"Title: {title}\nDescription: {snippet}\n"
    )
    raw = chat([{"role": "user", "content": prompt}], temperature=0.0, max_tokens=256)
    defaults = {"sector_slug": None, "region_slug": "afrika", "category_slug": "diger", "tender_type": "other"}
    if not raw:
        return defaults
    m = re.search(r"\{.*?\}", raw, re.DOTALL)
    if not m:
        return defaults
    try:
        result = _json.loads(m.group())
        VALID_REGIONS = {"kuzey-afrika", "bati-afrika", "orta-afrika", "dogu-afrika", "guney-afrika", "afrika"}
        VALID_CATS = {"altyapi", "enerji", "saglik", "tarim", "teknoloji", "lojistik", "danismanlik", "diger"}
        VALID_TYPES = {"goods", "works", "services", "consulting", "expression_of_interest", "rfp", "other"}
        if result.get("region_slug") not in VALID_REGIONS:
            result["region_slug"] = "afrika"
        if result.get("category_slug") not in VALID_CATS:
            result["category_slug"] = "diger"
        if result.get("tender_type") not in VALID_TYPES:
            result["tender_type"] = "other"
        return result
    except Exception:
        return defaults


# ─── UNGM ────────────────────────────────────────────────────────────────────

def fetch_ungm_listing(session: requests.Session, page_index: int = 0, page_size: int = 50) -> list[dict]:
    today = datetime.now(timezone.utc).strftime("%d-%b-%Y")
    payload = {
        "PageIndex": page_index, "PageSize": page_size,
        "Title": "", "Description": "", "Reference": "",
        "PublishedFrom": "", "PublishedTo": "",
        "DeadlineFrom": today, "DeadlineTo": "",
        "Countries": AFRICA_COUNTRY_IDS, "Agencies": [], "UNSPSCs": [],
        "NoticeTypes": [], "SortField": "Deadline", "SortAscending": True,
        "isPicker": False, "IsSustainable": False, "IsActive": True,
        "NoticeDisplayType": None, "NoticeSearchTotalLabelId": "noticeSearchTotal",
        "TypeOfCompetitions": [],
    }
    resp = session.post(UNGM_SEARCH, json=payload, headers=UNGM_HEADERS, timeout=30)
    resp.raise_for_status()
    sel = Selector(text=resp.text)
    rows = sel.css('div[role="row"][data-noticeid]')
    candidates = []
    for row in rows:
        notice_id = row.attrib.get("data-noticeid", "")
        title = (row.css(".ungm-title::text").get() or "").strip()
        cells = row.css('[role="cell"] span::text, [role="cell"] div::text').getall()
        meta = " ".join(c.strip() for c in cells if c.strip())
        if notice_id and title:
            candidates.append({
                "notice_id": notice_id,
                "title": title,
                "meta": meta,
                "url": f"{UNGM_BASE}/Public/Notice/{notice_id}",
            })
    return candidates


def _extract_ungm_label(sel: Selector, label_text: str) -> str:
    for span in sel.css("span.label, span.ungm-label, .fieldLabel, label"):
        t = (span.css("::text").get() or "").strip()
        if label_text.lower() in t.lower():
            next_el = span.xpath("following-sibling::span[1] | following-sibling::div[1]")
            val = (next_el.css("::text").get() or "").strip()
            if val:
                return val
            parent_next = span.xpath("../following-sibling::*[1]")
            val = (parent_next.css("::text").get() or "").strip()
            if val:
                return val
    return ""


def scrape_ungm_detail(session: requests.Session, candidate: dict) -> dict | None:
    url = candidate["url"]
    try:
        resp = session.get(url, headers={**HEADERS, "Referer": f"{UNGM_BASE}/Public/Notice"}, timeout=20)
        resp.raise_for_status()
        sel = Selector(text=resp.text)
    except Exception as e:
        logger.warning("UNGM detail fetch failed %s: %s", url, e)
        return None

    title = (sel.css("h1::text, .ungm-title::text, .notice-title::text").get() or candidate["title"]).strip()
    desc_parts = sel.css(
        ".ungm-notice-description *::text, .description-content *::text, .notice-content *::text, main p::text"
    ).getall()
    description = " ".join(p.strip() for p in desc_parts if p.strip())[:3000]
    if not description:
        description = candidate["meta"]

    deadline_raw = _extract_ungm_label(sel, "deadline on") or _extract_ungm_label(sel, "deadline") or ""
    published_raw = _extract_ungm_label(sel, "published on") or _extract_ungm_label(sel, "posted") or ""
    reference = (
        _extract_ungm_label(sel, "reference") or _extract_ungm_label(sel, "notice no")
        or sel.css(".notice-reference::text").get() or ""
    ).strip()
    institution = (
        _extract_ungm_label(sel, "organization") or _extract_ungm_label(sel, "agency")
        or sel.css(".organization::text").get() or "UN"
    ).strip()
    country = (
        _extract_ungm_label(sel, "country") or _extract_ungm_label(sel, "location")
        or sel.css(".country::text").get() or ""
    ).strip()

    deadline_at = _ungm_datetime_to_iso(deadline_raw)
    published_at = _ungm_datetime_to_iso(published_raw)

    if deadline_at and datetime.fromisoformat(deadline_at) < datetime.now(timezone.utc):
        logger.info("Skip expired UNGM: %s", title[:50])
        return None

    doc_urls = list(dict.fromkeys(
        urljoin(UNGM_BASE, h)
        for h in sel.css(
            'a[href$=".pdf"]::attr(href), a[href$=".doc"]::attr(href), a[href$=".docx"]::attr(href)'
        ).getall()
    ))

    return {
        "source": "ungm",
        "source_url": url,
        "title_original": title,
        "description_original": description,
        "reference_number": reference or None,
        "institution": institution,
        "country": country,
        "published_at": published_at,
        "deadline_at": deadline_at,
        "budget_usd": None,
        "document_urls": doc_urls,
        "contact_email": None,
    }


def fetch_ungm(session: requests.Session, existing_urls: set) -> list[dict]:
    logger.info("=== Fetching UNGM ===")
    session.get(f"{UNGM_BASE}/Public/Notice", headers={**HEADERS, "Referer": UNGM_BASE}, timeout=30)

    all_candidates: list[dict] = []
    seen_ids: set[str] = set()
    for page_idx in range(6):
        try:
            batch = fetch_ungm_listing(session, page_index=page_idx, page_size=50)
        except Exception as e:
            logger.warning("UNGM listing page %d failed: %s", page_idx, e)
            break
        if not batch:
            break
        new = [c for c in batch if c["notice_id"] not in seen_ids]
        for c in new:
            seen_ids.add(c["notice_id"])
        all_candidates.extend(new)
        logger.info("UNGM page %d: %d new (total %d)", page_idx, len(new), len(all_candidates))
        if len(new) < 50:
            break
        time.sleep(1.0)

    results = []
    for candidate in all_candidates:
        if candidate["url"] in existing_urls:
            continue
        item = scrape_ungm_detail(session, candidate)
        if item:
            results.append(item)
        time.sleep(0.6)

    logger.info("UNGM: %d new tenders", len(results))
    return results


# ─── World Bank ───────────────────────────────────────────────────────────────

def fetch_worldbank(session: requests.Session, existing_urls: set) -> list[dict]:
    logger.info("=== Fetching World Bank ===")
    today = datetime.now(timezone.utc).isoformat()[:10]
    results = []
    seen_ids: set[str] = set()

    for region in WB_AFRICA_REGIONS:
        for notice_type in WB_OPEN_TYPES:
            url = (
                f"{WB_API}?format=json&fl=*"
                f"&srt=submission_deadline_date+desc&apilang=en&rows=100&os=0"
                f"&regionname_exact={region}&notice_type_exact={notice_type}"
            )
            try:
                resp = session.get(url, headers=HEADERS, timeout=30)
                resp.raise_for_status()
                d = resp.json()
            except Exception as e:
                logger.warning("WB API failed region=%s type=%s: %s", region, notice_type, e)
                continue

            raw = d.get("procnotices") or []
            if isinstance(raw, dict):
                raw = list(raw.values())

            for notice in raw:
                notice_id = notice.get("id", "")
                if notice_id in seen_ids:
                    continue

                deadline_raw = notice.get("submission_deadline_date", "")
                if not deadline_raw:
                    continue
                deadline_iso = deadline_raw if "T" in deadline_raw else f"{deadline_raw}T00:00:00Z"
                try:
                    deadline_dt = datetime.fromisoformat(deadline_iso.replace("Z", "+00:00"))
                except Exception:
                    continue
                if deadline_dt < datetime.now(timezone.utc):
                    continue

                source_url = (
                    f"https://projects.worldbank.org/en/projects-operations/procurement/noticedetail?id={notice_id}"
                )
                if source_url in existing_urls:
                    seen_ids.add(notice_id)
                    continue
                seen_ids.add(notice_id)

                title = (notice.get("noticetitle") or notice.get("bid_description") or "").strip()
                if not title:
                    continue

                # Build description from notice_text HTML or fallback to project name
                notice_html = notice.get("notice_text") or ""
                if notice_html:
                    soup = BeautifulSoup(notice_html, "html.parser")
                    description = soup.get_text(separator=" ", strip=True)[:3000]
                else:
                    description = notice.get("project_name") or ""

                country = (notice.get("project_ctry_name") or "").strip()
                institution = (notice.get("agency_name") or notice.get("contact_organization") or "World Bank").strip()
                reference = (notice.get("bid_reference_no") or "").strip()
                budget = None
                try:
                    amt = notice.get("bid_estimate_amount")
                    if amt:
                        budget = float(str(amt).replace(",", ""))
                except Exception:
                    pass

                published_raw = notice.get("noticedate") or ""
                published_at = _parse_date(published_raw)

                results.append({
                    "source": "worldbank",
                    "source_url": source_url,
                    "title_original": title,
                    "description_original": description,
                    "reference_number": reference or None,
                    "institution": institution,
                    "country": country,
                    "published_at": published_at,
                    "deadline_at": deadline_iso if deadline_iso.endswith("Z") else deadline_dt.isoformat(),
                    "budget_usd": budget,
                    "document_urls": [],
                    "contact_email": (notice.get("contact_email") or "").strip() or None,
                })

            time.sleep(0.5)

    logger.info("World Bank: %d new tenders", len(results))
    return results


# ─── UNDP ─────────────────────────────────────────────────────────────────────

def _is_africa_country(text: str) -> bool:
    text_lower = text.lower()
    return any(c in text_lower for c in AFRICA_COUNTRIES_EN)


def _scrape_undp_detail(session: requests.Session, url: str) -> dict | None:
    try:
        resp = session.get(url, headers=HEADERS, timeout=20)
        resp.raise_for_status()
    except Exception as e:
        logger.warning("UNDP detail fetch failed %s: %s", url, e)
        return None

    soup = BeautifulSoup(resp.text, "html.parser")
    main = soup.find("main") or soup.body

    # Extract text as pipe-separated parts for easy parsing
    if not main:
        return None
    text = main.get_text("|", strip=True)
    parts = [p.strip() for p in text.split("|") if p.strip()]

    def _get_after(label: str) -> str:
        for i, p in enumerate(parts):
            if label.lower() in p.lower() and i + 1 < len(parts):
                return parts[i + 1]
        return ""

    title = _get_after("Page Title") or _get_after("Procurement Notices - ")
    if not title:
        # Try first substantial text
        for p in parts:
            if len(p) > 20 and not any(x in p.lower() for x in ["undp", "copyright", "menu", "nav"]):
                title = p
                break
    if not title:
        return None

    # Clean up title from "Procurement Notices - REF - ACTUAL TITLE" pattern
    if " - " in title:
        segments = title.split(" - ")
        if len(segments) >= 3:
            title = " - ".join(segments[2:]).strip()
        elif len(segments) == 2 and not re.match(r"^[A-Z0-9-]+$", segments[0]):
            title = segments[-1].strip()

    institution = _get_after("Office") or "UNDP"
    # Clean "UNDP-SSD - SOUTH SUDAN" -> "UNDP South Sudan"
    inst_m = re.match(r"UNDP-\w+\s*-\s*(.+)", institution, re.IGNORECASE)
    if inst_m:
        country_from_inst = inst_m.group(1).strip().title()
    else:
        country_from_inst = ""

    deadline_raw = _get_after("Deadline")
    published_raw = _get_after("Published on")
    reference = _get_after("Reference Number")

    # Find contact email
    contact_email = None
    email_m = re.search(r"[\w.+-]+@[\w.-]+\.\w+", text)
    if email_m:
        contact_email = email_m.group()

    # Description: find "Introduction" section or "Scope" or first substantial paragraph
    description = ""
    for label in ("Introduction", "Scope", "Background", "Description"):
        desc = _get_after(label)
        if desc and len(desc) > 20:
            description = desc
            break
    if not description:
        # Get several consecutive substantial parts
        for i, p in enumerate(parts):
            if len(p) > 100:
                description = " ".join(parts[i:i+5])[:2000]
                break

    deadline_at = _undp_datetime_to_iso(deadline_raw)
    published_at = _undp_datetime_to_iso(published_raw)

    if deadline_at and datetime.fromisoformat(deadline_at) < datetime.now(timezone.utc):
        return None

    return {
        "title": title,
        "description": description[:2000],
        "institution": institution,
        "country": country_from_inst,
        "reference": reference,
        "contact_email": contact_email,
        "deadline_at": deadline_at,
        "published_at": published_at,
    }


def fetch_undp(session: requests.Session, existing_urls: set) -> list[dict]:
    logger.info("=== Fetching UNDP ===")
    today = datetime.now(timezone.utc)

    try:
        resp = session.get(f"{UNDP_BASE}/search.cfm", headers=HEADERS, timeout=20)
        resp.raise_for_status()
    except Exception as e:
        logger.warning("UNDP listing fetch failed: %s", e)
        return []

    soup = BeautifulSoup(resp.text, "html.parser")
    rows = soup.find_all("a", class_=lambda c: c and "vacanciesTable__row" in c if c else False)
    logger.info("UNDP listing: %d total rows", len(rows))

    africa_rows = []
    for row in rows:
        cells = row.find_all("div", class_="vacanciesTable__cell")
        country = ""
        title = ""
        deadline_str = ""
        href = row.get("href", "")

        for cell in cells:
            label_div = cell.find("div", class_="vacanciesTable__cell__label")
            span = cell.find("span")
            if not label_div or not span:
                continue
            label = label_div.get_text(strip=True)
            value = span.get_text(strip=True)
            if label == "Title":
                title = value
            elif "Office/Country" in label:
                country = value
            elif label == "Deadline":
                deadline_str = value

        if not _is_africa_country(country):
            continue

        # Parse deadline from listing (format: "13-May-2610:00" or "13-May-26 10:00")
        deadline_clean = re.sub(r"(\d{2})(\d{2}:\d{2})$", r"\1 \2", deadline_str)
        deadline_at = _undp_datetime_to_iso(deadline_clean)
        if deadline_at:
            try:
                dl = datetime.fromisoformat(deadline_at)
                if dl < today:
                    continue
            except Exception:
                pass

        url = f"{UNDP_BASE}/{href}"
        if url in existing_urls:
            continue

        africa_rows.append({"url": url, "title": title, "country": country})

    logger.info("UNDP: %d Africa rows with future deadlines (new)", len(africa_rows))

    results = []
    for row in africa_rows[:80]:  # cap at 80 detail fetches per run
        detail = _scrape_undp_detail(session, row["url"])
        if not detail:
            continue
        if not detail.get("title"):
            continue

        country = detail.get("country") or row.get("country", "")
        # Clean up "UNDP-ZAF/SOUTH AFRICA" -> "South Africa"
        country_m = re.search(r"/([A-Z\s]+)$", country)
        if country_m:
            country = country_m.group(1).strip().title()

        results.append({
            "source": "undp",
            "source_url": row["url"],
            "title_original": detail["title"],
            "description_original": detail.get("description") or "",
            "reference_number": detail.get("reference") or None,
            "institution": detail.get("institution") or "UNDP",
            "country": country,
            "published_at": detail.get("published_at"),
            "deadline_at": detail.get("deadline_at"),
            "budget_usd": None,
            "document_urls": [],
            "contact_email": detail.get("contact_email"),
        })
        time.sleep(0.8)

    logger.info("UNDP: %d new tenders scraped", len(results))
    return results


# ─── Main ──────────────────────────────────────────────────────────────────────

def main():
    from supabase import create_client

    sb = create_client(SUPABASE_URL, SUPABASE_KEY)

    # Purge expired tenders
    now_iso = datetime.now(timezone.utc).isoformat()
    try:
        purge_resp = (
            sb.table("tenders")
            .delete()
            .lt("deadline_at", now_iso)
            .execute()
        )
        logger.info("Purged expired tenders (deadline < now)")
    except Exception as e:
        logger.warning("Purge failed: %s", e)

    existing_urls = {r["source_url"] for r in (sb.table("tenders").select("source_url").execute().data or [])}
    seen_slugs = {r["slug"] for r in (sb.table("tenders").select("slug").execute().data or [])}
    logger.info("Active tenders in DB after purge: %d", len(existing_urls))

    session = requests.Session()

    all_raw: list[dict] = []
    all_raw.extend(fetch_ungm(session, existing_urls))
    all_raw.extend(fetch_worldbank(session, existing_urls))
    all_raw.extend(fetch_undp(session, existing_urls))

    logger.info("Total raw items fetched: %d", len(all_raw))

    # Fast keyword pre-filter
    all_raw = [i for i in all_raw if not _is_job_posting(i["title_original"])]
    logger.info("After keyword filter: %d", len(all_raw))

    # AI batch filter - catches ambiguous cases keyword filter misses
    all_raw = _ai_filter_job_postings(all_raw)
    logger.info("Total new tenders to insert: %d", len(all_raw))

    inserted = 0
    for item in all_raw:
        if item["source_url"] in existing_urls:
            continue

        title = item["title_original"]
        description = item.get("description_original") or ""

        logger.info("[%s] Translating: %s", item["source"], title[:60])
        tr = _ai_translate(title, description, item.get("institution") or "", item.get("country") or "")
        time.sleep(0.4)

        logger.info("[%s] Classifying: %s", item["source"], title[:60])
        cl = _ai_classify(title, description)
        time.sleep(0.4)

        slug = _unique_slug(_slugify(title), seen_slugs)

        row = {
            "source": item["source"],
            "source_url": item["source_url"],
            "slug": slug,
            "reference_number": item.get("reference_number"),
            "institution": item.get("institution"),
            "country": item.get("country"),
            "title_original": title,
            "description_original": description or None,
            "content_hash": _md5(description),
            "title_tr": tr.get("title_tr") or title,
            "description_tr": tr.get("description_tr") or description or None,
            "institution_tr": tr.get("institution_tr") or item.get("institution"),
            "country_tr": tr.get("country_tr") or item.get("country"),
            "sector_slug": cl.get("sector_slug"),
            "region_slug": cl.get("region_slug", "afrika"),
            "category_slug": cl.get("category_slug", "diger"),
            "tender_type": cl.get("tender_type", "other"),
            "published_at": item.get("published_at"),
            "deadline_at": item.get("deadline_at"),
            "budget_usd": item.get("budget_usd"),
            "document_urls": item.get("document_urls") or [],
            "contact_email": item.get("contact_email"),
            "is_suppressed": False,
        }

        try:
            sb.table("tenders").insert(row).execute()
            existing_urls.add(item["source_url"])
            inserted += 1
            logger.info("Inserted [%d/%d]: %s", inserted, len(all_raw), title[:60])
        except Exception as e:
            logger.error("Insert failed: %s -- %s", str(e)[:100], title[:50])

    logger.info("Done. Inserted %d new tenders.", inserted)


if __name__ == "__main__":
    main()
