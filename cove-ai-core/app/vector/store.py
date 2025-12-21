# app/vector/store.py
from __future__ import annotations

import os
import json
import uuid
from time import time
from typing import Any, Dict, List, Optional, Generator
from contextlib import contextmanager

import psycopg
from psycopg.rows import tuple_row, dict_row
from pgvector.psycopg import register_vector
from fastapi.concurrency import run_in_threadpool

# Optional pool import
try:
    from psycopg_pool import ConnectionPool  # type: ignore
except ImportError:
    ConnectionPool = None

from app.core.config import PG_DSN
from app.providers.embedding import embed_query as async_embed_query

# ---------------------------------------------------------------------
# DB CONNECTION FACTORY
# ---------------------------------------------------------------------

DB_DSN = PG_DSN or os.getenv("DATABASE_URL")
if not DB_DSN:
    raise RuntimeError("PG_DSN or DATABASE_URL must be set for vector store")

_pool: Any = None

def init_pool():
    """Initialize the global connection pool."""
    global _pool
    if _pool is not None:
        return

    if ConnectionPool is None:
        # Dummy pool for dev without psycopg_pool
        class _DummyPool:
            def connection(self):
                return psycopg.connect(DB_DSN, autocommit=True)
        _pool = _DummyPool()
    else:
        # Real pool - Neon-optimized
        _pool = ConnectionPool(
            conninfo=DB_DSN,
            min_size=0,  # Neon: Start with no connections
            max_size=5,  # Neon: Keep pool small
            num_workers=2,
            timeout=10,
            max_lifetime=300,  # Recycle every 5 min
            max_idle=60,  # Close idle after 1 min
            kwargs={"autocommit": True},
        )

@contextmanager
def get_conn_sync() -> Generator[psycopg.Connection, None, None]:
    """
    Yields a synchronous connection from the pool.
    Use this within run_in_threadpool blocks.
    """
    if _pool is None:
        init_pool()
        
    with _pool.connection() as conn:
        register_vector(conn)
        yield conn

# ---------------------------------------------------------------------
# ASYNC WRAPPERS (Non-blocking)
# ---------------------------------------------------------------------

async def search_hybrid(
    query: str,
    kind: str,
    top_k: int = 6,
) -> List[Dict[str, Any]]:
    """
    Async wrapper for TRUE hybrid search (BM25 + Vector + RRF).
    
    This is the main search entrypoint used throughout the app.
    1. Generates embedding asynchronously.
    2. Runs hybrid search (BM25 + Vector + RRF) in threadpool.
    
    Returns results with RRF-fused scores for best accuracy.
    """
    # 1. Async embedding
    q_emb = await async_embed_query(query)
    
    # 2. Hybrid search in threadpool
    return await run_in_threadpool(
        _search_hybrid_rrf_sync, 
        query=query, 
        q_emb=q_emb, 
        kind=kind, 
        top_k=top_k
    )

def _search_hybrid_rrf_sync(query: str, q_emb: List[float], kind: str, top_k: int) -> List[Dict[str, Any]]:
    """
    Synchronous implementation of hybrid search with RRF fusion.
    
    Uses industry-standard approach:
    - BM25 for keyword matching
    - Vector for semantic similarity  
    - RRF (k=60) for fusion
    """
    from app.vector.hybrid_search import search_hybrid_rrf, search_results_to_dict
    
    with get_conn_sync() as conn:
        results = search_hybrid_rrf(
            conn=conn,
            query=query,
            query_embedding=q_emb,
            kind=kind,
            top_k=top_k,
            bm25_k=20,      # Candidate pool for BM25
            vector_k=20,     # Candidate pool for vector
            rrf_constant=60  # Industry standard
        )
        
        return search_results_to_dict(results)

async def search_keyword(
    query: str,
    kind: str = "product",
    top_k: int = 6,
) -> List[Dict[str, Any]]:
    """
    Async wrapper for keyword search.
    """
    return await run_in_threadpool(_search_keyword_sync, query=query, kind=kind, top_k=top_k)

def _search_keyword_sync(query: str, kind: str, top_k: int) -> List[Dict[str, Any]]:
    q = (query or "").strip()
    if not q:
        return []

    with get_conn_sync() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT title, text, COALESCE(url, meta->>'url', '') AS url,
                       ts_rank(
                           setweight(to_tsvector('simple', COALESCE(title,'')), 'A') ||
                           setweight(to_tsvector('simple', COALESCE(text,'')),  'B'),
                           plainto_tsquery('simple', %s)
                       ) AS score
                FROM ai_core.docs
                WHERE kind = %s
                ORDER BY score DESC
                LIMIT %s
                """,
                (q, kind, top_k),
            )
            rows = cur.fetchall()

    return [
        {
            "title": r[0] or "",
            "text": r[1] or "",
            "url": r[2] or "",
            "score": float(r[3]) if r[3] is not None else 0.0,
        }
        for r in rows
    ]

# ---------------------------------------------------------------------
# LEGACY / SYNC HELPERS (Deprecated but kept for scripts)
# ---------------------------------------------------------------------

def connect() -> psycopg.Connection:
    """Legacy helper for scripts."""
    conn = psycopg.connect(DB_DSN, autocommit=True)
    register_vector(conn)
    return conn

def get_conn():
    """Legacy context manager."""
    return get_conn_sync()

import httpx
import psycopg
from psycopg.rows import tuple_row, dict_row
from pgvector.psycopg import register_vector
from contextlib import contextmanager

# Optional pool import with graceful fallback
try:
    from psycopg_pool import ConnectionPool  # type: ignore
except ImportError:  # psycopg_pool not installed
    ConnectionPool = None  # type: ignore

from app.core.config import PG_DSN

# ---------------------------------------------------------------------
# DB + CONNECTION POOL
# ---------------------------------------------------------------------

DB_DSN = PG_DSN or os.getenv("DATABASE_URL")
if not DB_DSN:
    raise RuntimeError("PG_DSN or DATABASE_URL must be set for vector store")

_pool: Any = None  # can be real ConnectionPool or dummy


def get_pool():
    """
    Global connection pool (or a lightweight fallback).

    In prod with psycopg_pool installed, this is a real ConnectionPool.
    If psycopg_pool is missing (dev box), we fall back to a tiny wrapper
    that just opens a fresh connection each time.
    """
    global _pool
    if _pool is not None:
        return _pool

    # Fallback: no psycopg_pool available → simple dummy “pool”
    if ConnectionPool is None:
        class _DummyPool:
            def connection(self):
                # psycopg.Connection is itself a context manager
                return psycopg.connect(DB_DSN, autocommit=True)

        _pool = _DummyPool()
        return _pool

    # Normal path: real psycopg_pool.ConnectionPool
    # Neon-optimized: connections recycled frequently to avoid SSL timeout
    _pool = ConnectionPool(
        conninfo=DB_DSN,
        min_size=0,  # Neon: Start with no connections
        max_size=5,  # Neon: Keep pool small for serverless
        num_workers=2,  # Reduced for Neon
        timeout=10,
        max_lifetime=300,  # ← NEON FIX: Recycle connections every 5 minutes
        max_idle=60,  # ← NEON FIX: Close idle connections after 1 minute
        # autocommit for our simple read/write use cases
        kwargs={"autocommit": True},
    )
    return _pool


@contextmanager
def get_conn() -> psycopg.Connection:
    """
    Context manager that yields a *fresh, healthy* connection from the pool.

    Usage:

        from app.vector.store import get_conn

        with get_conn() as conn:
            docs = search_hybrid(conn, query="...", kind="product", top_k=6)
    """
    pool = get_pool()
    with pool.connection() as conn:
        # ensure pgvector is registered for <=> operator on every new connection
        register_vector(conn)
        yield conn


def connect() -> psycopg.Connection:
    """
    Legacy helper for scripts / one-off jobs.

    For web requests prefer `get_conn()` so connections come from the pool.
    """
    conn = psycopg.connect(DB_DSN, autocommit=True)
    register_vector(conn)
    return conn


# ---------------------------------------------------------------------
# PRODUCT HELPERS
# ---------------------------------------------------------------------

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
        colors = meta.get("colors") or []
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


# ---------------------------------------------------------------------
# CATALOG VOCAB (colors/types) + CACHE
# ---------------------------------------------------------------------

_vocab_cache: Dict[str, Any] = {
    "t": 0.0,
    "colors": set(),
    "types": set(),
    "sizes": {"S", "M", "L", "XL"},
}


def catalog_vocab(conn: psycopg.Connection, ttl_sec: int = 60) -> Dict[str, Any]:
    """
    Return lowercased distinct colors and types for product variants.

    - colors: meta.colorName
    - types:  meta.type (fallback to first word of title)
    """
    now = time()
    if (now - _vocab_cache["t"] < ttl_sec) and _vocab_cache["colors"]:
        print(f"📚 [VOCAB] Using cached vocab (age: {now - _vocab_cache['t']:.1f}s)")
        return _vocab_cache
    
    print(f"📚 [VOCAB] Cache expired or empty, refreshing from ai_products...")

    colors, types = set(), set()
    with conn.cursor() as cur:
        # Colors from ai_products.metadata->>'color'
        # NOTE: ai_products is the correct table with actual color data
        # ai_core.docs has 2567 products but NO colors
        cur.execute(
            """
            SELECT DISTINCT lower(metadata->>'color')
            FROM ai_products
            WHERE metadata->>'color' IS NOT NULL
              AND metadata->>'color' != ''
            """
        )
        colors |= {r[0] for r in cur.fetchall() if r[0]}

        # Types from ai_products.type
        cur.execute(
            """
            SELECT DISTINCT lower(type)
            FROM ai_products
            WHERE type IS NOT NULL
              AND type != ''
            """
        )
        types |= {r[0] for r in cur.fetchall() if r[0]}

    print(f"📚 [VOCAB] Loaded {len(colors)} colors from ai_products: {sorted(colors)}")
    print(f"📚 [VOCAB] Loaded {len(types)} types from ai_products: {sorted(types)}")
    _vocab_cache.update({"t": now, "colors": colors, "types": types})
    return _vocab_cache
