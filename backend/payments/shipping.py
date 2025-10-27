# payments/shipping.py

EU_COUNTRIES = {
    "AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR","HU","IE",
    "IT","LV","LT","LU","MT","NL","PL","PT","RO","SK","SI","ES","SE"
}

def shipping_zone_for(country: str) -> str:
    c = (country or "").upper()
    if c == "DE":
        return "DE"
    if c in EU_COUNTRIES:
        return "EU"
    return "INTL"

# Tables are (min_weight_g, max_weight_g_exclusive, amount_cents)
# Tweak amounts anytime.
RATE_TABLE = {
    "DE": {
        "standard": [(0, 1000, 500), (1000, 2000, 700), (2000, 10000, 1200)],
        "express":  [(0, 1000, 900), (1000, 2000, 1200), (2000, 10000, 1900)],
    },
    "EU": {
        "standard": [(0, 1000, 799), (1000, 2000, 1099), (2000, 10000, 1599)],
        "express":  [(0, 1000, 1399), (1000, 2000, 1799), (2000, 10000, 2499)],
    },
    "INTL": {
        "standard": [(0, 1000, 999), (1000, 2000, 1499), (2000, 10000, 2499)],
        "express":  [(0, 1000, 1799), (1000, 2000, 2399), (2000, 10000, 3699)],
    },
}

def shipping_amount_for(country: str, weight_g: int = 0, speed: str = "standard") -> int:
    zone = shipping_zone_for(country)
    speed = (speed or "standard").lower()
    if speed not in ("standard", "express"):
        speed = "standard"
    table = RATE_TABLE[zone][speed]
    for lo, hi, amt in table:
        if lo <= weight_g < hi:
            return amt
    return table[-1][2]

def speed_display_name(speed: str) -> str:
    s = (speed or "standard").lower()
    return "Express" if s == "express" else "Standard"
