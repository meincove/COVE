# app/catalog/variants.py
from __future__ import annotations
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
import json
from typing import Dict, List, Optional

BASE_DIR = Path(__file__).resolve().parents[2]  # adjust if needed

VARIANTS_PATH = BASE_DIR / "data" / "productVariantsFlat.json"

@dataclass
class VariantRecord:
    variantId: str
    groupId: str
    groupSlug: str
    sizingKey: str
    name: str
    tier: str
    type: str
    material: str
    gender: str
    fit: str
    price: float
    colorName: str
    hex: str
    sizes: Dict[str, int]
    images: List[str]
    description: str
    fabric: dict | None = None
    style: dict | None = None
    fitProfile: dict | None = None
    care: dict | None = None

@lru_cache(maxsize=1)
def _load_variants_raw() -> List[dict]:
    with VARIANTS_PATH.open("r", encoding="utf-8") as f:
        return json.load(f)

@lru_cache(maxsize=1)
def get_variants_index() -> Dict[str, VariantRecord]:
    records: Dict[str, VariantRecord] = {}
    for item in _load_variants_raw():
        rec = VariantRecord(
            variantId=item["variantId"],
            groupId=item["groupId"],
            groupSlug=item["groupSlug"],
            sizingKey=item["sizingKey"],
            name=item["name"],
            tier=item["tier"],
            type=item["type"],
            material=item["material"],
            gender=item["gender"],
            fit=item["fit"],
            price=float(item["price"]),
            colorName=item["colorName"],
            hex=item["hex"],
            sizes=item["sizes"],
            images=item["images"],
            description=item.get("description", ""),
            fabric=item.get("fabric"),
            style=item.get("style"),
            fitProfile=item.get("fitProfile"),
            care=item.get("care"),
        )
        records[rec.variantId] = rec
    return records

def get_variant(variant_id: str) -> Optional[VariantRecord]:
    return get_variants_index().get(variant_id)

def iter_variants() -> List[VariantRecord]:
    return list(get_variants_index().values())
