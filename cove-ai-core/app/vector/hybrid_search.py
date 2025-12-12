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


def search_bm25(
    conn: psycopg.Connection,
    query: str,
    kind: str = "product",
    top_k: int = 20
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
    
    with conn.cursor(row_factory=dict_row) as cur:
        # Use plainto_tsquery for natural language queries
        # setweight gives title 4x more importance than text
        cur.execute(
            """
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
              AND (
                to_tsvector('english', COALESCE(title, '')) ||
                to_tsvector('english', COALESCE(text, ''))
              ) @@ plainto_tsquery('english', %s)
            ORDER BY bm25_score DESC
            LIMIT %s
            """,
            (query, query, kind, query, top_k),
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
    top_k: int = 20
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
    with conn.cursor(row_factory=dict_row) as cur:
        cur.execute(
            """
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
              AND embedding IS NOT NULL
            ORDER BY embedding <=> %s::vector
            LIMIT %s
            """,
            (query_embedding, query_embedding, kind, query_embedding, top_k),
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
    top_k: int = 6
) -> List[SearchResult]:
    """
    Reciprocal Rank Fusion (RRF) - Industry standard for hybrid search.
    
    Formula: RRF_score(d) = Σ 1 / (k + rank_i(d))
    
    Where:
    - d = document
    - k = constant (60 is empirically validated standard)
    - rank_i(d) = rank of document d in retriever i
    
    Args:
        bm25_results: Results from BM25 search
        vector_results: Results from vector search
        k: RRF constant (default 60 per industry research)
        top_k: Final number of results to return
        
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
            score += 1.0 / (k + bm25_ranks[doc_id])
        
        # Add vector contribution
        if doc_id in vector_ranks:
            score += 1.0 / (k + vector_ranks[doc_id])
        
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
    
    return results


def search_hybrid_rrf(
    conn: psycopg.Connection,
    query: str,
    query_embedding: List[float],
    kind: str = "product",
    top_k: int = 6,
    bm25_k: int = 20,
    vector_k: int = 20,
    rrf_constant: int = 60
) -> List[SearchResult]:
    """
    Complete hybrid search pipeline: BM25 + Vector + RRF fusion.
    
    Industry-standard implementation combining:
    1. BM25 keyword search (catches exact matches)
    2. Vector semantic search (catches conceptual matches)
    3. RRF fusion (best-of-both-worlds ranking)
    
    Example:
        Query: "COVE black hoodie"
        - BM25 catches: "COVE", "black", "hoodie" exact matches
        - Vector catches: semantically similar items
        - RRF boosts items that appear in both (high confidence)
    
    Args:
        conn: Database connection with pgvector registered
        query: Text query string
        query_embedding: Query vector from embedding model
        kind: Document kind filter (default: "product")
        top_k: Final number of results (default: 6)
        bm25_k: BM25 candidate pool size (default: 20)
        vector_k: Vector candidate pool size (default: 20)
        rrf_constant: RRF k parameter (default: 60 per research)
        
    Returns:
        List of top_k SearchResult objects sorted by RRF score
    """
    # 1. Get BM25 candidates
    bm25_results = search_bm25(conn, query, kind, bm25_k)
    
    # 2. Get vector candidates
    vector_results = search_vector(conn, query_embedding, kind, vector_k)
    
    # 3. Fuse with RRF
    hybrid_results = reciprocal_rank_fusion(
        bm25_results, 
        vector_results, 
        k=rrf_constant, 
        top_k=top_k
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
