# app/vector/seed_variants.py
from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any, Dict, List, Optional

from app.vector.store import connect, upsert_doc, _embed_sync

# If true → skip live embedding and leave embedding=NULL (use backfill later)
DISABLE_EMBEDDING = os.getenv("DISABLE_EMBEDDING", "false").lower() == "true"


def make_text(v: Dict[str, Any]) -> str:
    """
    Build a rich searchable text from a flat variant row:
    - name, description
    - type, tier, material, gender, fit
    - color and price
    """
    parts: List[str] = []

    def add(x: Optional[str]):
        if x:
            parts.append(str(x))

    add(v.get("name"))
    add(v.get("description"))
    add(v.get("type"))
    add(v.get("tier"))
    add(v.get("material"))
    add(f"gender {v.get('gender')}")
    add(f"fit {v.get('fit')}")
    add(f"color {v.get('colorName')}")
    add(f"price {v.get('price')}")

    return " ".join(p for p in parts if p)


def main(path: str):
    conn = connect()
    raw = json.loads(Path(path).read_text())

    if not isinstance(raw, list):
        raise RuntimeError("productVariantsFlat.json must be a LIST of variants")

    total = 0

    for v in raw:
        if not isinstance(v, dict):
            continue

        # meta is the variant row as-is
        meta: Dict[str, Any] = dict(v)

        group_slug = v.get("groupSlug") or v.get("slug") or ""
        variant_id = v.get("variantId")

        # Title: name + color
        base_name = v.get("name", "") or "Product"
        color_name = (v.get("colorName") or "").strip()
        if color_name:
            title = f"{base_name} — {color_name}"
        else:
            title = base_name

        url = f"/product/{group_slug}" if group_slug else "/product"

        text = make_text(v)

        # Optional embedding
        embedding = None
        if not DISABLE_EMBEDDING:
            try:
                [embedding] = _embed_sync([text])
            except Exception as e:
                # Don't crash the seeder if embedding fails
                print(f"[seed_variants] embed failed for {variant_id}: {e}", flush=True)
                embedding = None

        upsert_doc(
            conn,
            kind="product",
            title=title,
            text=text,
            url=url,
            meta=meta,
            embedding=embedding,
        )
        total += 1

    print(f"[seed_variants] seeded/updated {total} variant docs", flush=True)


if __name__ == "__main__":
    import sys

    if len(sys.argv) != 2:
        print("Usage: python -m app.vector.seed_variants /absolute/path/to/productVariantsFlat.json")
        raise SystemExit(2)

    main(sys.argv[1])
