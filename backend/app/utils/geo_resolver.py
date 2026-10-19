"""
Universal US Geography & State Normalization Utility.
Provides bidirectional resolution between state names, postal codes, and top cities.
Ensures collection scrapers and search filters dynamically handle any US state or metro region.
"""
from typing import Any, Dict, List, Optional, Tuple

STATE_MAP: Dict[str, str] = {
    "alabama": "AL", "al": "AL",
    "alaska": "AK", "ak": "AK",
    "arizona": "AZ", "az": "AZ",
    "arkansas": "AR", "ar": "AR",
    "california": "CA", "ca": "CA",
    "colorado": "CO", "co": "CO",
    "connecticut": "CT", "ct": "CT",
    "delaware": "DE", "de": "DE",
    "district of columbia": "DC", "dc": "DC",
    "florida": "FL", "fl": "FL",
    "georgia": "GA", "ga": "GA",
    "hawaii": "HI", "hi": "HI",
    "idaho": "ID", "id": "ID",
    "illinois": "IL", "il": "IL",
    "indiana": "IN", "in": "IN",
    "iowa": "IA", "ia": "IA",
    "kansas": "KS", "ks": "KS",
    "kentucky": "KY", "ky": "KY",
    "louisiana": "LA", "la": "LA",
    "maine": "ME", "me": "ME",
    "maryland": "MD", "md": "MD",
    "massachusetts": "MA", "ma": "MA",
    "michigan": "MI", "mi": "MI",
    "minnesota": "MN", "mn": "MN",
    "mississippi": "MS", "ms": "MS",
    "missouri": "MO", "mo": "MO",
    "montana": "MT", "mt": "MT",
    "nebraska": "NE", "ne": "NE",
    "nevada": "NV", "nv": "NV",
    "new hampshire": "NH", "nh": "NH",
    "new jersey": "NJ", "nj": "NJ",
    "new mexico": "NM", "nm": "NM",
    "new york": "NY", "ny": "NY",
    "north carolina": "NC", "nc": "NC",
    "north dakota": "ND", "nd": "ND",
    "ohio": "OH", "oh": "OH",
    "oklahoma": "OK", "ok": "OK",
    "oregon": "OR", "or": "OR",
    "pennsylvania": "PA", "pa": "PA",
    "rhode island": "RI", "ri": "RI",
    "south carolina": "SC", "sc": "SC",
    "south dakota": "SD", "sd": "SD",
    "tennessee": "TN", "tn": "TN",
    "texas": "TX", "tx": "TX",
    "utah": "UT", "ut": "UT",
    "vermont": "VT", "vt": "VT",
    "virginia": "VA", "va": "VA",
    "washington": "WA", "wa": "WA",
    "west virginia": "WV", "wv": "WV",
    "wisconsin": "WI", "wi": "WI",
    "wyoming": "WY", "wy": "WY",
    "puerto rico": "PR", "pr": "PR",
}

CODE_TO_NAME: Dict[str, str] = {
    "AL": "Alabama", "AK": "Alaska", "AZ": "Arizona", "AR": "Arkansas",
    "CA": "California", "CO": "Colorado", "CT": "Connecticut", "DE": "Delaware",
    "DC": "District of Columbia", "FL": "Florida", "GA": "Georgia", "HI": "Hawaii",
    "ID": "Idaho", "IL": "Illinois", "IN": "Indiana", "IA": "Iowa",
    "KS": "Kansas", "KY": "Kentucky", "LA": "Louisiana", "ME": "Maine",
    "MD": "Maryland", "MA": "Massachusetts", "MI": "Michigan", "MN": "Minnesota",
    "MS": "Mississippi", "MO": "Missouri", "MT": "Montana", "NE": "Nebraska",
    "NV": "Nevada", "NH": "New Hampshire", "NJ": "New Jersey", "NM": "New Mexico",
    "NY": "New York", "NC": "North Carolina", "ND": "North Dakota", "OH": "Ohio",
    "OK": "Oklahoma", "OR": "Oregon", "PA": "Pennsylvania", "RI": "Rhode Island",
    "SC": "South Carolina", "SD": "South Dakota", "TN": "Tennessee", "TX": "Texas",
    "UT": "Utah", "VT": "Vermont", "VA": "Virginia", "WA": "Washington",
    "WV": "West Virginia", "WI": "Wisconsin", "WY": "Wyoming", "PR": "Puerto Rico",
}

# Major cities mapped to their state codes
MAJOR_CITY_STATE_MAP: Dict[str, str] = {
    "miami": "FL", "orlando": "FL", "tampa": "FL", "jacksonville": "FL",
    "fort lauderdale": "FL", "tallahassee": "FL", "st. petersburg": "FL",
    "columbus": "OH", "cleveland": "OH", "cincinnati": "OH", "toledo": "OH", "akron": "OH", "dayton": "OH",
    "new york": "NY", "new york city": "NY", "nyc": "NY", "brooklyn": "NY", "queens": "NY", "manhattan": "NY", "buffalo": "NY", "albany": "NY", "rochester": "NY", "syracuse": "NY",
    "los angeles": "CA", "san francisco": "CA", "san diego": "CA", "sacramento": "CA", "san jose": "CA", "fresno": "CA", "oakland": "CA",
    "philadelphia": "PA", "pittsburgh": "PA", "allentown": "PA", "erie": "PA", "harrisburg": "PA", "scranton": "PA",
    "houston": "TX", "austin": "TX", "dallas": "TX", "san antonio": "TX", "fort worth": "TX", "el paso": "TX",
    "chicago": "IL", "aurora": "IL", "naperville": "IL", "springfield": "IL",
    "detroit": "MI", "grand rapids": "MI", "ann arbor": "MI", "lansing": "MI",
    "atlanta": "GA", "savannah": "GA", "augusta": "GA",
    "seattle": "WA", "spokane": "WA", "tacoma": "WA",
    "denver": "CO", "colorado springs": "CO", "boulder": "CO",
    "boston": "MA", "cambridge": "MA", "worcester": "MA",
    "phoenix": "AZ", "tucson": "AZ", "mesa": "AZ",
    "baltimore": "MD", "annapolis": "MD",
    "charlotte": "NC", "raleigh": "NC", "greensboro": "NC",
    "las vegas": "NV", "reno": "NV",
    "newark": "NJ", "jersey city": "NJ", "trenton": "NJ",
    "nashville": "TN", "memphis": "TN",
}

# City pools by state code: (City Name, Zip Code, Area Code)
STATE_CITY_POOLS: Dict[str, List[Tuple[str, str, str]]] = {
    "OH": [
        ("Columbus", "43215", "614"),
        ("Cleveland", "44114", "216"),
        ("Cincinnati", "45202", "513"),
        ("Toledo", "43604", "419"),
        ("Akron", "44308", "330"),
        ("Dayton", "45402", "937"),
        ("Canton", "44702", "330"),
    ],
    "FL": [
        ("Miami", "33101", "305"),
        ("Orlando", "32801", "407"),
        ("Tampa", "33602", "813"),
        ("Jacksonville", "32099", "904"),
        ("Fort Lauderdale", "33301", "954"),
        ("Tallahassee", "32301", "850"),
        ("St. Petersburg", "33701", "727"),
    ],
    "NY": [
        ("New York", "10001", "212"),
        ("Brooklyn", "11201", "718"),
        ("Buffalo", "14201", "716"),
        ("Rochester", "14604", "585"),
        ("Albany", "12207", "518"),
        ("Syracuse", "13202", "315"),
        ("White Plains", "10601", "914"),
    ],
    "CA": [
        ("Los Angeles", "90001", "310"),
        ("San Francisco", "94102", "415"),
        ("San Diego", "92101", "619"),
        ("Sacramento", "95814", "916"),
        ("San Jose", "95113", "408"),
        ("Fresno", "93721", "559"),
        ("Oakland", "94612", "510"),
        ("Long Beach", "90802", "562"),
    ],
    "PA": [
        ("Philadelphia", "19102", "215"),
        ("Pittsburgh", "15222", "412"),
        ("Allentown", "18101", "610"),
        ("Erie", "16501", "814"),
        ("Reading", "19601", "484"),
        ("Scranton", "18503", "570"),
        ("Harrisburg", "17101", "717"),
    ],
    "TX": [
        ("Houston", "77002", "713"),
        ("Austin", "78701", "512"),
        ("Dallas", "75201", "214"),
        ("San Antonio", "78205", "210"),
        ("Fort Worth", "76102", "817"),
        ("El Paso", "79901", "915"),
    ],
    "IL": [
        ("Chicago", "60601", "312"),
        ("Aurora", "60505", "630"),
        ("Naperville", "60540", "331"),
        ("Rockford", "61101", "815"),
        ("Springfield", "62701", "217"),
    ],
    "MI": [
        ("Detroit", "48226", "313"),
        ("Grand Rapids", "49503", "616"),
        ("Ann Arbor", "48104", "734"),
        ("Lansing", "48933", "517"),
    ],
    "NJ": [
        ("Newark", "07102", "973"),
        ("Jersey City", "07302", "201"),
        ("Paterson", "07505", "862"),
        ("Trenton", "08608", "609"),
    ],
    "GA": [
        ("Atlanta", "30303", "404"),
        ("Savannah", "31401", "912"),
        ("Augusta", "30901", "706"),
    ],
    "NC": [
        ("Charlotte", "28202", "704"),
        ("Raleigh", "27601", "919"),
        ("Greensboro", "27401", "336"),
    ],
    "VA": [
        ("Richmond", "23219", "804"),
        ("Virginia Beach", "23451", "757"),
        ("Norfolk", "23510", "757"),
    ],
    "WA": [
        ("Seattle", "98101", "206"),
        ("Spokane", "99201", "509"),
        ("Tacoma", "98402", "253"),
    ],
    "CO": [
        ("Denver", "80202", "303"),
        ("Colorado Springs", "80903", "719"),
        ("Boulder", "80302", "303"),
    ],
    "AZ": [
        ("Phoenix", "85001", "602"),
        ("Tucson", "85701", "520"),
        ("Mesa", "85201", "480"),
    ],
    "MA": [
        ("Boston", "02108", "617"),
        ("Worcester", "01608", "508"),
        ("Cambridge", "02138", "617"),
    ],
    "MD": [
        ("Baltimore", "21201", "410"),
        ("Annapolis", "21401", "410"),
        ("Silver Spring", "20901", "301"),
    ],
    "MO": [
        ("Kansas City", "64106", "816"),
        ("St. Louis", "63101", "314"),
        ("Springfield", "65806", "417"),
    ],
}


def resolve_us_location(location_str: str) -> Dict[str, Any]:
    """
    Resolves any location string (city name, state name, state abbreviation, or combination)
    into standard canonical state_code, state_name, and primary city.
    """
    if not location_str:
        return {
            "state_code": "CA",
            "state_name": "California",
            "city": "Los Angeles",
            "cities": STATE_CITY_POOLS["CA"],
        }

    import re
    raw = location_str.strip()
    low = raw.lower()

    # 1. Exact match on whole string for states (e.g. "ohio", "oh", "california", "ca", "florida", "fl")
    if low in STATE_MAP:
        st_code = STATE_MAP[low]
        pool = STATE_CITY_POOLS.get(st_code, [("Metro Area", "00000", "555")])
        return {
            "state_code": st_code,
            "state_name": CODE_TO_NAME.get(st_code, st_code),
            "city": pool[0][0] if pool else raw.title(),
            "cities": pool,
        }

    # Exact match on whole string for major cities (e.g. "miami", "new york", "columbus")
    if low in MAJOR_CITY_STATE_MAP:
        st_code = MAJOR_CITY_STATE_MAP[low]
        pool = STATE_CITY_POOLS.get(st_code, [("Metro Area", "00000", "555")])
        return {
            "state_code": st_code,
            "state_name": CODE_TO_NAME.get(st_code, st_code),
            "city": low.title(),
            "cities": pool,
        }

    # 2. Match major cities with word boundaries (longest first to match "New York City" before "York")
    for city_key in sorted(MAJOR_CITY_STATE_MAP.keys(), key=len, reverse=True):
        if re.search(r'\b' + re.escape(city_key) + r'\b', low):
            st_code = MAJOR_CITY_STATE_MAP[city_key]
            pool = STATE_CITY_POOLS.get(st_code, [("Metro Area", "00000", "555")])
            return {
                "state_code": st_code,
                "state_name": CODE_TO_NAME.get(st_code, st_code),
                "city": city_key.title(),
                "cities": pool,
            }

    # 3. Match full state names (> 2 letters) with word boundaries (longest first)
    full_state_names = [k for k in STATE_MAP.keys() if len(k) > 2]
    for st_name in sorted(full_state_names, key=len, reverse=True):
        if re.search(r'\b' + re.escape(st_name) + r'\b', low):
            st_code = STATE_MAP[st_name]
            pool = STATE_CITY_POOLS.get(st_code, [("Capital City", "00000", "555")])
            default_city = pool[0][0] if pool else raw.title()
            return {
                "state_code": st_code,
                "state_name": CODE_TO_NAME.get(st_code, st_code),
                "city": default_city,
                "cities": pool,
            }

    # 4. Match isolated 2-letter postal codes (e.g. "OH", "FL", "NY", "CA", "TX")
    two_letter_words = re.findall(r'\b[a-zA-Z]{2}\b', raw)
    for w in two_letter_words:
        w_low = w.lower()
        if w_low in STATE_MAP:
            st_code = STATE_MAP[w_low]
            pool = STATE_CITY_POOLS.get(st_code, [("Capital City", "00000", "555")])
            default_city = pool[0][0] if pool else raw.title()
            return {
                "state_code": st_code,
                "state_name": CODE_TO_NAME.get(st_code, st_code),
                "city": default_city,
                "cities": pool,
            }

    # Fallback to CA
    st_code = "CA"
    pool = STATE_CITY_POOLS.get(st_code, [("Los Angeles", "90001", "310")])
    return {
        "state_code": st_code,
        "state_name": CODE_TO_NAME.get(st_code, "California"),
        "city": raw.title(),
        "cities": pool,
    }


def get_canonical_state_code(state_input: Optional[str]) -> Optional[str]:
    """Returns the canonical 2-letter postal code for any state string, or None if empty."""
    if not state_input:
        return None
    cleaned = state_input.strip().lower()
    if cleaned in ("all", "all states", "worldwide", "usa", "any"):
        return None
    return STATE_MAP.get(cleaned, state_input.strip().upper()[:2])
