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
            timeout=180,  # Increased for Neon unarchive cold start (can take 60-120s)
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
    filters: Optional[Dict[str, Any]] = None
) -> List[Dict[str, Any]]:
    """
    Async wrapper for TRUE hybrid search (BM25 + Vector + RRF).
    """
    # 1. Async embedding
    q_emb = await async_embed_query(query)
    
    # 2. Hybrid search in threadpool
    return await run_in_threadpool(
        _search_hybrid_rrf_sync, 
        query=query, 
        q_emb=q_emb, 
        kind=kind, 
        top_k=top_k,
        filters=filters
    )

def _search_hybrid_rrf_sync(query: str, q_emb: List[float], kind: str, top_k: int, filters: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
    """
    Synchronous implementation of hybrid search with RRF fusion.
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
            rrf_constant=60,  # Industry standard
            filters=filters
        )
        
        return search_results_to_dict(results)

async def search_keyword(
    query: str,
    kind: str = "product",
    top_k: int = 6,
    filters: Optional[Dict[str, Any]] = None,
) -> List[Dict[str, Any]]:
    """
    Async wrapper for keyword search.
    """
    return await run_in_threadpool(_search_keyword_sync, query=query, kind=kind, top_k=top_k, filters=filters)

def _search_keyword_sync(query: str, kind: str, top_k: int, filters: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
    q = (query or "").strip()
    if not q:
        return []

    from app.vector.hybrid_search import _build_sql_filters
    filter_sql, filter_params = _build_sql_filters(filters or {})

    with get_conn_sync() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT title, text, COALESCE(url, meta->>'url', '') AS url,
                       ts_rank(
                           setweight(to_tsvector('simple', COALESCE(title,'')), 'A') ||
                           setweight(to_tsvector('simple', COALESCE(text,'')),  'B'),
                           plainto_tsquery('simple', %s)
                       ) AS score,
                       meta
                FROM ai_core.docs
                WHERE kind = %s
                {filter_sql}
                ORDER BY score DESC
                LIMIT %s
                """,
                (q, kind, *filter_params, top_k),
            )
            rows = cur.fetchall()

    return [
        {
            "title": r[0] or "",
            "text": r[1] or "",
            "url": r[2] or "",
            "score": float(r[3]) if r[3] is not None else 0.0,
            "meta": r[4],
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
        timeout=180,  # Increased for Neon unarchive cold start (can take 60-120s)
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
# OUTFIT CATEGORY SEARCH (v2 Architecture)
# ---------------------------------------------------------------------

async def search_by_outfit_category(
    outfit_category: str,
    style_query: str = "",
    gender: Optional[str] = None,
    price_max: Optional[float] = None,
    exclude_slugs: Optional[List[str]] = None,
    top_k: int = 10,
    brand: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    Category-constrained vector search for outfit building.
    
    CRITICAL: Filters are applied at the DATABASE level, not post-retrieval.
    This ensures we always get results in the correct category.
    
    Args:
        outfit_category: One of "tops", "bottoms", "shoes", "outerwear", "accessories", "dress"
        style_query: Style context for semantic matching (e.g., "casual weekend")
        gender: Optional gender filter ("men", "women", "unisex")
        price_max: Optional maximum price filter
        exclude_slugs: Products to exclude (for generating multiple unique outfits)
        top_k: Number of results to return
        brand: Optional brand filter to restrict search to specific brands
        
    Returns:
        List of product dicts sorted by vector similarity
    """
    import logging
    log = logging.getLogger("cove.outfit")
    
    # Generate embedding for style context
    query_text = f"{style_query} {outfit_category}" if style_query else outfit_category
    q_emb = await async_embed_query(query_text)
    
    # Run constrained search in threadpool
    return await run_in_threadpool(
        _search_by_category_sync,
        outfit_category=outfit_category,
        q_emb=q_emb,
        gender=gender,
        price_max=price_max,
        exclude_slugs=exclude_slugs or [],
        top_k=top_k,
        brand=brand
    )


def _search_by_category_sync(
    outfit_category: str,
    q_emb: List[float],
    gender: Optional[str],
    price_max: Optional[float],
    exclude_slugs: List[str],
    top_k: int,
    brand: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Synchronous category-constrained ANN search."""
    import logging
    log = logging.getLogger("cove.outfit")
    
    with get_conn_sync() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            # Build query with category constraint at DB level
            sql = """
                SELECT 
                    id, title, url, meta,
                    1 - (embedding <=> %s::vector) as similarity
                FROM ai_core.docs
                WHERE kind = 'product'
                  AND embedding IS NOT NULL
                  AND meta->>'outfit_category' = %s
            """
            params = [q_emb, outfit_category]
            
            # Gender filter (allow unisex to match any)
            if gender:
                g = gender.lower()
                target_genders = [g]
                if g in ("male", "man", "men", "mens"):
                    target_genders = ["male", "men", "man", "mens"]
                elif g in ("female", "woman", "women", "womens"):
                    target_genders = ["female", "women", "woman", "womens"]
                    
                sql += " AND (lower(meta->>'gender') = ANY(%s) OR lower(meta->>'gender') = 'unisex' OR meta->>'gender' IS NULL)"
                params.append(target_genders)
            
            # Price filter
            if price_max:
                sql += " AND (meta->>'price')::float <= %s"
                params.append(price_max)
            
            # Brand filter (PREMIUM PILOT)
            if brand:
                sql += " AND lower(meta->>'brand') = %s"
                params.append(brand.lower())
            
            # Exclude already-used items
            if exclude_slugs:
                sql += " AND NOT (COALESCE(meta->>'slug', '') = ANY(%s))"
                params.append(list(exclude_slugs))
            
            sql += " ORDER BY embedding <=> %s::vector LIMIT %s"
            params.extend([q_emb, top_k])
            
            log.info(f"🔍 Category search: {outfit_category}, gender={gender}, price_max={price_max}, top_k={top_k}")
            
            cur.execute(sql, params)
            rows = cur.fetchall()
            
            log.info(f"   ✅ Found {len(rows)} items in {outfit_category}")
            
            return [
                {
                    "title": r["title"],
                    "url": r["url"],
                    "slug": (r["meta"] or {}).get("slug", ""),
                    "type": (r["meta"] or {}).get("type", ""),
                    "outfit_category": (r["meta"] or {}).get("outfit_category", ""),
                    "price": (r["meta"] or {}).get("price"),
                    "imageUrl": (r["meta"] or {}).get("imageUrl") or (r["meta"] or {}).get("image"),
                    "color": (r["meta"] or {}).get("color"),
                    "brand": (r["meta"] or {}).get("brand"),
                    "gender": (r["meta"] or {}).get("gender"),
                    "similarity": r["similarity"],
                    "meta": r["meta"],
                }
                for r in rows
            ]


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


def get_product_embedding_by_slug(conn: psycopg.Connection, slug: str) -> List[float] | None:
    """
    Fetch the vector embedding for a product by its slug.
    Used for 'visual similar' / 'more like this' search.
    """
    with conn.cursor(row_factory=dict_row) as cur:
        cur.execute(
            """
            SELECT embedding
            FROM ai_core.docs
            WHERE kind = 'product'
              AND COALESCE(meta->>'slug','') = %s
              AND embedding IS NOT NULL
            LIMIT 1
            """,
            (slug,),
        )
        row = cur.fetchone()
        
        if row and row['embedding'] is not None:
            # pgvector returns numpy array or list depending on adapter, 
            # but psycopg 3 + pgvector usually returns a list/array object that casts to list
            return list(row['embedding'])
            
        return None

def get_product_embeddings_by_slugs(conn: psycopg.Connection, slugs: List[str]) -> Dict[str, List[float]]:
    """
    Fetch embeddings for multiple products in one query.
    Returns dict: { slug: embedding_list }
    """
    if not slugs:
        return {}
        
    with conn.cursor(row_factory=dict_row) as cur:
        cur.execute(
            """
            SELECT meta->>'slug' as slug, embedding
            FROM ai_core.docs
            WHERE kind = 'product'
              AND COALESCE(meta->>'slug','') = ANY(%s)
              AND embedding IS NOT NULL
            """,
            (slugs,),
        )
        rows = cur.fetchall()
        
        result = {}
        for row in rows:
            if row['slug'] and row['embedding'] is not None:
                result[row['slug']] = list(row['embedding'])
        return result
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
    
    print(f"📚 [VOCAB] Cache expired or empty, refreshing from ai_core.docs...")

    colors, types, brands = set(), set(), set()
    with conn.cursor() as cur:
        # Colors from ai_core.docs meta->'colors' array (colorName field)
        # This is the correct location based on schema
        cur.execute(
            """
            SELECT DISTINCT lower(c->>'colorName')
            FROM ai_core.docs,
                 jsonb_array_elements(COALESCE(meta->'colors', '[]'::jsonb)) AS c
            WHERE kind = 'product'
              AND c->>'colorName' IS NOT NULL
              AND c->>'colorName' != ''
            """
        )
        colors |= {r[0] for r in cur.fetchall() if r[0]}

        # Types from meta->>'type'
        cur.execute(
            """
            SELECT DISTINCT lower(meta->>'type')
            FROM ai_core.docs
            WHERE kind = 'product'
              AND meta->>'type' IS NOT NULL
              AND meta->>'type' != ''
            """
        )
        types |= {r[0] for r in cur.fetchall() if r[0]}
        
        # Brands from meta->>'brand'
        cur.execute(
            """
            SELECT DISTINCT lower(meta->>'brand')
            FROM ai_core.docs
            WHERE kind = 'product'
              AND meta->>'brand' IS NOT NULL
              AND meta->>'brand' != ''
            """
        )
        brands |= {r[0] for r in cur.fetchall() if r[0]}

    print(f"📚 [VOCAB] Loaded {len(colors)} colors from ai_core.docs: {sorted(colors)}")
    print(f"📚 [VOCAB] Loaded {len(types)} types from ai_core.docs: {sorted(types)}")
    print(f"📚 [VOCAB] Loaded {len(brands)} brands from ai_core.docs: {sorted(brands)}")
    _vocab_cache.update({"t": now, "colors": colors, "types": types, "brands": brands})
    return _vocab_cache
