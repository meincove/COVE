# app/vector/seed_products.py
from __future__ import annotations
import json, os
from pathlib import Path
from typing import Any, Dict

import psycopg
from app.vector.store import connect, upsert_doc, _embed_sync  # reuse sync embed

KIND = "product"

def make_text(p: Dict[str, Any]) -> str:
    # Build a rich searchable text from fields
    parts = [
        p.get("name",""),
        p.get("description",""),
        p.get("type",""),
        p.get("tier",""),
        p.get("material",""),
        f"price {p.get('price','')}",
        f"fit {p.get('fit','')}",
        f"gender {p.get('gender','')}",
    ]
    # list color names
    colors = p.get("colors", [])
    if colors:
        cnames = ", ".join([c.get("colorName","") for c in colors])
        parts.append(f"colors {cnames}")
    return " ".join([s for s in parts if s])

def main(path: str):
    conn = connect()
    raw = json.loads(Path(path).read_text())
    # raw has tiers: casual/originals/designer -> list of products
    count = 0
    for tier, plist in raw.items():
        for p in plist:
            meta = dict(p)  # full product JSON as meta
            title = p.get("name", "")
            url   = f"/product/{p.get('slug','')}"  # adjust to your frontend route
            text  = make_text(p)
            # embed once per product
            [vec] = _embed_sync([text])
            upsert_doc(conn,
                       kind=KIND,
                       title=title,
                       text=text,
                       url=url,
                       meta=meta,
                       embedding=vec)
            count += 1
    print(f"seeded {count} product docs")

if __name__ == "__main__":
    import sys
    if len(sys.argv) != 2:
        print("Usage: python -m app.vector.seed_products /absolute/path/to/catalog.json")
        raise SystemExit(2)
    main(sys.argv[1])
