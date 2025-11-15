# app/routes/fit.py
from __future__ import annotations
from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing import Optional, Dict
import math
import httpx
import re

router = APIRouter()

class FitIn(BaseModel):
    gender: Optional[str] = Field(default=None, pattern="^(male|female|unisex)?$")
    height_cm: float
    weight_kg: float
    fit_preference: Optional[str] = Field(
    default="regular",
    pattern="^(tight|regular|loose|slim|oversized)$")

    product_type: Optional[str] = None
    slug: Optional[str] = None  # when present, we intersect with available sizes

class FitOut(BaseModel):
    size: str
    confidence: float
    notes: list[str]
    citations: list[dict]

_SIZE_ORDER = ["XS","S","M","L","XL","XXL"]

# simple rules; replace with learned adapter later
def _estimate_chest_from_bmi(height_cm: float, weight_kg: float) -> float:
    h = max(1.45, min(2.1, height_cm/100.0))
    bmi = weight_kg / (h*h)
    # crude linear map to chest (cm)
    # anchor points: bmi 19 -> 88cm, bmi 23 -> 96cm, bmi 27 -> 104cm, bmi 31 -> 112cm
    return 88 + (bmi - 19) * (112 - 88) / (31 - 19)

# static garment bands (cm); tweak later
_BANDS = {
    "hoodie": {
        "XS": (0, 90), "S": (88, 94), "M": (93, 100),
        "L": (99, 106), "XL": (105, 112), "XXL": (111, 118)
    },
    "jacket": {
        "XS": (0, 88), "S": (86, 92), "M": (91, 98),
        "L": (97, 104), "XL": (103, 110), "XXL": (109, 116)
    },
    "jeans": {
        # map by waist proxy: chest ~ 1.08*waist ⇒ invert:
        # we still use chest estimates; for jeans it's rough, acceptable for v0.
        "XS": (0, 86), "S": (84, 90), "M": (89, 96),
        "L": (95, 102), "XL": (101, 108), "XXL": (107, 114)
    }
}

def _nearest_size(chest: float, product_type: Optional[str]) -> str:
    t = (product_type or "hoodie").lower()
    table = _BANDS.get(t, _BANDS["hoodie"])
    for s in _SIZE_ORDER:
        lo, hi = table[s]
        if lo <= chest <= hi:
            return s
    # fallback
    return "L" if chest >= table["L"][0] else "M"

def _adjust_by_pref(size: str, pref: str) -> str:
    idx = _SIZE_ORDER.index(size)
    p = (pref or "regular").lower()
    if p in ("tight", "slim"):
        idx = max(0, idx - 1)
    elif p in ("loose", "oversized"):
        idx = min(len(_SIZE_ORDER)-1, idx + 1)
    return _SIZE_ORDER[idx]


async def _fetch_product(slug: str) -> Optional[dict]:
    try:
        async with httpx.AsyncClient(timeout=8) as cx:
            r = await cx.get("http://127.0.0.1:8000/ai/tools/product.get", params={"slug": slug})
            if r.status_code == 200:
                return r.json()
    except Exception:
        pass
    return None

@router.post("/ai/fit/recommend", response_model=FitOut)
async def fit_recommend(body: FitIn):
    chest = _estimate_chest_from_bmi(body.height_cm, body.weight_kg)
    base = _nearest_size(chest, body.product_type)
    rec  = _adjust_by_pref(base, body.fit_preference or "regular")
    notes = [f"Estimated chest {chest:.1f} cm", f"Base {base}, adjusted for {body.fit_preference}"]

    citations = []
    # If slug provided, intersect with in-stock sizes; nudge to nearest available
    if body.slug:
        prod = await _fetch_product(body.slug)
        if prod:
            sizes = (prod.get("meta") or {}).get("sizes") or {}
            avail = [s for s in _SIZE_ORDER if s in sizes and sizes[s] > 0]
            citations.append({"title": prod.get("title",""), "url": prod.get("url",""), "score": 1.0})
            if avail:
                if rec not in avail:
                    # nudge to nearest available by index distance
                    ri = _SIZE_ORDER.index(rec)
                    best = min(avail, key=lambda s: abs(_SIZE_ORDER.index(s) - ri))
                    notes.append(f"{rec} not in stock; nearest available: {best}")
                    rec = best
            else:
                notes.append("No sizes in stock for this item.")
        else:
            notes.append("Product not found; returned generic size.")

    # crude confidence: center of band ± overlap penalty
    confidence = 0.72
    return {"size": rec, "confidence": confidence, "notes": notes, "citations": citations}
