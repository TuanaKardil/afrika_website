import re

# Keyword sets applied to lowercased title + body (English source text)
_CATEGORY_KEYWORDS: dict[str, list[str]] = {
    "siyaset": [
        "election", "president", "government", "parliament", "minister",
        "coup", "protest", "political", "party", "vote", "voting", "ballot",
        "constitution", "opposition", "senate", "democracy", "authoritarian",
        "sanctions", "diplomat", "treaty", "ceasefire", "rebellion", "militia",
        "rebel", "insurgent", "junta", "prime minister",
    ],
    "ekonomi": [
        "economy", "gdp", "inflation", "trade", "investment", "market",
        "bank", "finance", "business", "export", "import", "debt", "loan",
        "imf", "world bank", "currency", "poverty", "unemployment", "revenue",
        "budget", "fiscal", "tariff", "commodity", "mining", "oil", "gas",
        "agriculture", "harvest", "crop", "famine", "hunger", "food security",
    ],
    "saglik": [
        "health", "hospital", "disease", "vaccine", "epidemic", "malaria",
        "hiv", "aids", "doctor", "medical", "cholera", "ebola", "tuberculosis",
        "outbreak", "pandemic", "clinic", "nutrition", "maternal", "mortality",
        "surgery", "medicine", "treatment", "diagnosis", "virus", "infection",
    ],
    "bilim-teknoloji": [
        "technology", "science", "research", "innovation", "startup",
        "digital", "artificial intelligence", "ai", "satellite", "space",
        "internet", "mobile", "smartphone", "fintech", "data", "software",
        "engineering", "laboratory", "discovery", "scientist", "university",
        "study", "renewable", "solar panel", "wind energy",
    ],
    "cevre-enerji": [
        "climate", "energy", "solar", "renewable", "drought", "flood",
        "deforestation", "environment", "emissions", "carbon", "pollution",
        "conservation", "wildlife", "biodiversity", "forest", "river",
        "water", "desertification", "temperature", "rainfall", "dam",
        "hydropower", "natural disaster", "earthquake", "wildfire",
    ],
}

_REGION_KEYWORDS: dict[str, list[str]] = {
    "kuzey-afrika": [
        "egypt", "libya", "tunisia", "algeria", "morocco", "sudan",
        "cairo", "tripoli", "tunis", "algiers", "rabat", "khartoum",
        "north africa", "northern africa", "sahara", "nile",
    ],
    "bati-afrika": [
        "nigeria", "ghana", "senegal", "mali", "guinea", "ivory coast",
        "burkina faso", "niger", "togo", "benin", "sierra leone", "liberia",
        "gambia", "cape verde", "mauritania", "lagos", "accra", "dakar",
        "bamako", "conakry", "abidjan", "ouagadougou", "niamey",
        "west africa", "western africa", "ecowas",
    ],
    "orta-afrika": [
        "congo", "drc", "democratic republic", "cameroon", "chad",
        "central african republic", "car", "gabon", "equatorial guinea",
        "sao tome", "kinshasa", "yaounde", "ndjamena", "bangui",
        "central africa",
    ],
    "dogu-afrika": [
        "kenya", "ethiopia", "tanzania", "uganda", "rwanda", "somalia",
        "burundi", "south sudan", "eritrea", "djibouti", "comoros",
        "madagascar", "mauritius", "seychelles", "nairobi", "addis ababa",
        "dar es salaam", "kampala", "kigali", "mogadishu", "juba",
        "east africa", "eastern africa", "horn of africa", "great lakes",
    ],
    "guney-afrika": [
        "south africa", "zimbabwe", "zambia", "mozambique", "botswana",
        "namibia", "angola", "malawi", "lesotho", "swaziland", "eswatini",
        "johannesburg", "cape town", "pretoria", "harare", "lusaka",
        "maputo", "gaborone", "windhoek", "luanda",
        "southern africa", "sadc",
    ],
}

_WORD_RE = re.compile(r"\b[\w\s-]{3,}\b")


def _score(text: str, keywords: list[str]) -> int:
    low = text.lower()
    return sum(1 for kw in keywords if kw in low)


def classify_article(title: str, content: str) -> tuple[str, str]:
    """Return (category_slug, region_slug) based on keyword scoring."""
    combined = f"{title} {content}"

    # Category
    best_cat = "genel"
    best_cat_score = 0
    for slug, keywords in _CATEGORY_KEYWORDS.items():
        score = _score(combined, keywords)
        if score > best_cat_score:
            best_cat_score = score
            best_cat = slug

    # Region
    best_region = "afrika"
    best_region_score = 0
    for slug, keywords in _REGION_KEYWORDS.items():
        score = _score(combined, keywords)
        if score > best_region_score:
            best_region_score = score
            best_region = slug

    return best_cat, best_region
