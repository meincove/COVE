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
import logging
import json
from pathlib import Path

router = APIRouter()

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

# Optional helper index if you ever want to use "key": "hoodie_unisex_regular"
_SIZECHARTS_BY_KEY = {
    (e.get("key") or ""): e
    for e in _SIZECHARTS_RAW
    if isinstance(e, dict) and e.get("key")
}

# Use the same base URL convention as agent/cart_add
DJANGO_BASE_URL = os.getenv("DJANGO_BASE_URL", "http://127.0.0.1:8001").rstrip("/")


class FitIn(BaseModel):
    # NOTE: we removed strict regex patterns to avoid hardcoding and allow synonyms.
    gender: Optional[str] = Field(default=None)
    height_cm: float
    weight_kg: float
    fit_preference: Optional[str] = Field(default="regular")

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
# They now serve ONLY as a fallback when sizecharts.json doesn't define bands.
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


def _get_band_table(product_type: Optional[str]) -> Dict[str, tuple]:
    """
    Prefer band ranges from sizecharts.json; fall back to _BANDS.
    Expected sizecharts.json shape (example):

    [
      {
        "type": "hoodie",
        "gender": "unisex",
        "bands": {
          "S": { "chest_min": 88, "chest_max": 94 },
          "M": { "chest_min": 93, "chest_max": 100 },
          ...
        }
      },
      ...
    ]

    If your real JSON differs, you only need to adapt this function
    – the rest of the code stays generic.
    """
    t = (product_type or "hoodie").lower().strip()

    # Try to find a bands entry in sizecharts.json
    for entry in _SIZECHARTS_RAW:
        if not isinstance(entry, dict):
            continue
        etype = (entry.get("type") or "").lower().strip()
        if etype != t:
            continue

        bands_conf = entry.get("bands") or {}
        table: Dict[str, tuple] = {}
        if isinstance(bands_conf, dict):
            for size_key, v in bands_conf.items():
                if not isinstance(v, dict):
                    continue
                try:
                    lo = float(v.get("chest_min"))
                    hi = float(v.get("chest_max"))
                except (TypeError, ValueError):
                    continue
                table[size_key.upper().strip()] = (lo, hi)

        if table:
            return table

    # Fallback: hard-coded bands
    return _BANDS.get(t, _BANDS["hoodie"])


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


def _nearest_size(chest: float, product_type: Optional[str]) -> str:
    """
    Map estimated chest to a size in _SIZE_ORDER using band table
    from sizecharts.json (preferred) or fallback _BANDS.
    """
    table = _get_band_table(product_type)
    for s in _SIZE_ORDER:
        if s not in table:
            continue
        lo, hi = table[s]
        if lo <= chest <= hi:
            return s
    # fallback: mid/large bias
    if "L" in table:
        return "L" if chest >= table["L"][0] else "M"
    return "M"


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
    elif p in ("loose", "oversized", "relaxed", "baggy"):
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
    3. If no rules match, fall back to BMI bands from sizecharts.json or _BANDS.
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


# --- Quick-check endpoint for "Will This Fit?" UI -----------------------------

class QuickFitIn(BaseModel):
    """Lightweight fit check using only slug and size - uses session profile"""
    slug: str
    selected_size: str
    guest_id: Optional[str] = None
    user_id: Optional[str] = None
    # Optional overrides if session profile not available
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    gender: Optional[str] = None
    fit_preference: Optional[str] = None


class QuickFitOut(BaseModel):
    """Quick fit assessment result"""
    will_fit: str  # "yes", "likely", "maybe", "no"
    confidence: float
    recommendation: str
    suggested_size: Optional[str] = None
    message: str


@router.post("/ai/fit/quick-check", response_model=QuickFitOut)
async def fit_quick_check(body: QuickFitIn) -> QuickFitOut:
    """
    Quick "Will This Fit?" check for PDP.
    
    Uses session body profile if available, otherwise requires height/weight.
    Returns a fast assessment without detailed sizing breakdown.
    """
    from app.services.session_state import SessionStateManager
    
    # Try to get body profile from session
    mock_body = type('obj', (object,), {
        'guest_id': body.guest_id,
        'user_id': body.user_id,
    })()
    
    profile = SessionStateManager.get_body_profile(mock_body)
    
    # Determine measurements (session > request > missing)
    height = body.height_cm or profile.get("height_cm")
    weight = body.weight_kg or profile.get("weight_kg")
    gender = body.gender or profile.get("gender")
    fit_pref = body.fit_preference or profile.get("fit_preference", "regular")
    usual_sizes = profile.get("usual_sizes", {})
    
    # Quick check: if user has usual size for this category, use that
    prod = await _fetch_product_sizes(body.slug)
    product_type = (prod.get("type") if prod else "hoodie").lower() if prod else "hoodie"
    
    # Check usual size match first (highest confidence)
    if product_type in usual_sizes:
        usual = usual_sizes[product_type]
        selected_upper = body.selected_size.upper()
        
        if usual == selected_upper:
            return QuickFitOut(
                will_fit="yes",
                confidence=0.9,
                recommendation="perfect_match",
                suggested_size=None,
                message=f"✓ {body.selected_size} is your usual size for {product_type}s!"
            )
        else:
            # Calculate how far off
            if usual in _SIZE_ORDER and selected_upper in _SIZE_ORDER:
                diff = _SIZE_ORDER.index(selected_upper) - _SIZE_ORDER.index(usual)
                if diff == 1:
                    return QuickFitOut(
                        will_fit="likely",
                        confidence=0.75,
                        recommendation="slightly_large",
                        suggested_size=usual,
                        message=f"This may run slightly large. Your usual is {usual}."
                    )
                elif diff == -1:
                    return QuickFitOut(
                        will_fit="likely",
                        confidence=0.75,
                        recommendation="slightly_small",
                        suggested_size=usual,
                        message=f"This may run slightly small. Your usual is {usual}."
                    )
                elif abs(diff) >= 2:
                    return QuickFitOut(
                        will_fit="maybe",
                        confidence=0.5,
                        recommendation="size_mismatch",
                        suggested_size=usual,
                        message=f"This is {abs(diff)} sizes {'larger' if diff > 0 else 'smaller'} than your usual {usual}."
                    )
    
    # No usual size - need measurements
    if not height or not weight:
        return QuickFitOut(
            will_fit="maybe",
            confidence=0.3,
            recommendation="need_measurements",
            suggested_size=None,
            message="Add your height and weight for personalized fit advice."
        )
    
    # Calculate recommended size
    entry = _find_rules_entry(product_type, gender, fit_pref)
    if entry:
        base = _pick_size_from_rules(entry, height, weight)
        if not base:
            chest = _estimate_chest_from_bmi(height, weight)
            base = _nearest_size(chest, product_type)
    else:
        chest = _estimate_chest_from_bmi(height, weight)
        base = _nearest_size(chest, product_type)
    
    rec = _adjust_by_pref(base, fit_pref)
    selected_upper = body.selected_size.upper()
    
    if rec == selected_upper:
        return QuickFitOut(
            will_fit="yes",
            confidence=0.8,
            recommendation="calculated_match",
            suggested_size=None,
            message=f"✓ {body.selected_size} should fit well based on your measurements."
        )
    elif rec in _SIZE_ORDER and selected_upper in _SIZE_ORDER:
        diff = _SIZE_ORDER.index(selected_upper) - _SIZE_ORDER.index(rec)
        if abs(diff) == 1:
            return QuickFitOut(
                will_fit="likely",
                confidence=0.65,
                recommendation="close_match",
                suggested_size=rec,
                message=f"We recommend {rec} based on your measurements, but {selected_upper} could work."
            )
        else:
            return QuickFitOut(
                will_fit="no",
                confidence=0.7,
                recommendation="size_mismatch",
                suggested_size=rec,
                message=f"Based on your measurements, we recommend {rec} instead."
            )
    
    return QuickFitOut(
        will_fit="maybe",
        confidence=0.4,
        recommendation="uncertain",
        suggested_size=rec,
        message=f"Consider size {rec} based on your measurements."
    )
