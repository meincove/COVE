# # app/routes/fit.py
# from __future__ import annotations
# from fastapi import APIRouter
# from pydantic import BaseModel, Field
# from typing import Optional, Dict
# import math
# import httpx
# import re

# router = APIRouter()

# class FitIn(BaseModel):
#     gender: Optional[str] = Field(default=None, pattern="^(male|female|unisex)?$")
#     height_cm: float
#     weight_kg: float
#     fit_preference: Optional[str] = Field(
#     default="regular",
#     pattern="^(tight|regular|loose|slim|oversized)$")

#     product_type: Optional[str] = None
#     slug: Optional[str] = None  # when present, we intersect with available sizes

# class FitOut(BaseModel):
#     size: str
#     confidence: float
#     notes: list[str]
#     citations: list[dict]

# _SIZE_ORDER = ["XS","S","M","L","XL","XXL"]

# # simple rules; replace with learned adapter later
# def _estimate_chest_from_bmi(height_cm: float, weight_kg: float) -> float:
#     h = max(1.45, min(2.1, height_cm/100.0))
#     bmi = weight_kg / (h*h)
#     # crude linear map to chest (cm)
#     # anchor points: bmi 19 -> 88cm, bmi 23 -> 96cm, bmi 27 -> 104cm, bmi 31 -> 112cm
#     return 88 + (bmi - 19) * (112 - 88) / (31 - 19)

# # static garment bands (cm); tweak later
# _BANDS = {
#     "hoodie": {
#         "XS": (0, 90), "S": (88, 94), "M": (93, 100),
#         "L": (99, 106), "XL": (105, 112), "XXL": (111, 118)
#     },
#     "jacket": {
#         "XS": (0, 88), "S": (86, 92), "M": (91, 98),
#         "L": (97, 104), "XL": (103, 110), "XXL": (109, 116)
#     },
#     "jeans": {
#         # map by waist proxy: chest ~ 1.08*waist ⇒ invert:
#         # we still use chest estimates; for jeans it's rough, acceptable for v0.
#         "XS": (0, 86), "S": (84, 90), "M": (89, 96),
#         "L": (95, 102), "XL": (101, 108), "XXL": (107, 114)
#     }
# }

# def _nearest_size(chest: float, product_type: Optional[str]) -> str:
#     t = (product_type or "hoodie").lower()
#     table = _BANDS.get(t, _BANDS["hoodie"])
#     for s in _SIZE_ORDER:
#         lo, hi = table[s]
#         if lo <= chest <= hi:
#             return s
#     # fallback
#     return "L" if chest >= table["L"][0] else "M"

# def _adjust_by_pref(size: str, pref: str) -> str:
#     idx = _SIZE_ORDER.index(size)
#     p = (pref or "regular").lower()
#     if p in ("tight", "slim"):
#         idx = max(0, idx - 1)
#     elif p in ("loose", "oversized"):
#         idx = min(len(_SIZE_ORDER)-1, idx + 1)
#     return _SIZE_ORDER[idx]


# async def _fetch_product(slug: str) -> Optional[dict]:
#     try:
#         async with httpx.AsyncClient(timeout=8) as cx:
#             r = await cx.get("http://127.0.0.1:8000/ai/tools/product.get", params={"slug": slug})
#             if r.status_code == 200:
#                 return r.json()
#     except Exception:
#         pass
#     return None

# @router.post("/ai/fit/recommend", response_model=FitOut)
# async def fit_recommend(body: FitIn):
#     chest = _estimate_chest_from_bmi(body.height_cm, body.weight_kg)
#     base = _nearest_size(chest, body.product_type)
#     rec  = _adjust_by_pref(base, body.fit_preference or "regular")
#     notes = [f"Estimated chest {chest:.1f} cm", f"Base {base}, adjusted for {body.fit_preference}"]

#     citations = []
#     # If slug provided, intersect with in-stock sizes; nudge to nearest available
#     if body.slug:
#         prod = await _fetch_product(body.slug)
#         if prod:
#             sizes = (prod.get("meta") or {}).get("sizes") or {}
#             avail = [s for s in _SIZE_ORDER if s in sizes and sizes[s] > 0]
#             citations.append({"title": prod.get("title",""), "url": prod.get("url",""), "score": 1.0})
#             if avail:
#                 if rec not in avail:
#                     # nudge to nearest available by index distance
#                     ri = _SIZE_ORDER.index(rec)
#                     best = min(avail, key=lambda s: abs(_SIZE_ORDER.index(s) - ri))
#                     notes.append(f"{rec} not in stock; nearest available: {best}")
#                     rec = best
#             else:
#                 notes.append("No sizes in stock for this item.")
#         else:
#             notes.append("Product not found; returned generic size.")

#     # crude confidence: center of band ± overlap penalty
#     confidence = 0.72
#     return {"size": rec, "confidence": confidence, "notes": notes, "citations": citations}


# app/routes/fit.py
from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
import httpx
import os
import re
import logging
import json
from pathlib import Path
router = APIRouter()

# ---- Config loading: size charts + fit rules ----

def _load_json_list(path: Path) -> list[dict]:
    try:
        if path.is_file():
            return json.loads(path.read_text())
    except Exception:
        pass
    return []


# You can override this with env var if you move the files:
#   export COVE_CONFIG_DIR=/abs/path/to/config
log = logging.getLogger("cove.fit")

# ---------------- JSON config loading ----------------
# fit.py is in:   COVE/cove-ai-core/app/routes/fit.py
# We want files:  COVE/data/sizecharts.json, COVE/data/fitRules.json

_ROOT_DIR = Path(__file__).resolve().parents[3]   # .../COVE

_DATA_DIR = Path(
    os.getenv("COVE_DATA_DIR", str(_ROOT_DIR / "data"))
)

try:
    _SIZECHARTS_RAW = json.loads((_DATA_DIR / "sizecharts.json").read_text())
except FileNotFoundError:
    log.warning("sizecharts.json not found in %s; falling back to BMI bands only", _DATA_DIR)
    _SIZECHARTS_RAW = []

try:
    _FITRULES_RAW = json.loads((_DATA_DIR / "fitRules.json").read_text())
except FileNotFoundError:
    log.warning("fitRules.json not found in %s; falling back to BMI bands only", _DATA_DIR)
    _FITRULES_RAW = []





def _canonical_gender(g: Optional[str]) -> str:
    g = (g or "").lower().strip()
    if g in ("male", "man", "men", "boy", "m"):
        return "male"
    if g in ("female", "woman", "women", "girl", "f"):
        return "female"
    return "unisex"


def _canonical_fit(pref: Optional[str]) -> str:
    p = (pref or "regular").lower().strip()
    mapping = {
        "tight": "tight",
        "slim": "slim",
        "regular": "regular",
        "loose": "relaxed",
        "relaxed": "relaxed",
        "oversized": "oversized",
        "baggy": "oversized",
    }
    return mapping.get(p, "regular")


def _build_fit_rules_index(raw: List[Dict[str, Any]]) -> Dict[tuple, List[Dict[str, Any]]]:
    """
    Index fit rules by (type, gender, fit) → list of rule entries.
    type, gender, fit are all lowercased.
    """
    idx: Dict[tuple, List[Dict[str, Any]]] = {}
    for e in raw or []:
        key = (
            (e.get("type") or "").lower().strip(),
            (e.get("gender") or "").lower().strip() or "unisex",
            (e.get("fit") or "").lower().strip() or "regular",
        )
        idx.setdefault(key, []).append(e)
    return idx


# FINAL INDEX USED EVERYWHERE
_FITRULES = _build_fit_rules_index(_FITRULES_RAW)
log.warning("Fit rules loaded: %d entries", sum(len(v) for v in _FITRULES.values()))
# Index by key ("hoodie_unisex_regular") for potential future use
_SIZECHARTS_BY_KEY = {
    (e.get("key") or ""): e
    for e in _SIZECHARTS_RAW
    if isinstance(e, dict) and e.get("key")
}

# We’ll search _FITRULES_RAW by type/gender; no heavy indexing needed yet


# Use the same base URL convention as agent/cart_add
DJANGO_BASE_URL = os.getenv("DJANGO_BASE_URL", "http://127.0.0.1:8001").rstrip("/")


class FitIn(BaseModel):
    gender: Optional[str] = Field(default=None, pattern="^(male|female|unisex)?$")
    height_cm: float
    weight_kg: float
    fit_preference: Optional[str] = Field(
        default="regular",
        pattern="^(tight|regular|loose|slim|oversized)$",
    )

    # Optional product context
    product_type: Optional[str] = None  # hoodie, jacket, jeans etc.
    slug: Optional[str] = None          # Cove product slug (groupSlug), e.g. hoodie-casual-fleece-59.99


class FitOut(BaseModel):
    size: str
    confidence: float
    notes: List[str]
    citations: List[Dict[str, Any]]


_SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL"]


# --- heuristics ---------------------------------------------------------------

def _estimate_chest_from_bmi(height_cm: float, weight_kg: float) -> float:
    """
    Very simple BMI→chest heuristic.

    h: 1.45m ... 2.10m (clamped)
    anchor points: bmi 19 -> 88cm, bmi 31 -> 112cm
    """
    h_m = max(1.45, min(2.10, height_cm / 100.0))
    bmi = weight_kg / (h_m * h_m)
    # crude linear map:
    # bmi 19 -> 88cm, bmi 31 -> 112cm
    return 88.0 + (bmi - 19.0) * (112.0 - 88.0) / (31.0 - 19.0)


# Static garment bands (cm) per category.
# These are garment chest widths, not body measurements.
_BANDS = {
    "hoodie": {
        "XS": (0, 90),
        "S":  (88, 94),
        "M":  (93, 100),
        "L":  (99, 106),
        "XL": (105, 112),
        "XXL": (111, 118),
    },
    "jacket": {
        "XS": (0, 88),
        "S":  (86, 92),
        "M":  (91, 98),
        "L":  (97, 104),
        "XL": (103, 110),
        "XXL": (109, 116),
    },
    "jeans": {
        # Still mapping via chest proxy; OK for v0.
        "XS": (0, 86),
        "S":  (84, 90),
        "M":  (89, 96),
        "L":  (95, 102),
        "XL": (101, 108),
        "XXL": (107, 114),
    },
}

def _normalize_pref_key(pref: Optional[str]) -> str:
    """
    Map various natural-language fit preferences to the keys used in fitRules.json.
    JSON typically has: tight, regular, relaxed, oversized.
    """
    if not pref:
        return "regular"
    p = pref.lower().strip()
    if p in ("tight", "slim", "skinny"):
        return "tight"
    if p in ("relaxed", "loose", "baggy"):
        return "relaxed"
    if p in ("oversized", "oversize", "overs"):
        return "oversized"
    return "regular"


def _norm(s: Optional[str]) -> str:
    return (s or "").strip().lower()


def _find_rules_entry(
    product_type: Optional[str],
    gender: Optional[str],
    fit_pref: Optional[str],
) -> Optional[Dict[str, Any]]:
    """
    Return a single fitRules entry for this (product_type, gender, fit_pref),
    or None if no reasonably close entry exists.
    """
    if not product_type or not _FITRULES:
        return None

    ptype = (product_type or "").lower().strip()
    gkey = _canonical_gender(gender)
    fkey = _canonical_fit(fit_pref)

    # try progressively looser keys
    keys_to_try = [
        (ptype, gkey, fkey),
        (ptype, "unisex", fkey),
        (ptype, gkey, "regular"),
        (ptype, "unisex", "regular"),
    ]

    for key in keys_to_try:
        entries = _FITRULES.get(key)
        if entries:
            # for now, just take the first entry for that combination
            return entries[0]

    return None

def _pick_size_from_rules(
    entry: Dict[str, Any],
    height_cm: float,
    weight_kg: float,
) -> Optional[str]:
    """
    Use the ranges in fitRules.json to pick a base size.
    Returns e.g. "M" or None if nothing matches cleanly.
    """
    rules = entry.get("rules") or []
    for r in rules:
        hmin = r.get("height_cm_min")
        hmax = r.get("height_cm_max")
        wmin = r.get("weight_kg_min")
        wmax = r.get("weight_kg_max")

        if hmin is None or hmax is None or wmin is None or wmax is None:
            continue

        if hmin <= height_cm <= hmax and wmin <= weight_kg <= wmax:
            size = (r.get("size") or "").upper().strip()
            if size:
                return size

    return None


def _choose_size_from_rules(entry: dict, height_cm: float, weight_kg: float) -> str:
    """
    Pick a base size from a fitRules entry based on height/weight ranges.
    If multiple rules match, choose the one whose box center is closest.
    """
    rules = entry.get("rules") or []
    best_size = None
    best_score = None

    for r in rules:
        try:
            hmin = float(r.get("height_cm_min"))
            hmax = float(r.get("height_cm_max"))
            wmin = float(r.get("weight_kg_min"))
            wmax = float(r.get("weight_kg_max"))
        except (TypeError, ValueError):
            continue

        if not (hmin <= height_cm <= hmax and wmin <= weight_kg <= wmax):
            continue

        mid_h = 0.5 * (hmin + hmax)
        mid_w = 0.5 * (wmin + wmax)
        score = abs(mid_h - height_cm) + abs(mid_w - weight_kg)

        if best_score is None or score < best_score:
            best_score = score
            best_size = (r.get("size") or "").upper()

    # If nothing matched ranges, fall back to nearest rule by distance
    if best_size is None and rules:
        best_rule = None
        best_score = None
        for r in rules:
            try:
                hmin = float(r.get("height_cm_min", 0))
                hmax = float(r.get("height_cm_max", 0))
                wmin = float(r.get("weight_kg_min", 0))
                wmax = float(r.get("weight_kg_max", 0))
            except (TypeError, ValueError):
                continue
            mid_h = 0.5 * (hmin + hmax)
            mid_w = 0.5 * (wmin + wmax)
            score = abs(mid_h - height_cm) + abs(mid_w - weight_kg)
            if best_score is None or score < best_score:
                best_score = score
                best_rule = r
        if best_rule is not None:
            best_size = (best_rule.get("size") or "M").upper()

    return best_size or "M"


def _apply_fit_pref_from_rules(entry: dict, base_size: str, fit_pref: str) -> str:
    """
    Use fitPreferenceAdjust from fitRules for the chosen base size.
    If mapping is missing, fall back to _adjust_by_pref.
    """
    pref = (fit_pref or "regular").lower()
    base = (base_size or "M").upper()

    mapping = None
    for r in (entry.get("rules") or []):
        if (r.get("size") or "").upper() == base:
            mapping = r.get("fitPreferenceAdjust") or {}
            break

    if not mapping:
        # No per-size mapping → use generic adjustment
        return _adjust_by_pref(base, pref)

    target = mapping.get(pref) or mapping.get("regular") or base
    return (target or base).upper()

def _size_from_rules(
    *,
    height_cm: float,
    weight_kg: float,
    gender: Optional[str],
    fit_pref: Optional[str],
    product_type: Optional[str],
) -> tuple[str, str, list[str]]:
    """
    Core rules-based size selection.

    Returns:
      (recommended_size, base_size, notes)
    """
    notes: list[str] = []
    entry = _find_rules_entry(product_type, gender)

    # Fallback: no rules available → use old BMI bands
    if not entry or not isinstance(entry.get("rules"), list) or not entry["rules"]:
        chest = _estimate_chest_from_bmi(height_cm, weight_kg)
        base = _nearest_size(chest, product_type)
        # old-style pref adjust as backup
        pref = (fit_pref or "regular").lower()
        idx = _SIZE_ORDER.index(base)
        if pref in ("tight", "slim"):
            idx = max(0, idx - 1)
        elif pref in ("loose", "oversized", "relaxed", "baggy"):
            idx = min(len(_SIZE_ORDER) - 1, idx + 1)
        rec = _SIZE_ORDER[idx]
        notes.append("Used fallback BMI bands (no fitRules entry found).")
        return rec, base, notes

    rules = entry["rules"]
    pref_key = _normalize_pref_key(fit_pref)

    # Pick the best rule by:
    #  - strongly preferring rules where (height, weight) are inside the box
    #  - among them, pick the one whose center is closest in (height,weight)
    best_rule = None
    best_score = None

    for r in rules:
        try:
            hmin = float(r.get("height_cm_min", 0))
            hmax = float(r.get("height_cm_max", 999))
            wmin = float(r.get("weight_kg_min", 0))
            wmax = float(r.get("weight_kg_max", 999))
        except Exception:
            continue

        h_center = 0.5 * (hmin + hmax)
        w_center = 0.5 * (wmin + wmax)
        dh = height_cm - h_center
        dw = weight_kg - w_center
        dist = (dh * dh + dw * dw) ** 0.5

        in_box = (hmin <= height_cm <= hmax) and (wmin <= weight_kg <= wmax)
        # in-range rules get a strong bonus (smaller score)
        score = dist * (0.1 if in_box else 1.0)

        if best_rule is None or best_score is None or score < best_score:
            best_rule = r
            best_score = score

    if not best_rule:
        # Should not happen, but keep fallback safe
        chest = _estimate_chest_from_bmi(height_cm, weight_kg)
        base = _nearest_size(chest, product_type)
        rec = base
        notes.append("Fit rules malformed; fell back to BMI bands.")
        return rec, base, notes

    base_size = (best_rule.get("size") or "M").upper()
    adjust_map = best_rule.get("fitPreferenceAdjust") or {}

    # if fitPreferenceAdjust doesn’t know this pref → keep base_size
    rec_size = (adjust_map.get(pref_key) or base_size).upper()

    notes.append(
        f"Base size {base_size} from rules for type='{product_type or 'unknown'}', gender='{gender or 'unisex'}'."
    )
    if rec_size != base_size:
        notes.append(f"Adjusted to {rec_size} for '{pref_key}' fit preference.")

    return rec_size, base_size, notes


def _nearest_size(chest: float, product_type: Optional[str]) -> str:
    """
    Map estimated chest to a size in _SIZE_ORDER using the appropriate band table.
    """
    t = (product_type or "hoodie").lower()
    table = _BANDS.get(t, _BANDS["hoodie"])
    for s in _SIZE_ORDER:
        lo, hi = table[s]
        if lo <= chest <= hi:
            return s
    # fallback: mid/large bias
    return "L" if chest >= table["L"][0] else "M"


def _adjust_by_pref(size: str, pref: Optional[str]) -> str:
    """
    Shift one size down for tight/slim, one size up for loose/oversized.
    """
    p = (pref or "regular").lower()
    if size not in _SIZE_ORDER:
        return size

    idx = _SIZE_ORDER.index(size)
    if p in ("tight", "slim"):
        idx = max(0, idx - 1)
    elif p in ("loose", "oversized"):
        idx = min(len(_SIZE_ORDER) - 1, idx + 1)
    return _SIZE_ORDER[idx]


# --- integration with Django catalog -----------------------------------------

async def _fetch_product_sizes(slug: str) -> Optional[Dict[str, Any]]:
    """
    Call Django /tools/catalog.details?slug=... and aggregate available sizes
    across all variants into a simple dict: { "S": 10, "M": 7, ... }.

    This keeps fit logic generic and re-uses your canonical catalog gateway.
    """
    url = f"{DJANGO_BASE_URL}/tools/catalog.details"
    try:
        async with httpx.AsyncClient(timeout=8) as cx:
            resp = await cx.get(url, params={"slug": slug})
        if resp.status_code != 200:
            return None
        payload = resp.json()
    except Exception:
        return None

    product = payload.get("product") or {}
    variants = product.get("variants") or []

    sizes: Dict[str, int] = {}
    for v in variants:
        for s in v.get("sizes", []):
            size_key = str(s.get("size", "")).upper().strip()
            if not size_key:
                continue
            try:
                qty = int(s.get("quantity", 0))
            except Exception:
                qty = 0
            if qty <= 0:
                continue
            sizes[size_key] = sizes.get(size_key, 0) + qty

    return {
        "title": product.get("name") or "",
        "url": f"/product/{product.get('slug')}" if product.get("slug") else "",
        "type": product.get("type") or None,
        "sizes": sizes,
    }


# --- main endpoint -----------------------------------------------------------

@router.post("/ai/fit/recommend", response_model=FitOut)
async def fit_recommend(body: FitIn) -> FitOut:
    """
    Size advisor using config files:

    1. Estimate chest from height/weight (for BMI fallback).
    2. Try fitRules.json (height/weight blocks) for base size.
    3. If no rules match, fall back to BMI bands.
    4. Adjust for fit_preference.
    5. If slug is provided, intersect with real stock and nudge.
    """
    notes: List[str] = []
    citations: List[Dict[str, Any]] = []

    # 1) Estimate chest (always, for transparency + BMI fallback)
    chest = _estimate_chest_from_bmi(body.height_cm, body.weight_kg)
    notes.append(f"Estimated chest ≈ {chest:.1f} cm from height/weight.")

    product_type = (body.product_type or "hoodie").lower()

    # 2) Try rules first
    entry = _find_rules_entry(product_type, body.gender, body.fit_preference)
    used_rules = False

    if entry is not None:
        base = _pick_size_from_rules(entry, body.height_cm, body.weight_kg)
        if base:
            base_size = base
            used_rules = True
            notes.append(f"Base size from rules: {base_size} for product type '{product_type}'.")
        else:
            # rules exist but no block matched → BMI fallback
            base_size = _nearest_size(chest, product_type)
            notes.append(
                f"Base size from BMI bands: {base_size} for product type '{product_type}'."
            )
    else:
        # no rules at all for this combo → BMI fallback
        base_size = _nearest_size(chest, product_type)
        notes.append(
            f"Base size from BMI bands: {base_size} for product type '{product_type}'."
        )

    # 3) Adjust for fit preference
    pref = body.fit_preference or "regular"
    rec = _adjust_by_pref(base_size, pref)
    if rec != base_size:
        notes.append(f"Adjusted to {rec} for '{pref}' fit preference.")
    else:
        notes.append(f"Fit preference '{pref}' keeps base size {base_size}.")

    # 4) If slug present, intersect with real stock from Django
    if body.slug:
        prod = await _fetch_product_sizes(body.slug)
        if prod:
            sizes = prod.get("sizes") or {}
            avail = [s for s in _SIZE_ORDER if s in sizes and sizes[s] > 0]

            citations.append(
                {
                    "title": prod.get("title", ""),
                    "url": prod.get("url", ""),
                    "score": 1.0,
                }
            )

            if avail:
                if rec not in avail:
                    ri = _SIZE_ORDER.index(rec)
                    best = min(avail, key=lambda s: abs(_SIZE_ORDER.index(s) - ri))
                    notes.append(
                        f"Size {rec} not in stock for this product; "
                        f"nearest available size is {best}."
                    )
                    rec = best
                else:
                    notes.append(f"Size {rec} is in stock for this product.")
            else:
                notes.append(
                    "No sizes in stock for this product; showing generic recommendation."
                )
        else:
            notes.append("Could not fetch product data; returned generic size.")

    # 5) Confidence: 0.8 when rules used, 0.72 otherwise
    confidence = 0.8 if used_rules else 0.72

    return FitOut(
        size=rec,
        confidence=confidence,
        notes=notes,
        citations=citations,
    )
