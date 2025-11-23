# app/agent/filters.py
from __future__ import annotations

import re
from typing import Any, Dict, List, Optional

# -------- numeric filter parsing (generic) --------

_NUM = r"(\d+(?:\.\d+)?)"

_PRICE_RANGE_RE = re.compile(
    rf"(?:between|from)\s*{_NUM}\s*(?:€|eur|euro|euros)?\s*(?:and|to)\s*{_NUM}",
    re.IGNORECASE,
)

_PRICE_UNDER_RE = re.compile(
    rf"(?:under|less than|below|upto|up to)\s*{_NUM}\s*(?:€|eur|euro|euros)?",
    re.IGNORECASE,
)

_PRICE_OVER_RE = re.compile(
    rf"(?:over|more than|above|greater than)\s*{_NUM}\s*(?:€|eur|euro|euros)?",
    re.IGNORECASE,
)

# “around / about / approximately 30 euros” etc.
_AROUND_PRICE_RE = re.compile(
    rf"""
    \b
    (?:around|about|approx(?:\.|imately)?|roughly|near|close\s*to)
    \s*
    {_NUM}
    (?:\s*(?:€|eur|euro|euros))?
    \b
    """,
    re.IGNORECASE | re.VERBOSE,
)

# Fallback: just “30€” / “for 50 euros” without modifiers
_SINGLE_PRICE_RE = re.compile(
    rf"{_NUM}\s*(?:€|eur|euro|euros)",
    re.IGNORECASE,
)

# Tunable knobs so we’re not hard-coding magic numbers everywhere
AROUND_WINDOW_FRACTION: float = 0.25   # ±25% of center
AROUND_WINDOW_MIN: float = 5.0         # but at least ±5€
SINGLE_PRICE_WINDOW_FRACTION: float = 0.15  # ±15% band for naked prices
SINGLE_PRICE_WINDOW_MIN: float = 3.0        # but at least ±3€


def _add_price_band(out: Dict[str, float], center: float,
                    frac: float, floor: float) -> None:
    """
    Helper: turn a center price into min/max band using
    a configurable fraction and minimum window size.
    """
    window = max(floor, center * frac)
    lo = max(0.0, center - window)
    hi = center + window
    out["price_min"] = lo
    out["price_max"] = hi


def parse_numeric_filters(q: str) -> Dict[str, float]:
    """
    Extract generic numeric filters from the user query.

    Currently supports price filters and is written so we can later add
    other numeric dimensions (gsm_min, length_cm, etc.) without touching
    agent logic.

    Returns e.g. {"price_min": 15.0, "price_max": 20.0}.
    """
    ql = (q or "").lower()
    out: Dict[str, float] = {}

    # 1) Explicit range: "between 20 and 40 euros"
    m = _PRICE_RANGE_RE.search(ql)
    if m:
        lo = float(m.group(1))
        hi = float(m.group(2))
        if lo > hi:
            lo, hi = hi, lo
        out["price_min"] = lo
        out["price_max"] = hi
        return out

    # 2) Upper bound: "under 30 euros"
    m = _PRICE_UNDER_RE.search(ql)
    if m:
        out["price_max"] = float(m.group(1))
        return out

    # 3) Lower bound: "over 50 euros"
    m = _PRICE_OVER_RE.search(ql)
    if m:
        out["price_min"] = float(m.group(1))
        return out

    # 4) Around / about: "around 30 euros", "approximately 40€"
    m = _AROUND_PRICE_RE.search(ql)
    if m:
        center = float(m.group(1))
        _add_price_band(
        out,
        center=center,
        frac=AROUND_WINDOW_FRACTION,
        floor=AROUND_WINDOW_MIN,
    )
        return out

    # 5) Naked price mention: "a black jacket for 30 euros"
    #    Treat as "around 30€" with a slightly tighter window.
    m = _SINGLE_PRICE_RE.search(ql)
    if m:
        center = float(m.group(1))
        _add_price_band(
        out,
        center=center,
        frac=SINGLE_PRICE_WINDOW_FRACTION,
        floor=SINGLE_PRICE_WINDOW_MIN,
    )
        return out

    return out


# -------- attribute + numeric filters → unified filter dict --------

def build_filters(attrs: Dict[str, List[str]], numeric: Dict[str, float]) -> Dict[str, Any]:
    """
    Merge token-based attrs (color/type/size) and numeric filters into a single dict.

    This is the canonical shape we send to /ai/recs/suggest and can
    also be reused by other tools (analytics, debug, etc.).
    """
    f: Dict[str, Any] = {}

    # canonical structured attributes
    if attrs.get("types"):
        f["type"] = attrs["types"][0]
    if attrs.get("colors"):
        f["color"] = attrs["colors"][0]
    if attrs.get("sizes"):
        f["size"] = attrs["sizes"][0]

    # numeric filters (currently only price_min / price_max)
    for key in ("price_min", "price_max"):
        if key in numeric:
            f[key] = numeric[key]

    return f


def is_structured_product_query(filters: Dict[str, Any]) -> bool:
    """
    Decide if this looks like a structured product search.

    If the user mentioned any of: type, color, size, or a price range,
    we treat it as a product discovery query rather than generic RAG.
    """
    return any(
        key in filters
        for key in ("type", "color", "size", "price_min", "price_max")
    )


# -------- building a short rec query string --------

def build_rec_query(msg: str, filters: Dict[str, Any]) -> str:
    """
    Build a clean text query for /ai/recs/suggest.

    Prefer structured filters (color/type/size) over the raw sentence, because
    keyword+trigram search usually works better on short product-y queries.
    """
    parts: List[str] = []

    # order: color, type, size
    if filters.get("color"):
        parts.append(str(filters["color"]))
    if filters.get("type"):
        parts.append(str(filters["type"]))
    if filters.get("size"):
        parts.append(str(filters["size"]))

    rec_q = " ".join(parts).strip()
    return rec_q or (msg or "").strip()
