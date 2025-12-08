"""
Product Recommender - Core recommendation engine.
Config-driven, vector-based product recommendations with personalization.
"""

import json
import logging
from pathlib import Path
from typing import List, Dict, Any, Optional
from dataclasses import dataclass

log = logging.getLogger("cove.recommender")

# Load config
CONFIG_PATH = Path(__file__).parent.parent.parent.parent / "data" / "recommender_config.json"

def load_config() -> Dict[str, Any]:
    """Load recommender configuration"""
    with open(CONFIG_PATH) as f:
        return json.load(f)

CONFIG = load_config()


@dataclass
class Product:
    """Product data class"""
    id: str
    title: str
    type: str
    tier: str
    price: float
    slug: str
    score: float = 0.0
    reason: str = ""
    

class ProductRecommender:
    """
    Intelligent product recommender using:
    - Vector similarity search
    - Personalization based on user history
    - Multi-factor ranking (similarity + popularity + personalization)
    """
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        self.config = config or CONFIG
        self.embedding_model = self.config["model_config"]["embedding_model"]
        self.ranking_strategies = self.config["ranking_strategies"]
        self.filters_config = self.config["filters"]
        self.performance = self.config["performance"]
        
        log.info(f"ProductRecommender initialized with model: {self.embedding_model}")
    
    async def recommend(
        self,
        query: str,
        filters: Optional[Dict[str, Any]] = None,
        top_k: int = 10,
        user_id: Optional[str] = None
    ) -> List[Product]:
        """
        Get personalized product recommendations.
        
        Args:
            query: Search query
            filters: Optional filters (price, type, tier, etc)
            top_k: Number of results to return
            user_id: Optional user ID for personalization
            
        Returns:
            List of recommended products
        """
        log.info(f"Recommend: query='{query}', filters={filters}, top_k={top_k}, user_id={user_id}")
        
        # Parse and validate filters
        parsed_filters = self._parse_filters(filters or {})
        
        # Get base results from hybrid search
        from app.mcp_agents.product_recommender.hybrid_search import get_hybrid_search
        hybrid = get_hybrid_search()
        
        base_results = await hybrid.search(query, parsed_filters, limit=top_k * 2)
        
        # Apply personalization if user_id provided
        if user_id:
            from app.mcp_agents.product_recommender.personalization import get_personalization_engine
            personalization = get_personalization_engine()
            
            # Get user profile (in production, this would query a database)
            # For now, we'll use None which triggers cold start handling
            user_profile = None  # TODO: Fetch from database
            
            base_results = personalization.personalize_results(base_results, user_profile)
            log.info(f"Applied personalization for user {user_id}")
        
        # Rank products using config weights
        ranked = self._rank_products(base_results)
        
        # Apply final filters
        filtered = self._apply_filters(ranked, parsed_filters)
        
        # Convert to Product dataclass
        products = [
            Product(
                id=r.get('id', r.get('product_id', 'unknown')),
                title=r.get('title', 'Unknown'),
                price=r.get('price', 0.0),
                type=r.get('type'),
                tier=r.get('tier'),
                slug=r.get('slug', ''),
                score=r.get('final_score', r.get('rrf_score', 0.0))
            )
            for r in filtered[:top_k]
        ]
        
        log.info(f"Returning {len(products)} personalized recommendations")
        return products
    
    def _parse_filters(self, filters: Dict[str, Any]) -> Dict[str, Any]:
        """Parse and validate filters"""
        parsed = {}
        
        # Price filter
        if "price_min" in filters or "price_max" in filters:
            parsed["price"] = {
                "min": filters.get("price_min"),
                "max": filters.get("price_max")
            }
        
        # Type filter (hoodie, tee, etc.)
        if "type" in filters:
            valid_types = self.filters_config["type"]["values"]
            if filters["type"] in valid_types:
                parsed["type"] = filters["type"]
        
        # Tier filter (originals, limited, designer)
        if "tier" in filters:
            valid_tiers = self.filters_config["tier"]["values"]
            if filters["tier"] in valid_tiers:
                parsed["tier"] = filters["tier"]
        
        # Color filter
        if "color" in filters:
            parsed["color"] = filters["color"]
        
        # Availability
        if self.filters_config["availability"]["in_stock_only"]:
            parsed["in_stock"] = True
        
        return parsed
    
    async def _vector_search(
        self,
        query: str,
        filters: Dict[str, Any],
        top_k: int
    ) -> List[Dict[str, Any]]:
        """
        Perform hybrid search (vector + keyword) using RRF fusion.
        Replaces mock implementation with production-ready hybrid search.
        """
        from app.mcp_agents.product_recommender.hybrid_search import get_hybrid_search
        
        hybrid = get_hybrid_search()
        results = await hybrid.search(query, filters, top_k)
        
        # Convert to expected format
        candidates = []
        for result in results:
            candidates.append({
                "id": result["id"],
                "title": result["title"],
                "type": result["type"],
                "tier": result["tier"],
                "price": result["price"],
                "slug": result.get("slug", ""),
                "similarity_score": result.get("rrf_score", 0.5)
            })
        
        return candidates
    
    def _rank_products(
        self,
        results: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Apply multi-factor ranking (already done by hybrid search + personalization).
        Just pass through since ranking is handled upstream.
        """
        # Results already ranked by hybrid search RRF + personalization
        # Just ensure they have scores
        for result in results:
            if 'final_score' not in result and 'rrf_score' not in result:
                result['final_score'] = 0.5
        
        return results
    
    def _apply_filters(
        self,
        results: List[Dict[str, Any]],
        filters: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Apply final filtering to results"""
        filtered = results
        
        # Price filter
        if "price" in filters:
            price_filter = filters["price"]
            if price_filter["min"] is not None:
                filtered = [r for r in filtered if r.get("price", 0) >= price_filter["min"]]
            if price_filter["max"] is not None:
                filtered = [r for r in filtered if r.get("price", 0) <= price_filter["max"]]
        
        # Type filter
        if "type" in filters:
            filtered = [r for r in filtered if r.get("type") == filters["type"]]
        
        # Tier filter
        if "tier" in filters:
            filtered = [r for r in filtered if r.get("tier") == filters["tier"]]
        
        return filtered


# Global instance
_recommender: Optional[ProductRecommender] = None

def get_recommender() -> ProductRecommender:
    """Get or create global recommender instance"""
    global _recommender
    if _recommender is None:
        _recommender = ProductRecommender()
    return _recommender
