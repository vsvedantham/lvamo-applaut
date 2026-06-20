COUNTRY_KEYWORDS: dict[str, list[str]] = {
    "DE": ["germany", "deutschland", "berlin", "munich", "münchen", "hamburg", "frankfurt",
           "cologne", "köln", "düsseldorf", "stuttgart", "leipzig", "dortmund", "essen",
           "Bremen", "bremen", "hannover", "nuremberg", "nürnberg"],
    "FR": ["france", "paris", "lyon", "marseille", "toulouse", "nice", "nantes", "bordeaux",
           "strasbourg", "lille", "rennes", "grenoble"],
    "NL": ["netherlands", "holland", "amsterdam", "rotterdam", "the hague", "den haag",
           "utrecht", "eindhoven", "tilburg", "groningen"],
    "AT": ["austria", "österreich", "vienna", "wien", "graz", "linz", "salzburg", "innsbruck"],
    "BE": ["belgium", "belgique", "brussels", "bruxelles", "antwerp", "antwerpen", "ghent",
           "gent", "bruges", "brugge", "liège"],
    "CH": ["switzerland", "schweiz", "suisse", "zurich", "zürich", "geneva", "genève",
           "basel", "bern", "lausanne"],
    "ES": ["spain", "españa", "madrid", "barcelona", "valencia", "seville", "sevilla",
           "bilbao", "málaga", "malaga", "zaragoza"],
    "IT": ["italy", "italia", "rome", "roma", "milan", "milano", "naples", "napoli",
           "turin", "torino", "florence", "firenze", "bologna"],
    "PT": ["portugal", "lisbon", "lisboa", "porto", "braga", "coimbra", "faro"],
    "PL": ["poland", "polska", "warsaw", "warszawa", "kraków", "krakow", "wrocław",
           "wroclaw", "gdańsk", "gdansk", "poznań", "poznan", "łódź", "lodz"],
    "SE": ["sweden", "sverige", "stockholm", "gothenburg", "göteborg", "malmö", "malmo",
           "uppsala", "linköping"],
    "NO": ["norway", "norge", "oslo", "bergen", "trondheim", "stavanger"],
    "DK": ["denmark", "danmark", "copenhagen", "københavn", "aarhus", "odense"],
    "FI": ["finland", "suomi", "helsinki", "espoo", "tampere", "oulu", "turku"],
    "IE": ["ireland", "éire", "dublin", "cork", "limerick", "galway"],
    "CZ": ["czech", "czechia", "prague", "praha", "brno", "ostrava", "plzeň"],
    "RO": ["romania", "românia", "bucharest", "bucurești", "cluj", "timișoara"],
    "HU": ["hungary", "magyarország", "budapest", "debrecen", "pécs", "miskolc"],
    "US": ["united states", "usa", "u.s.", "new york", "san francisco", "seattle",
           "chicago", "boston", "austin", "los angeles", "denver", "atlanta",
           "remote us", "us remote", "anywhere in the us"],
}

REMOTE_KEYWORDS = ["remote", "anywhere", "distributed", "work from home", "wfh", "fully remote"]
HYBRID_KEYWORDS = ["hybrid"]


def resolve_country(location: str | None) -> str | None:
    if not location:
        return None
    loc = location.lower()
    for code, keywords in COUNTRY_KEYWORDS.items():
        if any(kw in loc for kw in keywords):
            return code
    return None


def resolve_remote_option(location: str | None, description: str | None = None) -> str | None:
    text = f"{location or ''} {description or ''}".lower()
    if any(kw in text for kw in REMOTE_KEYWORDS):
        return "remote"
    if any(kw in text for kw in HYBRID_KEYWORDS):
        return "hybrid"
    return "onsite"


def matches_countries(country_code: str | None, target_countries: list[str]) -> bool:
    if not country_code:
        return False
    return country_code in target_countries


def matches_roles(title: str, target_roles: list[str]) -> bool:
    title_lower = title.lower()
    return any(role.lower() in title_lower for role in target_roles)
