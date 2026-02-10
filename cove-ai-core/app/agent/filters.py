# app/agent/filters.py
from __future__ import annotations

from typing import Any, Dict, List, Optional

# -------- attribute + numeric filters → unified filter dict --------

# Note: parse_numeric_filters was removed in favor of LLM-based entity extraction.



# -------- attribute + numeric filters → unified filter dict --------

def build_filters(attrs: Dict[str, List[str]], numeric: Dict[str, Any]) -> Dict[str, Any]:
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

    # numeric filters (price_min / price_max / gender / sort / brand)
    for key in ("price_min", "price_max", "sort", "gender", "brand"):
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
    # 1. Use ContextTranslator's semantic query if available (Highest Priority)
    # This comes from the "Zero Hallucination" translation layer
    if filters.get("_semantic_query"):
        return str(filters["_semantic_query"]).strip()

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
