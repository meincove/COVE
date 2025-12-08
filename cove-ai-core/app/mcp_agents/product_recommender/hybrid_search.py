"""
Hybrid Search Implementation - Vector + Keyword Search with RRF Fusion.
Research-backed approach using pgvector for optimal performance.
"""

import asyncio
import hashlib
from typing import List, Dict, Any, Optional, Tuple
from functools import lru_cache
import logging

from litellm import embedding, aembedding

log = logging.getLogger("cove.hybrid_search")


class HybridSearch:
    """
    Combines vector (semantic) and keyword (lexical) search using RRF fusion.
    
    Performance targets:
    - p95 latency: <50ms
    - Accuracy: >90%
    - Throughput: >100 QPS
    """
    
    def __init__(self, embedding_model: str = "openrouter:openai/text-embedding-3-small"):
        self.embedding_model = embedding_model
        self.embedding_cache = {}
        
    async def search(
        self,
        query: str,
        filters: Optional[Dict[str, Any]] = None,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Hybrid search combining vector and keyword approaches.
        
        Args:
            query: Search query
            filters: Optional filters (type, tier, price range)
            limit: Maximum results
            
        Returns:
            Ranked list of products
        """
        # Generate query embedding
        query_embedding = await self._get_embedding(query)
        
        # Run both searches in parallel
        vector_results, keyword_results = await asyncio.gather(
            self._vector_search(query_embedding, filters, limit * 3),
            self._keyword_search(query, filters, limit * 3)
        )
        
        # Fuse results using Reciprocal Rank Fusion
        fused_results = self._reciprocal_rank_fusion(
            vector_results,
            keyword_results
        )
        
        return fused_results[:limit]
    
    async def _get_embedding(self, text: str) -> List[float]:
        """Generate or retrieve cached embedding"""
        # Cache key
        cache_key = hashlib.md5(text.encode()).hexdigest()
        
        if cache_key in self.embedding_cache:
            return self.embedding_cache[cache_key]
        
        # Generate embedding
        response = await aembedding(
            model=self.embedding_model,
            input=[text]
        )
        
        emb = response.data[0]["embedding"]
        
        # Cache it (LRU with max 1000 entries)
        if len(self.embedding_cache) > 1000:
            # Remove oldest
            self.embedding_cache.pop(next(iter(self.embedding_cache)))
        
        self.embedding_cache[cache_key] = emb
        return emb
    
    async def _vector_search(
        self,
        query_embedding: List[float],
        filters: Optional[Dict[str, Any]],
        limit: int
    ) -> List[Dict[str, Any]]:
        """
        Vector similarity search using pgvector on Neon.
        """
        from app.mcp_agents.product_recommender.vector_db import get_vector_db
        
        try:
            vector_db = await get_vector_db()
            results = await vector_db.vector_search(query_embedding, filters, limit)
            return results
        except Exception as e:
            log.warning(f"Vector search failed, using fallback: {e}")
            return self._mock_vector_results()
    
    async def _keyword_search(
        self,
        query: str,
        filters: Optional[Dict[str, Any]],
        limit: int
    ) -> List[Dict[str, Any]]:
        """
        Keyword search using PostgreSQL full-text search on Neon.
        """
        from app.mcp_agents.product_recommender.vector_db import get_vector_db
        
        try:
            vector_db = await get_vector_db()
            results = await vector_db.keyword_search(query, filters, limit)
            return results
        except Exception as e:
            log.warning(f"Keyword search failed, using fallback: {e}")
            return self._mock_keyword_results()
    
    def _mock_vector_results(self) -> List[Dict[str, Any]]:
        """Fallback mock results if database unavailable"""
        log.debug("Using mock vector results (fallback)")
        return [
            {
                "id": "prod_001",
                "slug": "hoodie-designer-fleece-59.99",
                "title": "Cove Designer Hoodie - MOCK",
                "type": "hoodie",
                "tier": "designer",
                "price": 59.99,
                "metadata": {},
                "similarity_score": 0.87
            }
        ]
    
    def _mock_keyword_results(self) -> List[Dict[str, Any]]:
        """Fallback mock results if database unavailable"""
        log.debug("Using mock keyword results (fallback)")
        return [
            {
                "id": "prod_001",
                "slug": "hoodie-designer-fleece-59.99",
                "title": "Cove Designer Hoodie - MOCK",
                "type": "hoodie",
                "tier": "designer",
                "price": 59.99,
                "metadata": {},
                "keyword_score": 0.92
            }
        ]
    
    def _reciprocal_rank_fusion(
        self,
        vector_results: List[Dict[str, Any]],
        keyword_results: List[Dict[str, Any]],
        k: int = 60
    ) -> List[Dict[str, Any]]:
        """
        Reciprocal Rank Fusion (RRF) - research-backed fusion algorithm.
        
        RRF score = sum(1 / (k + rank)) across all result sets
        
        Args:
            vector_results: Results from vector search
            keyword_results: Results from keyword search
            k: RRF constant (typically 60)
            
        Returns:
            Fused and ranked results
        """
        scores = {}
        all_products = {}
        
        # Score vector results
        for rank, result in enumerate(vector_results, 1):
            product_id = result["id"]
            scores[product_id] = scores.get(product_id, 0) + (1 / (k + rank))
            all_products[product_id] = result
        
        # Score keyword results
        for rank, result in enumerate(keyword_results, 1):
            product_id = result["id"]
            scores[product_id] = scores.get(product_id, 0) + (1 / (k + rank))
            if product_id not in all_products:
                all_products[product_id] = result
        
        # Combine and sort by RRF score
        ranked = sorted(
            [
                {**all_products[pid], "rrf_score": score}
                for pid, score in scores.items()
            ],
            key=lambda x: x["rrf_score"],
            reverse=True
        )
        
        log.info(f"RRF fusion: {len(vector_results)} vector + {len(keyword_results)} keyword → {len(ranked)} fused")
        
        return ranked


# Global instance
_hybrid_search: Optional[HybridSearch] = None

def get_hybrid_search() -> HybridSearch:
    """Get or create global hybrid search instance"""
    global _hybrid_search
    if _hybrid_search is None:
        _hybrid_search = HybridSearch()
    return _hybrid_search
