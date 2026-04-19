import re

# Keyword sets applied to lowercased title + body (English source text)
_CATEGORY_KEYWORDS: dict[str, list[str]] = {
    "siyaset": [
        "election", "president", "government", "parliament", "minister",
        "coup", "protest", "political", "party", "vote", "voting", "ballot",
        "constitution", "opposition", "senate", "democracy", "authoritarian",
        "sanctions", "diplomat", "treaty", "ceasefire", "rebellion", "militia",
        "rebel", "insurgent", "junta", "prime minister", "foreign policy",
        "geopolitics", "war", "conflict", "military", "army", "troops",
        "peace talks", "summit", "bilateral", "deport", "deportation",
    ],
    "ekonomi": [
        "economy", "gdp", "inflation", "trade", "investment", "market",
        "bank", "finance", "business", "export", "import", "debt", "loan",
        "imf", "world bank", "currency", "poverty", "unemployment", "revenue",
        "budget", "fiscal", "tariff", "commodity", "mining", "oil", "gas",
        "agriculture", "harvest", "crop", "famine", "hunger", "food security",
        "stock exchange", "startup company", "entrepreneur", "manufacturing",
    ],
    "saglik": [
        "health", "hospital", "disease", "vaccine", "epidemic", "malaria",
        "hiv", "aids", "doctor", "medical", "cholera", "ebola", "tuberculosis",
        "outbreak", "pandemic", "clinic", "nutrition", "maternal", "mortality",
        "surgery", "medicine", "treatment", "diagnosis", "virus", "infection",
        "mental health", "disability", "injury", "wounded", "casualty",
    ],
    "bilim-teknoloji": [
        "technology", "artificial intelligence", "ai", "satellite", "space",
        "internet", "smartphone", "fintech", "software", "engineering",
        "laboratory", "scientific discovery", "scientist", "fossil",
        "dinosaur", "paleontology", "genetics", "genome", "robot",
        "cybersecurity", "blockchain", "innovation tech", "startup tech",
        "renewable energy tech", "solar panel", "wind turbine",
        "telescope", "quantum", "nanotechnology",
    ],
    "cevre-enerji": [
        "climate", "climate change", "solar energy", "renewable energy",
        "drought", "flood", "deforestation", "environment", "emissions",
        "carbon", "pollution", "conservation", "wildlife", "biodiversity",
        "forest", "desertification", "rainfall", "dam", "hydropower",
        "natural disaster", "earthquake", "wildfire", "ocean", "coral reef",
        "endangered species", "poaching", "ivory", "rhino",
    ],
    "genel": [
        "pope", "papal", "vatican", "church", "cathedral", "mass service",
        "football", "soccer", "basketball", "rugby", "cricket", "athlete",
        "stadium", "world cup", "olympics", "sport", "player", "goal",
        "murder", "killed", "shooting", "crime", "arrested", "sentenced",
        "prison", "jail", "court", "trial", "verdict",
        "culture", "heritage", "artifact", "museum", "carnival", "festival",
        "music", "art", "film", "movie", "celebrity", "entertainment",
        "mystery", "missing", "disappeared",
    ],
}

# UN M49-aligned country -> region mapping
# Zimbabwe and Zambia -> dogu-afrika (UN M49)
# Mozambique, Malawi -> dogu-afrika (UN M49)
# Southern Africa is ONLY: Botswana, Eswatini, Lesotho, Namibia, South Africa
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
        "benin", "beninese", "sierra leone", "liberian",
        "gambia", "gambian", "cabo verde", "cape verde", "mauritania", "mauritanian",
        "guinea-bissau", "lagos", "abuja", "accra", "dakar", "bamako",
        "conakry", "abidjan", "ouagadougou", "niamey", "lome", "cotonou",
        "freetown", "monrovia", "banjul", "nouakchott",
        "west africa", "western africa", "ecowas", "sahel",
    ],
    "orta-afrika": [
        "congo", "drc", "democratic republic of the congo",
        "republic of the congo", "brazzaville", "cameroon", "cameroonian",
        "chad", "chadian", "central african republic", "gabon",
        "gabonese", "equatorial guinea", "sao tome", "principe",
        "kinshasa", "yaounde", "ndjamena", "bangui", "libreville",
        "malabo", "central africa", "congo basin",
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
        # UN M49: Zimbabwe, Zambia, Mozambique, Malawi -> Eastern Africa
        "zimbabwe", "zimbabwean", "harare", "bulawayo",
        "zambia", "zambian", "lusaka",
        "mozambique", "mozambican", "maputo",
        "malawi", "malawian", "lilongwe", "blantyre",
    ],
    "guney-afrika": [
        # Southern Africa: ONLY Botswana, Eswatini, Lesotho, Namibia, South Africa
        "south africa", "south african",
        "botswana", "gaborone",
        "namibia", "namibian", "windhoek",
        "lesotho", "basotho", "maseru",
        "swaziland", "eswatini", "swazi", "mbabane",
        "johannesburg", "cape town", "pretoria", "durban",
        "southern africa", "sadc", "anc", "malema", "zuma", "ramaphosa",
    ],
}

# Minimum score required to assign a non-genel category
_MIN_CATEGORY_SCORE = 2

# Genel keywords that override other categories when strongly matched in title
_GENEL_TITLE_OVERRIDE = [
    "pope", "papal", "football", "soccer", "rugby", "murder", "killed",
    "shooting", "carnival", "festival", "heritage", "artifact",
]


def _score(text: str, keywords: list[str]) -> int:
    low = text.lower()
    return sum(1 for kw in keywords if kw in low)


def classify_article(title: str, content: str) -> tuple[str, str]:
    """Return (category_slug, region_slug) based on keyword scoring.

    Title matches count 3x to prioritize the article's primary subject.
    Falls back to 'genel' if no category reaches the minimum score threshold.
    """
    title_low = title.lower()
    content_low = content.lower()

    # Check for strong genel signals in title first (override)
    for kw in _GENEL_TITLE_OVERRIDE:
        if kw in title_low:
            # Still pick the best non-genel category as a fallback check,
            # but only if it scores very highly (>=5)
            best_other_score = 0
            for slug, keywords in _CATEGORY_KEYWORDS.items():
                if slug == "genel":
                    continue
                s = _score(title_low, keywords) * 3 + _score(content_low, keywords)
                if s > best_other_score:
                    best_other_score = s
            if best_other_score < 5:
                category = "genel"
                break
    else:
        # Category
        best_cat = "genel"
        best_cat_score = 0
        for slug, keywords in _CATEGORY_KEYWORDS.items():
            score = _score(title_low, keywords) * 3 + _score(content_low, keywords)
            if score > best_cat_score:
                best_cat_score = score
                best_cat = slug

        # Only assign non-genel if the score clears the threshold
        category = best_cat if best_cat_score >= _MIN_CATEGORY_SCORE else "genel"

    # Region
    best_region = "afrika"
    best_region_score = 0
    for slug, keywords in _REGION_KEYWORDS.items():
        score = _score(title_low, keywords) * 3 + _score(content_low, keywords)
        if score > best_region_score:
            best_region_score = score
            best_region = slug

    return category, best_region
