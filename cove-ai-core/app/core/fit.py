# app/core/fit.py
from __future__ import annotations
from typing import Optional, List, Dict, Literal

SizeName = Literal["XS", "S", "M", "L", "XL", "XXL"]
FitPreference = Literal["slim", "regular", "oversized"]

_SUPPORTED_SIZES: List[SizeName] = ["XS", "S", "M", "L", "XL", "XXL"]


def _normalize_sizes(sizes: Optional[List[str]]) -> List[SizeName]:
    """
    Normalize incoming size labels:
    - Uppercase
    - Filter to supported
    - Deduplicate
    - Order by standard XS..XXL
    """
    if not sizes:
        return []

    seen = set()
    normalized: List[SizeName] = []

    for s in sizes:
        if not s:
            continue
        su = s.strip().upper()
        if su in _SUPPORTED_SIZES and su not in seen:
            seen.add(su)
            normalized.append(su)  # type: ignore[arg-type]

    # order according to _SUPPORTED_SIZES
    order_index = {name: i for i, name in enumerate(_SUPPORTED_SIZES)}
    normalized.sort(key=lambda x: order_index[x])
    return normalized


def _safe_bmi(height_cm: float, weight_kg: float) -> float:
    h_m = max(height_cm, 80.0) / 100.0  # guard against nonsense
    return weight_kg / (h_m * h_m)


def _base_size_index(height_cm: float, weight_kg: float) -> int:
    """
    Heuristic mapping (height_cm, weight_kg) -> base size index 0..5 (XS..XXL).

    Uses BMI bands with a small height adjustment.
    """
    bmi = _safe_bmi(height_cm, weight_kg)

    # Map BMI to a coarse size index
    if bmi < 19:
        idx = 1  # S
    elif bmi < 23:
        idx = 2  # M
    elif bmi < 27:
        idx = 3  # L
    elif bmi < 31:
        idx = 4  # XL
    else:
        idx = 5  # XXL

    # Adjust for height
    if height_cm < 165:
        idx -= 1
    elif height_cm > 185:
        idx += 1

    return max(0, min(idx, len(_SUPPORTED_SIZES) - 1))


def _apply_fit_preference(idx: int, fit_preference: Optional[str]) -> int:
    pref = (fit_preference or "regular").lower()
    if pref == "slim":
        idx -= 1
    elif pref in ("oversized", "baggy", "loose"):
        idx += 1
    return max(0, min(idx, len(_SUPPORTED_SIZES) - 1))


def _nearest_available_size(
    target_size: SizeName,
    available: List[SizeName],
) -> SizeName:
    """
    Snap target_size to the nearest available size.
    """
    if not available:
        return target_size

    order_index = {name: i for i, name in enumerate(_SUPPORTED_SIZES)}
    target_idx = order_index.get(target_size, 0)

    # exact hit
    if target_size in available:
        return target_size

    # pick available size with minimal distance in the XS..XXL ordering
    best_size = available[0]
    best_dist = abs(order_index[best_size] - target_idx)
    for s in available[1:]:
        d = abs(order_index[s] - target_idx)
        if d < best_dist:
            best_dist = d
            best_size = s
    return best_size


def recommend_size(
    *,
    height_cm: float,
    weight_kg: float,
    gender: Optional[str] = None,
    fit_preference: Optional[str] = "regular",
    product_type: Optional[str] = "hoodie",
    available_sizes: Optional[List[str]] = None,
) -> Dict[str, object]:
    """
    Rules-based size recommendation for tops (e.g. hoodies, t-shirts).

    Returns dict:
        {
          "recommended_size": str | None,
          "confidence": float,
          "rationale": str,
          "available_sizes_considered": list[str],
          "notes": list[str],
        }
    """
    notes: List[str] = []
    product_type = (product_type or "hoodie").lower()

    # Normalize available sizes; if none, we assume full XS..XXL band
    normalized_available = _normalize_sizes(available_sizes)
    if not normalized_available:
        normalized_available = list(_SUPPORTED_SIZES)
        notes.append("Used default XS–XXL range (no product-specific sizes provided).")

    # Guard against nonsense inputs
    if height_cm <= 0 or weight_kg <= 0:
        return {
            "recommended_size": None,
            "confidence": 0.0,
            "rationale": "We couldn't recommend a size because height or weight was missing or invalid.",
            "available_sizes_considered": normalized_available,
            "notes": notes + ["Invalid height/weight input."],
        }

    # Base size index from BMI + height
    base_idx = _base_size_index(height_cm, weight_kg)
    size_from_body: SizeName = _SUPPORTED_SIZES[base_idx]

    # Adjust for fit preference
    adjusted_idx = _apply_fit_preference(base_idx, fit_preference)
    size_with_pref: SizeName = _SUPPORTED_SIZES[adjusted_idx]

    # Small gender nudge (optional; extremely conservative)
    g = (gender or "").lower()
    if g in ("female", "woman", "women") and product_type in ("hoodie", "tshirt", "t-shirt", "tee"):
        # For many women's fits, one step down is often closer; keep conservative.
        adjusted_idx = max(0, adjusted_idx - 1)
        size_with_pref = _SUPPORTED_SIZES[adjusted_idx]
        notes.append("Applied a small adjustment for typical women's fit.")

    # Snap to available sizes
    final_size = _nearest_available_size(size_with_pref, normalized_available)

    # Confidence logic
    confidence = 0.8  # base: we had height+weight and didn't do anything too crazy
    if final_size != size_with_pref:
        confidence -= 0.1
        notes.append(f"Snapped from {size_with_pref} to nearest available size {final_size}.")
    if available_sizes is None:
        confidence -= 0.1  # no product-specific size info

    # Clamp
    confidence = max(0.5, min(confidence, 0.9))

    # Build rationale
    pref_text = (fit_preference or "regular").lower()
    gender_text = f" and {g}" if g else ""
    rationale = (
        f"Based on a height of {int(round(height_cm))} cm and weight of {int(round(weight_kg))} kg"
        f"{gender_text} with a {pref_text} fit preference, "
        f"we recommend size {final_size} for this {product_type}."
    )

    return {
        "recommended_size": final_size,
        "confidence": round(confidence, 2),
        "rationale": rationale,
        "available_sizes_considered": normalized_available,
        "notes": notes,
    }
