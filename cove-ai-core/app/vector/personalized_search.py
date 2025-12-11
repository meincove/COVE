# app/vector/personalized_search.py
"""
Personalized Search with CF Integration

Combines hybrid search (BM25 + Vector + RRF) with collaborative filtering
for personalized recommendations based on user purchase history.

Industry standard: 60% search relevance + 40% CF personalization
"""

from __future__ import annotations
from typing import List, Dict, Any, Optional
from dataclasses import dataclass

import psycopg
from app.vector.hybrid_search import SearchResult, search_hybrid_rrf, search_results_to_dict


@dataclass
class PersonalizedResult:
    """Search result with personalization scores"""
    id: str
    title: str
    text: str
    url: str
    meta: Dict[str, Any]
    search_score: float  # Original hybrid search score
    cf_score: float      # Collaborative filtering score
    final_score: float   # Fused score (60% search + 40% CF)
    source: str


def get_user_purchase_history(user_id: str) -> List[str]:
    """
    Get list of product variant IDs that user has purchased.
    
    TODO: Replace with actual database query when user tracking is implemented.
    For now, returns empty list (no personalization).
    
    Args:
        user_id: User identifier
        
    Returns:
        List of variant IDs user has purchased
    """
    # Placeholder - integrate with order history when available
    # Example:
    # with get_conn_sync() as conn:
    #     cur.execute("""
    #         SELECT DISTINCT variant_id 
    #         FROM orders 
    #         WHERE user_id = %s
    #     """, (user_id,))
    #     return [row[0] for row in cur.fetchall()]
    
    return []


def calculate_cf_scores_for_results(
    results: List[SearchResult],
    user_items: List[str],
    cf_model: Optional[Any] = None
) -> Dict[str, float]:
    """
    Calculate collaborative filtering scores for search results.
    
    For each result, computes similarity to items in user's purchase history.
    
    Args:
        results: Search results to score
        user_items: List of variant IDs user has purchased
        cf_model: Collaborative filtering model (ItemBasedCF instance)
        
    Returns:
        Dict mapping result IDs to CF scores (0.0 to 1.0)
    """
    if not user_items or cf_model is None:
        # No history or no CF model - return zero scores
        return {r.id: 0.0 for r in results}
    
    cf_scores = {}
    
    for result in results:
        variant_id = result.meta.get('variant_id') or result.id
        
        # Average similarity to all items in user history
        similarities = []
        for user_item in user_items:
            similarity = cf_model.get_similarity(variant_id, user_item)
            if similarity > 0:
                similarities.append(similarity)
        
        # Average similarity score
        cf_scores[result.id] = sum(similarities) / len(similarities) if similarities else 0.0
    
    return cf_scores


def apply_brand_affinity(
    results: List[SearchResult],
    user_id: str,
    user_items: List[str]
) -> Dict[str, float]:
    """
    Calculate brand affinity scores based on user's purchase history.
    
    If user frequently buys from certain brands, boost those brands.
    
    Args:
        results: Search results
        user_id: User identifier  
        user_items: User's purchase history
        
    Returns:
        Dict mapping result IDs to brand affinity scores
    """
    if not user_items:
        return {r.id: 0.0 for r in results}
    
    # Count brand purchases from history
    # TODO: Fetch actual brand data from user_items
    # For now, return neutral scores
    return {r.id: 0.0 for r in results}


def personalized_search(
    conn: psycopg.Connection,
    query: str,
    query_embedding: List[float],
    user_id: Optional[str] = None,
    kind: str = "product",
    top_k: int = 6,
    cf_model: Optional[Any] = None,
    search_weight: float = 0.6,
    cf_weight: float = 0.4
) -> List[PersonalizedResult]:
    """
    Personalized search with CF reranking.
    
    Pipeline:
    1. Hybrid search (BM25 + Vector + RRF) → relevance scores
    2. CF scoring → personalization scores  
    3. Weighted fusion → final ranking
    
    Industry standard weights:
    - 60% search relevance (what matches the query)
    - 40% CF personalization (what user might like)
    
    Args:
        conn: Database connection
        query: Search query text
        query_embedding: Query vector
        user_id: Optional user ID for personalization
        kind: Document kind filter
        top_k: Number of final results
        cf_model: Optional CF model instance
        search_weight: Weight for search relevance (default 0.6)
        cf_weight: Weight for CF personalization (default 0.4)
        
    Returns:
        List of PersonalizedResult objects with fused scores
    """
    # 1. Get hybrid search results (larger pool for reranking)
    search_results = search_hybrid_rrf(
        conn=conn,
        query=query,
        query_embedding=query_embedding,
        kind=kind,
        top_k=top_k * 3,  # Get 3x results for CF reranking
        bm25_k=30,
        vector_k=30,
        rrf_constant=60
    )
    
    # 2. If no user or no CF model, return search results as-is
    if not user_id or cf_model is None:
        return [
            PersonalizedResult(
                id=r.id,
                title=r.title,
                text=r.text,
                url=r.url,
                meta=r.meta,
                search_score=r.score,
                cf_score=0.0,
                final_score=r.score,
                source='search_only'
            )
            for r in search_results[:top_k]
        ]
    
    # 3. Get user purchase history
    user_items = get_user_purchase_history(user_id)
    
    if not user_items:
        # User has no history - return search results
        return [
            PersonalizedResult(
                id=r.id,
                title=r.title,
                text=r.text,
                url=r.url,
                meta=r.meta,
                search_score=r.score,
                cf_score=0.0,
                final_score=r.score,
                source='no_history'
            )
            for r in search_results[:top_k]
        ]
    
    # 4. Calculate CF scores
    cf_scores = calculate_cf_scores_for_results(search_results, user_items, cf_model)
    
    # 5. Apply weighted fusion
    personalized_results = []
    for result in search_results:
        cf_score = cf_scores.get(result.id, 0.0)
        
        # Normalize search score (RRF scores are typically 0.01-0.03)
        # Scale to 0-1 range for fair comparison with CF
        normalized_search = min(result.score * 20, 1.0)  # RRF * 20 ≈ 0-1
        
        # Weighted fusion
        final_score = (search_weight * normalized_search) + (cf_weight * cf_score)
        
        personalized_results.append(
            PersonalizedResult(
                id=result.id,
                title=result.title,
                text=result.text,
                url=result.url,
                meta=result.meta,
                search_score=result.score,
                cf_score=cf_score,
                final_score=final_score,
                source='personalized'
            )
        )
    
    # 6. Sort by final score and return top_k
    personalized_results.sort(key=lambda x: x.final_score, reverse=True)
    
    return personalized_results[:top_k]


def personalized_results_to_dict(results: List[PersonalizedResult]) -> List[Dict[str, Any]]:
    """Convert PersonalizedResult objects to dict format for API responses."""
    return [
        {
            'id': r.id,
            'title': r.title,
            'text': r.text,
            'url': r.url,
            'meta': r.meta,
            'search_score': r.search_score,
            'cf_score': r.cf_score,
            'final_score': r.final_score,
            'source': r.source
        }
        for r in results
    ]
