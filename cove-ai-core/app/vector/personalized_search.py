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


def calculate_profile_affinity_scores(
    results: List[SearchResult],
    user_profile: Dict[str, Any]
) -> Dict[str, float]:
    """
    Calculate affinity scores based on user profile (session or permanent).
    
    Boosts items that match:
    - Affinity Price Tier (e.g. < avg_price_max)
    - Preferred Color
    - Preferred Type
    """
    if not user_profile:
        return {r.id: 0.0 for r in results}
        
    scores = {}
    
    # Extract preferences
    avg_price = user_profile.get("avg_price_max")
    pref_color = user_profile.get("preferred_color")
    
    for r in results:
        score = 0.0
        meta = r.meta
        
        # 1. Price Affinity Boost (Soft boost for items within budget)
        if avg_price and meta.get("price"):
            price = float(meta["price"])
            if price <= avg_price:
                score += 0.3  # Within budget +30%
            elif price <= avg_price * 1.2:
                score += 0.1  # Slightly over +10%
                
        # 2. Color Affinity
        if pref_color and meta.get("color"):
            # Simple substring match for now
            if pref_color.lower() in str(meta["color"]).lower():
                score += 0.2
                
        scores[r.id] = min(score, 1.0) # Cap at 1.0
        
    return scores


def calculate_session_affinity_scores(
    results: List[SearchResult],
    recently_viewed_slugs: List[str],
    embedding_map: Optional[Dict[str, List[float]]] = None
) -> Dict[str, float]:
    """
    Calculate session affinity scores based on recently viewed products.
    
    Boosts products that are similar (by vector) to what the user has viewed
    during this session. More recent views count more.
    
    Args:
        results: Search results to score
        recently_viewed_slugs: Slugs of recently viewed products (most recent first)
        embedding_map: Optional preloaded embeddings {slug: vector}
        
    Returns:
        Dict mapping result IDs to session affinity scores (0.0 to 1.0)
    """
    import numpy as np
    
    if not recently_viewed_slugs:
        return {r.id: 0.0 for r in results}
    
    # If no embedding map provided, we can't calculate vector similarity
    # Fall back to simple slug matching
    if not embedding_map:
        scores = {}
        viewed_set = set(recently_viewed_slugs)
        for r in results:
            slug = r.meta.get("slug", "")
            # Simple boost if exact match
            if slug in viewed_set:
                scores[r.id] = 0.8  # Strong boost for exact match
            else:
                scores[r.id] = 0.0
        return scores
    
    # Calculate vector similarity to recently viewed items
    scores = {}
    
    for r in results:
        slug = r.meta.get("slug", "")
        result_vec = embedding_map.get(slug)
        
        if result_vec is None:
            scores[r.id] = 0.0
            continue
        
        result_vec = np.array(result_vec)
        norm_result = np.linalg.norm(result_vec)
        if norm_result == 0:
            scores[r.id] = 0.0
            continue
        
        # Weighted average similarity to recently viewed items
        # More recent items have higher weight
        total_sim = 0.0
        total_weight = 0.0
        
        for idx, viewed_slug in enumerate(recently_viewed_slugs):
            viewed_vec = embedding_map.get(viewed_slug)
            if viewed_vec is None:
                continue
                
            viewed_vec = np.array(viewed_vec)
            norm_viewed = np.linalg.norm(viewed_vec)
            if norm_viewed == 0:
                continue
            
            # Cosine similarity
            sim = np.dot(result_vec, viewed_vec) / (norm_result * norm_viewed)
            
            # Recency weight: 1.0 for most recent, decaying by 0.1 per position
            recency_weight = max(0.1, 1.0 - (idx * 0.1))
            
            total_sim += sim * recency_weight
            total_weight += recency_weight
        
        if total_weight > 0:
            avg_sim = total_sim / total_weight
            # Convert similarity (-1 to 1) to score (0 to 1)
            scores[r.id] = max(0.0, min(1.0, (avg_sim + 1) / 2))
        else:
            scores[r.id] = 0.0
    
    return scores

def personalized_search(
    conn: psycopg.Connection,
    query: str,
    query_embedding: List[float],
    user_id: Optional[str] = None,
    kind: str = "product",
    top_k: int = 6,
    cf_model: Optional[Any] = None,
    search_weight: float = 0.5,
    cf_weight: float = 0.2,
    visual_vibe: Optional[str] = None,
    user_profile: Optional[Dict[str, Any]] = None,
    sku_boost: bool = False,
    recently_viewed_slugs: Optional[List[str]] = None,
    embedding_map: Optional[Dict[str, List[float]]] = None,
    filters: Optional[Dict[str, Any]] = None
) -> List[PersonalizedResult]:
    """
    Personalized search with CF, Profile, and Session-based reranking.
    
    Pipeline:
    1. Hybrid search (BM25 + Vector + RRF) → relevance scores
    2. CF scoring → history-based personalization  
    3. Profile scoring → intent-based personalization
    4. Session scoring → real-time behavior personalization
    5. Weighted fusion → final ranking
    
    Args:
        visual_vibe: Optional visual style description for vector boosting
        user_profile: Optional user preferences (price, color, etc.)
        sku_boost: Boolean to boost BM25 for exact/SKU queries
        recently_viewed_slugs: Slugs of recently viewed products for session affinity
        embedding_map: Preloaded embeddings for session affinity calculation
        filters: Optional dict of metadata filters (type, price, gender, etc.)
    """
    # 1. Get hybrid search results (larger pool for reranking)
    search_results = search_hybrid_rrf(
        conn=conn,
        query=query,
        query_embedding=query_embedding,
        kind=kind,
        top_k=top_k * 3,  # Get 3x results for reranking
        bm25_k=30,
        vector_k=30,
        rrf_constant=60,
        visual_vibe=visual_vibe,
        sku_boost=sku_boost,
        filters=filters
    )
    
    # 2. Calculate scores
    # A. Search Score (already in results)
    
    # B. CF Score (Purchase History)
    user_items = get_user_purchase_history(user_id) if user_id else []
    cf_scores = calculate_cf_scores_for_results(search_results, user_items, cf_model)
    
    # C. Profile Score (Session Intent)
    profile_scores = calculate_profile_affinity_scores(search_results, user_profile or {})
    
    # D. Session Affinity Score (Real-time behavior)
    session_scores = calculate_session_affinity_scores(
        search_results, 
        recently_viewed_slugs or [], 
        embedding_map
    )
    
    # 3. Fuse Scores
    # Updated weights: Search (50%) + CF (20%) + Profile (15%) + Session (15%)
    # If signals are missing, redistribute weights
    
    personalized_results = []
    for result in search_results:
        cf_score = cf_scores.get(result.id, 0.0)
        profile_score = profile_scores.get(result.id, 0.0)
        session_score = session_scores.get(result.id, 0.0)
        
        # Normalize search score (RRF scores are typically 0.01-0.03)
        normalized_search = min(result.score * 20, 1.0) 
        
        # Dynamic Weighting depending on available signals
        w_search = search_weight
        w_cf = cf_weight if user_items else 0
        w_profile = 0.15 if user_profile else 0
        w_session = 0.15 if recently_viewed_slugs else 0
        
        # Fallback to pure search if no personalization signals
        if w_cf == 0 and w_profile == 0 and w_session == 0:
             final_score = normalized_search
        else:
             # Normalize weights to sum to 1.0
             total_w = w_search + w_cf + w_profile + w_session
             final_score = (
                 (w_search * normalized_search) + 
                 (w_cf * cf_score) + 
                 (w_profile * profile_score) +
                 (w_session * session_score)
             ) / total_w
        
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
    
    # 4. Sort by final score and return top_k
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
