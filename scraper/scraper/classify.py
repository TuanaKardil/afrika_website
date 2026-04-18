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
        "egypt", "egyptian", "libya", "libyan", "tunisia", "tunisian",
        "algeria", "algerian", "morocco", "moroccan", "sudan", "sudanese",
        "western sahara", "cairo", "tripoli", "tunis", "algiers", "rabat",
        "khartoum", "omdurman", "benghazi", "alexandria", "casablanca",
        "north africa", "northern africa", "sahara", "nile", "maghreb",
        "darfur", "sinai",
    ],
    "bati-afrika": [
        "nigeria", "nigerian", "ghana", "ghanaian", "senegal", "senegalese",
        "mali", "malian", "guinea", "guinean", "ivory coast", "cote d'ivoire",
        "ivorian", "burkina faso", "burkinabe", "niger", "togolese", "togo",
        "benin", "beninese", "sierra leone", "liberia", "liberian",
        "gambia", "gambian", "cape verde", "mauritania", "mauritanian",
        "guinea-bissau", "lagos", "abuja", "accra", "dakar", "bamako",
        "conakry", "abidjan", "ouagadougou", "niamey", "lome", "cotonou",
        "freetown", "monrovia", "banjul", "nouakchott",
        "west africa", "western africa", "ecowas", "sahel",
    ],
    "orta-afrika": [
        "congo", "drc", "democratic republic of the congo",
        "republic of the congo", "brazzaville", "cameroon", "cameroonian",
        "chad", "chadian", "central african republic", "car", "gabon",
        "gabonese", "equatorial guinea", "sao tome", "principe",
        "kinshasa", "yaounde", "ndjamena", "bangui", "libreville",
        "malabo", "bata", "central africa", "congo basin",
        "angola", "angolan", "luanda",
    ],
    "dogu-afrika": [
        "kenya", "kenyan", "ethiopia", "ethiopian", "tanzania", "tanzanian",
        "uganda", "ugandan", "rwanda", "rwandan", "somalia", "somali",
        "burundi", "burundian", "south sudan", "eritrea", "eritrean",
        "djibouti", "comoros", "madagascar", "malagasy", "mauritius",
        "seychelles", "nairobi", "addis ababa", "dar es salaam", "kampala",
        "kigali", "mogadishu", "juba", "asmara", "antananarivo",
        "east africa", "eastern africa", "horn of africa", "great lakes",
        "lake victoria", "rift valley",
    ],
    "guney-afrika": [
        "south africa", "south african", "zimbabwe", "zimbabwean",
        "zambia", "zambian", "mozambique", "mozambican", "botswana",
        "namibia", "namibian", "malawi", "malawian", "lesotho", "basotho",
        "swaziland", "eswatini", "swazi",
        "johannesburg", "cape town", "pretoria", "durban", "harare",
        "bulawayo", "lusaka", "maputo", "gaborone", "windhoek", "blantyre",
        "maseru", "mbabane",
        "southern africa", "sadc", "anc", "malema", "zuma", "ramaphosa",
    ],
}


def _score(text: str, keywords: list[str]) -> int:
    low = text.lower()
    return sum(1 for kw in keywords if kw in low)


def classify_article(title: str, content: str) -> tuple[str, str]:
    """Return (category_slug, region_slug) based on keyword scoring.

    Title matches count 3x to prioritize the article's primary subject.
    """
    title_low = title.lower()
    content_low = content.lower()

    # Category
    best_cat = "genel"
    best_cat_score = 0
    for slug, keywords in _CATEGORY_KEYWORDS.items():
        score = _score(title_low, keywords) * 3 + _score(content_low, keywords)
        if score > best_cat_score:
            best_cat_score = score
            best_cat = slug

    # Region
    best_region = "afrika"
    best_region_score = 0
    for slug, keywords in _REGION_KEYWORDS.items():
        score = _score(title_low, keywords) * 3 + _score(content_low, keywords)
        if score > best_region_score:
            best_region_score = score
            best_region = slug

    return best_cat, best_region
