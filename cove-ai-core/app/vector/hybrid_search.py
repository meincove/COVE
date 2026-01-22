# app/vector/hybrid_search.py
"""
Hybrid Search with BM25 + Vector + RRF Fusion

Combines keyword-based search (BM25) with semantic vector search using
Reciprocal Rank Fusion (RRF) for best-of-both-worlds retrieval.

Industry standard: k=60 for RRF (validated by ParadeDB, Milvus research)
"""

from __future__ import annotations
from typing import List, Dict, Any
from dataclasses import dataclass

import psycopg
from psycopg.rows import dict_row
from pgvector.psycopg import register_vector


@dataclass
class SearchResult:
    """Single search result with metadata"""
    id: str
    title: str
    text: str
    url: str
    meta: Dict[str, Any]
    score: float
    source: str  # 'vector', 'bm25', or 'hybrid'


def _build_sql_filters(filters: Dict[str, Any]) -> tuple[str, List[Any]]:
    """
    Build SQL WHERE clause fragments for metadata filtering.
    
    Supports:
    - type: str or List[str] (exact match or IN)
    - price_min / price_max: float range
    - gender: str (matches gender OR 'unisex')
    - tier / color / size: exact matches
    """
    if not filters:
        return "", []
        
    clauses = []
    params = []
    
    # 1. Type Filter (Supports String or List)
    if "type" in filters and filters["type"]:
        val = filters["type"]
        if isinstance(val, list):
            # List of types: meta->>'type' = ANY(%s)
            clauses.append("meta->>'type' = ANY(%s)")
            params.append(val)
        else:
            # Single type
            clauses.append("meta->>'type' = %s")
            params.append(val)
            
    # 2. Price Range
    if filters.get("price_min") is not None:
        clauses.append("(meta->>'price')::float >= %s")
        params.append(filters["price_min"])
        
    if filters.get("price_max") is not None:
        clauses.append("(meta->>'price')::float <= %s")
        params.append(filters["price_max"])

    # 3. Gender (Handle unisex logic if needed, or strict)
    # Note: DB usually has 'men', 'women', 'unisex'. 
    # If filter is 'men', we might want 'men' OR 'unisex'.
    if filters.get("gender"):
        g = filters["gender"].lower()
        
        # Robust mapping: Map input to ALL possible DB variations
        target_genders = [g]
        if g in ("male", "man", "men", "mens"):
            target_genders = ["male", "men", "man", "mens"]
        elif g in ("female", "woman", "women", "womens"):
            target_genders = ["female", "women", "woman", "womens"]
        
        # Match ANY of the target genders OR unisex
        clauses.append("(lower(meta->>'gender') = ANY(%s) OR lower(meta->>'gender') = 'unisex' OR meta->>'gender' IS NULL)")
        params.append(target_genders)

    # 4. Other exact matches
    for field in ["tier", "color", "size"]:
        if filters.get(field):
            clauses.append(f"meta->>'{field}' = %s")
            params.append(filters[field])

    if not clauses:
        return "", []
        
    return " AND " + " AND ".join(clauses), params


def search_bm25(
    conn: psycopg.Connection,
    query: str,
    kind: str = "product",
    top_k: int = 20,
    filters: Optional[Dict[str, Any]] = None
) -> List[SearchResult]:
    """
    BM25-style keyword search using PostgreSQL full-text search.
    
    Uses ts_rank with weighted tsvectors:
    - Title: weight 'A' (highest)
    - Text: weight 'B' (secondary)
    
    Args:
        conn: Database connection
        query: Search query string
        kind: Document kind filter
        top_k: Maximum results
        
    Returns:
        List of SearchResult objects sorted by BM25 score
    """
    if not query.strip():
        return []
        
    # Build filter SQL
    filter_sql, filter_params = _build_sql_filters(filters or {})
    
    with conn.cursor(row_factory=dict_row) as cur:
        # Use plainto_tsquery for natural language queries
        # setweight gives title 4x more importance than text
        
        # Combine params: [query (rank), query (rank), kind, *filter_params, query (match), top_k]
        sql_params = [query, query, kind] + filter_params + [query, top_k]
        
        cur.execute(
            f"""
            SELECT 
                id,
                title,
                text,
                url,
                meta,
                ts_rank(
                    setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
                    setweight(to_tsvector('english', COALESCE(text, '')),  'B'),
                    plainto_tsquery('english', %s)
                ) AS bm25_score,
                ROW_NUMBER() OVER (ORDER BY 
                    ts_rank(
                        setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
                        setweight(to_tsvector('english', COALESCE(text, '')),  'B'),
                        plainto_tsquery('english', %s)
                    ) DESC
                ) AS rank
            FROM ai_core.docs
            WHERE kind = %s
              {filter_sql}
              AND (
                to_tsvector('english', COALESCE(title, '')) ||
                to_tsvector('english', COALESCE(text, ''))
              ) @@ plainto_tsquery('english', %s)
            ORDER BY bm25_score DESC
            LIMIT %s
            """,
            tuple(sql_params),
        )
        rows = cur.fetchall()
    
    return [
        SearchResult(
            id=row['id'],
            title=row['title'] or '',
            text=row['text'] or '',
            url=row['url'] or '',
            meta=row['meta'] or {},
            score=float(row['bm25_score'] or 0.0),
            source='bm25'
        )
        for row in rows
    ]


def search_vector(
    conn: psycopg.Connection,
    query_embedding: List[float],
    kind: str = "product",
    top_k: int = 20,
    filters: Optional[Dict[str, Any]] = None
) -> List[SearchResult]:
    """
    Dense vector similarity search using pgvector.
    
    Uses cosine similarity (<=> operator) to find semantically similar items.
    
    Args:
        conn: Database connection
        query_embedding: Query vector (1536 dimensions for text-embedding-3-small)
        kind: Document kind filter
        top_k: Maximum results
        
    Returns:
        List of SearchResult objects sorted by cosine similarity
    """
    # Build filter SQL
    filter_sql, filter_params = _build_sql_filters(filters or {})
    
    with conn.cursor(row_factory=dict_row) as cur:
        # Combine params: [q_emb, q_emb, kind, *filter_params, q_emb, top_k]
        sql_params = [query_embedding, query_embedding, kind] + filter_params + [query_embedding, top_k]
        
        cur.execute(
            f"""
            SELECT 
                id,
                title,
                text,
                url,
                meta,
                (1.0 - (embedding <=> %s::vector)) AS vector_score,
                ROW_NUMBER() OVER (ORDER BY embedding <=> %s::vector) AS rank
            FROM ai_core.docs
            WHERE kind = %s
              {filter_sql}
              AND embedding IS NOT NULL
            ORDER BY embedding <=> %s::vector
            LIMIT %s
            """,
            tuple(sql_params),
        )
        rows = cur.fetchall()
    
    return [
        SearchResult(
            id=row['id'],
            title=row['title'] or '',
            text=row['text'] or '',
            url=row['url'] or '',
            meta=row['meta'] or {},
            score=float(row['vector_score'] or 0.0),
            source='vector'
        )
        for row in rows
    ]


def reciprocal_rank_fusion(
    bm25_results: List[SearchResult],
    vector_results: List[SearchResult],
    k: int = 60,
    top_k: int = 6,
    bm25_weight: float = 1.0,
    vector_weight: float = 1.0
) -> List[SearchResult]:
    """
    Reciprocal Rank Fusion (RRF) with Dynamic Weighting.
    
    Standard Formula: RRF_score(d) = weight * (1 / (k + rank_i(d)))
    
    Where:
    - d = document
    - k = constant (60 is empirically validated standard)
    - rank_i(d) = rank of document d in retriever i
    
    Args:
        bm25_results: Results from BM25 search
        vector_results: Results from vector search
        k: RRF constant (default 60 per industry research)
        top_k: Final number of results to return
        bm25_weight: Weight to apply to BM25 scores
        vector_weight: Weight to apply to vector scores
        
    Returns:
        Fused results sorted by RRF score
    """
    # Build rank maps
    bm25_ranks = {r.id: (idx + 1) for idx, r in enumerate(bm25_results)}
    vector_ranks = {r.id: (idx + 1) for idx, r in enumerate(vector_results)}
    
    # Collect all unique documents
    all_results = {r.id: r for r in bm25_results}
    all_results.update({r.id: r for r in vector_results})
    
    # Calculate RRF scores
    rrf_scores = {}
    for doc_id in all_results:
        score = 0.0
        
        # Add BM25 contribution
        if doc_id in bm25_ranks:
            score += bm25_weight * (1.0 / (k + bm25_ranks[doc_id]))
        
        # Add vector contribution
        if doc_id in vector_ranks:
            score += vector_weight * (1.0 / (k + vector_ranks[doc_id]))
        
        rrf_scores[doc_id] = score
    
    # Sort by RRF score and return top_k
    sorted_ids = sorted(rrf_scores.items(), key=lambda x: x[1], reverse=True)
    
    results = []
    for doc_id, rrf_score in sorted_ids[:top_k]:
        result = all_results[doc_id]
        # Update with RRF score and mark as hybrid
        results.append(SearchResult(
            id=result.id,
            title=result.title,
            text=result.text,
            url=result.url,
            meta=result.meta,
            score=rrf_score,
            source='hybrid'
        ))
    
    return results
    

def search_hybrid_rrf(
    conn: psycopg.Connection,
    query: str,
    query_embedding: List[float],
    kind: str = "product",
    top_k: int = 6,
    bm25_k: int = 20,
    vector_k: int = 20,
    rrf_constant: int = 60,
    visual_vibe: Optional[str] = None,
    sku_boost: bool = False,
    filters: Optional[Dict[str, Any]] = None
) -> List[SearchResult]:
    """
    Complete hybrid search pipeline with Dynamic Weights (Zalando Style).
    
    Industry-standard implementation combining:
    1. BM25 keyword search (catches exact matches)
    2. Vector semantic search (catches conceptual matches)
    3. RRF fusion (best-of-both-worlds ranking)
    
    Dynamic Weighting:
    - visual_vibe: Boosts Vector Search (semantic)
    - sku_boost: Boosts BM25 Search (exact keyword/SKU)
    
    Args:
        conn: Database connection with pgvector registered
        query: Text query string
        query_embedding: Query vector from embedding model
        kind: Document kind filter (default: "product")
        top_k: Final number of results (default: 6)
        bm25_k: BM25 candidate pool size (default: 20)
        vector_k: Vector candidate pool size (default: 20)
        rrf_constant: RRF k parameter (default: 60 per research)
        visual_vibe: Optional string for vibe boosting
        visual_vibe: Optional string for vibe boosting
        sku_boost: Boolean to boost BM25 for exact/SKU queries
        filters: Optional dict of metadata filters (type, price, gender, etc.)
        
    Returns:
        List of top_k SearchResult objects sorted by RRF score
    """
    # Dynamic Weighting Logic
    bm25_weight = 1.0
    vector_weight = 1.0
    
    if visual_vibe:
        # Vibe-based query: Boost Vector Search (semantic)
        vector_weight = 3.0  # 3x boost for vibe queries
        # Expand vector candidate pool to capture more semantic matches
        vector_k = 40 
        
    if sku_boost:
        # Exact/SKU query: Boost BM25 Search (keyword)
        # This overrides vibe boost if both are present (exact match takes precedence)
        bm25_weight = 3.0
        # Expand BM25 pool to ensure the exact match is found
        bm25_k = 40

    # 1. Get BM25 candidates
    bm25_results = search_bm25(conn, query, kind, bm25_k, filters=filters)
    
    # 2. Get vector candidates
    vector_results = search_vector(conn, query_embedding, kind, vector_k, filters=filters)
    
    # 3. Fuse with RRF
    hybrid_results = reciprocal_rank_fusion(
        bm25_results, 
        vector_results, 
        k=rrf_constant, 
        top_k=top_k,
        bm25_weight=bm25_weight,
        vector_weight=vector_weight
    )
    
    return hybrid_results


def search_results_to_dict(results: List[SearchResult]) -> List[Dict[str, Any]]:
    """Convert SearchResult objects to dict format for API responses."""
    return [
        {
            'id': r.id,
            'title': r.title,
            'text': r.text,
            'url': r.url,
            'meta': r.meta,
            'score': r.score,
            'source': r.source
        }
        for r in results
    ]
