# app/vector/store.py
from __future__ import annotations
import os, json, uuid
from typing import Any, Dict, List, Tuple

import httpx
import psycopg
from psycopg.rows import tuple_row
from pgvector.psycopg import register_vector
from psycopg.rows import dict_row

from app.core.config import PG_DSN

# --------- DB ----------
def connect():
    conn = psycopg.connect(PG_DSN, autocommit=True)
    register_vector(conn)
    return conn

def upsert_doc(conn, kind:str, title:str, text:str, url:str, meta:dict, embedding:list):
    with conn.cursor() as cur:
        cur.execute(
            """INSERT INTO ai_core.docs(id,kind,title,text,url,meta,embedding)
               VALUES(%s,%s,%s,%s,%s,%s,%s)
               ON CONFLICT(id) DO UPDATE SET
                 kind=EXCLUDED.kind, title=EXCLUDED.title, text=EXCLUDED.text,
                 url=EXCLUDED.url, meta=EXCLUDED.meta, embedding=EXCLUDED.embedding
            """,
            (str(uuid.uuid4()), kind, title, text, url, json.dumps(meta), embedding)
        )

# --------- Embeddings (sync, used by retriever) ----------
EMBED_MODEL = os.getenv("EMBED_MODEL","openrouter:openai/text-embedding-3-small")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY","")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY","")
COHERE_API_KEY = os.getenv("COHERE_API_KEY","")

def _embed_sync(texts: List[str]) -> List[List[float]]:
    if EMBED_MODEL.startswith("openrouter:"):
        model = EMBED_MODEL.split("openrouter:",1)[1]
        url = "https://openrouter.ai/api/v1/embeddings"
        headers = {"Authorization": f"Bearer {OPENROUTER_API_KEY}", "Content-Type":"application/json"}
        payload = {"model": model, "input": texts}
    elif EMBED_MODEL.startswith("cohere:"):
        model = EMBED_MODEL.split("cohere:",1)[1]
        url = "https://api.cohere.ai/v1/embed"
        headers = {"Authorization": f"Bearer {COHERE_API_KEY}", "Content-Type":"application/json"}
        payload = {"model": model, "texts": texts}
    else:
        model = EMBED_MODEL.split("openai:",1)[1] if EMBED_MODEL.startswith("openai:") else EMBED_MODEL
        url = "https://api.openai.com/v1/embeddings"
        headers = {"Authorization": f"Bearer {OPENAI_API_KEY}", "Content-Type":"application/json"}
        payload = {"model": model, "input": texts}

    with httpx.Client(timeout=30) as cx:
        r = cx.post(url, headers=headers, json=payload)
        r.raise_for_status()
        data = r.json()
        if "data" in data and data["data"] and "embedding" in data["data"][0]:
            return [d["embedding"] for d in data["data"]]
        if "embeddings" in data:  # Cohere
            return data["embeddings"]
        raise RuntimeError(f"Unexpected embedding response keys: {list(data.keys())}")

def embed_query(query: str) -> List[float]:
    return _embed_sync([query])[0]

# --------- Hybrid wrapper ----------
# ... header unchanged ...

def search_hybrid(conn: psycopg.Connection, query: str, kind: str, top_k: int = 6) -> List[Dict[str,Any]]:
    from app.vector.hybrid import hybrid_search

    hits = hybrid_search(conn, query=query, index_name=kind, k=max(24, top_k), k_rerank=top_k)

    # Fallback: dense-only if hybrid yielded nothing
    if not hits:
        q_emb = embed_query(query)
        with conn.cursor(row_factory=tuple_row) as cur:
            cur.execute(
                """
                SELECT id, kind, title, text, url, meta,
                       (1.0 - (embedding <=> %s::vector)) AS dense_score
                FROM ai_core.docs
                WHERE kind = %s
                ORDER BY embedding <=> %s::vector
                LIMIT %s
                """,
                (q_emb, kind, q_emb, top_k),
            )
            rows = cur.fetchall()
        hits = [
            type("Dummy", (), {
                "id": r[0], "kind": r[1],
                "title": r[2] or "", "text": r[3] or "",
                "url": r[4] or "", "meta": r[5] or {},
                "score_final": float(r[6] or 0.0)
            })() for r in rows
        ]

    # Map to rag.py expected dicts
    docs: List[Dict[str, Any]] = []
    for h in hits:
        meta = getattr(h, "meta", {}) or {}
        title = getattr(h, "title", "") or meta.get("title","") or ""
        url   = getattr(h, "url", "")   or meta.get("url","")   or ""
        text  = getattr(h, "text", "")  or meta.get("text","")  or ""
        docs.append({
            "id": getattr(h, "id", ""),
            "title": title,
            "url": url,
            "text": text,
            "score": float(getattr(h, "score_final", 0.0)),
            "meta": meta,
        })
    return docs




def get_product_by_slug(conn: psycopg.Connection, slug: str) -> dict | None:
    """
    Fetch a product row where meta->>'slug' matches.
    Returns a dict with: id, kind, title, url, meta
    """
    with conn.cursor(row_factory=dict_row) as cur:
        cur.execute(
            """
            SELECT id, kind, title, url, meta
            FROM ai_core.docs
            WHERE kind = 'product'
              AND COALESCE(meta->>'slug','') = %s
            LIMIT 1
            """,
            (slug,),
        )
        row = cur.fetchone()
        return dict(row) if row else None


def get_variant_by_id(conn: psycopg.Connection, variant_id: str) -> dict | None:
    """
    Search all product metas for a color variant with given variantId.
    Returns a dict: { product: {...}, variant: {...} }
    """
    with conn.cursor(row_factory=dict_row) as cur:
        cur.execute(
            """
            SELECT id, kind, title, url, meta
            FROM ai_core.docs
            WHERE kind = 'product'
              AND EXISTS (
                SELECT 1
                FROM jsonb_array_elements(COALESCE(meta->'colors','[]'::jsonb)) AS c
                WHERE c->>'variantId' = %s
              )
            LIMIT 1
            """,
            (variant_id,),
        )
        row = cur.fetchone()
        if not row:
            return None

        meta = row["meta"] or {}
        colors = (meta.get("colors") or [])
        variant = next((c for c in colors if (c.get("variantId") or "") == variant_id), None)

        return {
            "product": {
                "id": row["id"],
                "title": row["title"],
                "url": row["url"],
                "meta": meta,
            },
            "variant": variant,
        }

from time import time

_vocab_cache = {"t": 0, "colors": set(), "types": set(), "sizes": {"S","M","L","XL"}}

def catalog_vocab(conn, ttl_sec: int = 60):
    now = time()
    if now - _vocab_cache["t"] < ttl_sec and _vocab_cache["colors"]:
        return _vocab_cache

    colors, types = set(), set()
    with conn.cursor() as cur:
        # colors from meta.colors[].colorName
        cur.execute("""
            SELECT DISTINCT lower(c->>'colorName')
            FROM ai_core.docs, jsonb_array_elements(meta->'colors') c
            WHERE kind='product'
        """)
        colors = {r[0] for r in cur.fetchall()}

        # types from meta.type/title (fallback)
        cur.execute("""
            SELECT DISTINCT lower(COALESCE(meta->>'type', title))
            FROM ai_core.docs
            WHERE kind='product'
        """)
        types = {r[0] for r in cur.fetchall()}

    _vocab_cache.update({"t": now, "colors": colors, "types": types})
    return _vocab_cache
