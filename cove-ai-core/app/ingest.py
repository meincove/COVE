# cove-ai-core/app/ingest.py
from __future__ import annotations
import os, json, math, argparse, itertools, time
from typing import Iterable, List, Tuple, Dict, Any

import httpx
from psycopg import Connection
from psycopg.rows import tuple_row

from app.vector.store import connect
from app.core.config import OPENAI_API_KEY, EMBED_MODEL

DOCS_TABLE = "ai_core.docs"

# ----------------------------- utils ---------------------------------

def chunks(seq: List[Any], n: int) -> Iterable[List[Any]]:
    for i in range(0, len(seq), n):
        yield seq[i:i+n]

async def embed_texts(texts: List[str]) -> List[List[float]]:
    """
    Provider-aware embeddings:
      - EMBED_MODEL starts with 'openrouter:' -> OpenRouter endpoint
      - starts with 'cohere:'               -> Cohere embed
      - otherwise                           -> OpenAI direct
    """
    if not texts:
        return []

    model = EMBED_MODEL or ""
    async with httpx.AsyncClient(timeout=30) as cx:
        if model.startswith("openrouter:"):
            m = model.split("openrouter:", 1)[1]
            r = await cx.post(
                "https://openrouter.ai/api/v1/embeddings",
                headers={
                    "Authorization": f"Bearer {os.getenv('OPENROUTER_API_KEY','')}",
                    "Content-Type": "application/json",
                },
                json={"model": m, "input": texts},
            )
            r.raise_for_status()
            data = r.json()
            # OpenRouter returns OpenAI-shape: {data:[{embedding:[]},...]}
            return [d["embedding"] for d in data["data"]]

        elif model.startswith("cohere:"):
            m = model.split("cohere:", 1)[1]
            r = await cx.post(
                "https://api.cohere.ai/v1/embed",
                headers={
                    "Authorization": f"Bearer {os.getenv('COHERE_API_KEY','')}",
                    "Content-Type": "application/json",
                },
                json={"model": m, "texts": texts},
            )
            r.raise_for_status()
            data = r.json()
            return data["embeddings"]  # Cohere shape

        else:
            # default: OpenAI direct (expects OPENAI_API_KEY and an OpenAI model id)
            m = model.split("openai:", 1)[1] if model.startswith("openai:") else (model or "text-embedding-3-small")
            r = await cx.post(
                "https://api.openai.com/v1/embeddings",
                headers={
                    "Authorization": f"Bearer {os.getenv('OPENAI_API_KEY','')}",
                    "Content-Type": "application/json",
                },
                json={"model": m, "input": texts},
            )
            r.raise_for_status()
            data = r.json()
            return [d["embedding"] for d in data["data"]]

def upsert_doc(conn: Connection, *, kind: str, title: str, text: str,
               url: str | None, meta: Dict[str, Any] | None) -> None:
    """
    Inserts a row if not exists (by (kind, title, url, text) hash),
    else updates text/meta. Embedding is left null initially.
    """
    meta = meta or {}
    with conn.cursor() as cur:
        cur.execute(
            f"""
            insert into {DOCS_TABLE}(kind, title, text, url, meta)
            values (%s, %s, %s, %s, %s)
            on conflict do nothing
            """,
            (kind, title or "", text or "", url, json.dumps(meta))
        )

def backfill_embeddings_sync(conn: Connection, limit: int = 512) -> int:
    """
    Selects rows with NULL embedding, fetches embeddings in batches,
    and updates those rows.
    Returns number of rows updated.
    """
    # NOTE: we pull (id, text) and embed in batches
    with conn.cursor(row_factory=tuple_row) as cur:
        cur.execute(
            f"select id, text from {DOCS_TABLE} where embedding is null limit %s",
            (limit,)
        )
        rows = cur.fetchall()

    if not rows:
        return 0

    # Batch embed to avoid very long payloads. 128 is a good sweet spot.
    batch_size = 128
    all_updated = 0
    for batch in chunks(rows, batch_size):
        ids = [r[0] for r in batch]
        texts = [r[1] or "" for r in batch]

        # lazy import for asyncio to keep this file simple to run as script
        import asyncio
        embs: List[List[float]] = asyncio.run(embed_texts(texts))

        with conn.cursor() as cur:
            for _id, vec in zip(ids, embs):
                cur.execute(
                    f"update {DOCS_TABLE} set embedding = %s where id = %s",
                    (vec, _id)
                )
        conn.commit()
        all_updated += len(batch)

    return all_updated

# ----------------------- loaders for your JSONs -----------------------

def load_json(path: str) -> Any:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def normalize_text(s: str | None) -> str:
    s = s or ""
    # collapse huge whitespace
    return " ".join(s.split())

def add_product_docs(conn: Connection, catalog: Dict[str, Any], meta: Dict[str, Any]) -> int:
    """
    Walks your catalogData.json structure and writes product-level docs.
    Expects the same shape you use on the site (tiers -> products -> variants).
    """
    n = 0
    # catalog likely has tiers like {"casual":[...], "originals":[...]}
    for _, products in catalog.items():
        for p in products:
            name = p.get("name", "")
            base_price = p.get("base_price")
            tier = p.get("tier", "")
            pslug = p.get("slug", "")
            variants = p.get("variants", []) or []

            # Combine a short product text. You can make this richer later.
            base_txt = normalize_text(
                f"{name}. Tier: {tier}. Base price: {base_price}. "
                f"Material: {p.get('material','')}. Type: {p.get('type','')}."
            )

            for v in variants:
                vid = v.get("variantId")
                color = v.get("color_name", "")
                price = v.get("price")
                stock = v.get("stock")
                title = f"{name} — {color}".strip(" —")
                url = f"/product/{pslug}" if pslug else None

                # enrich from meta if present
                mrow = meta.get(vid, {}) if isinstance(meta, dict) else {}
                extra = {
                    "product_id": p.get("product_id"),
                    "variantId": vid,
                    "color": color,
                    "hex": v.get("color_hex"),
                    "images": v.get("images", []),
                    "price": price,
                    "stock": stock,
                    "meta": mrow,
                }
                text = normalize_text(
                    base_txt + " " +
                    f"Variant {vid}. Price {price}. Stock {stock}. "
                    f"Additional: {mrow.get('material','') or ''}."
                )
                upsert_doc(conn, kind="product", title=title, text=text, url=url, meta=extra)
                n += 1
    conn.commit()
    return n

def add_size_policy_docs(conn: Connection) -> int:
    """
    Quick seed for size/fit guidance. Replace with your canonical policy later.
    """
    examples = [
        {
            "title": "Size & Fit — Hoodies",
            "text": "Hoodies are regular fit: choose your usual size; size up for a relaxed/oversized look.",
            "url": "/policies/size-fit",
            "meta": {"category": "hoodie"}
        },
        {
            "title": "Size & Fit — Bombers",
            "text": "Bombers are regular fit; if you're between sizes, choose the larger.",
            "url": "/policies/size-fit",
            "meta": {"category": "bomber"}
        }
    ]
    for ex in examples:
        upsert_doc(conn, kind="size_policy", title=ex["title"], text=ex["text"], url=ex["url"], meta=ex["meta"])
    conn.commit()
    return len(examples)

# ------------------------------- CLI ---------------------------------

def main():
    parser = argparse.ArgumentParser(description="Cove AI — ingest catalog/policies into pgvector.")
    parser.add_argument("--catalog", help="Path to catalogData.json")
    parser.add_argument("--meta", help="Path to clothingMeta.json")
    parser.add_argument("--embed-missing", action="store_true", help="Backfill embeddings for rows with NULL embeddings")
    args = parser.parse_args()

    # Connect DB
    conn = connect()
    print("[ingest] Connected to DB.")

    total_inserted = 0

    # Load catalog if provided
    if args.catalog:
        catalog = load_json(args.catalog)
        m = load_json(args.meta) if args.meta else {}
        n = add_product_docs(conn, catalog, m)
        print(f"[ingest] Inserted/updated product docs: {n}")
        total_inserted += n

    # Always seed a tiny size policy set (safe & idempotent)
    n = add_size_policy_docs(conn)
    print(f"[ingest] Inserted/updated size policy docs: {n}")
    total_inserted += n

    if args.embed_missing:
        updated = backfill_embeddings_sync(conn, limit=2000)
        print(f"[ingest] Backfilled embeddings for rows: {updated}")

    print(f"[ingest] Done. Rows touched (insert/update attempts): {total_inserted}")

if __name__ == "__main__":
    main()
