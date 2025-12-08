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
        user_context: Optional[Dict[str, Any]] = None,
        limit: int = 10
    ) -> List[Product]:
        """
        Get product recommendations based on query and context.
        
        Args:
            query: Search query (e.g., "show me hoodies")
            filters: Price, type, tier constraints
            user_context: User ID, history, preferences
            limit: Maximum results to return
            
        Returns:
            List of Product objects ranked by relevance
        """
        log.info(f"Recommend query='{query}' filters={filters} limit={limit}")
        
        # Step 1: Parse filters
        parsed_filters = self._parse_filters(filters or {})
        
        # Step 2: Vector similarity search
        candidates = await self._vector_search(query, parsed_filters, limit * 3)
        
        # Step 3: Apply ranking strategies
        ranked = await self._rank_products(candidates, query, user_context or {})
        
        # Step 4: Apply final filters and limit
        results = self._apply_filters(ranked, parsed_filters)[:limit]
        
        log.info(f"Returning {len(results)} recommendations")
        return results
    
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
        Perform vector similarity search.
        
        TODO: Integrate with actual vector store (Qdrant/Pinecone/pgvector)
        For now, returns mock data
        """
        # This will be replaced with actual vector search
        # from app.vector.store import search_hybrid
        # results = await search_hybrid(query, kind="product", top_k=top_k)
        
        # Mock implementation
        mock_products = [
            {
                "id": "prod_001",
                "title": "Cove Designer Hoodie",
                "type": "hoodie",
                "tier": "designer",
                "price": 59.99,
                "slug": "hoodie-designer-fleece-59.99",
                "similarity_score": 0.85
            },
            {
                "id": "prod_002",
                "title": "Cove Designer Tee",
                "type": "tee",
                "tier": "designer",
                "price": 34.99,
                "slug": "tee-designer-structured-34.99",
                "similarity_score": 0.72
            }
        ]
        
        return mock_products
    
    async def _rank_products(
        self,
        candidates: List[Dict[str, Any]],
        query: str,
        user_context: Dict[str, Any]
    ) -> List[Product]:
        """
        Apply multi-factor ranking using configured strategies.
        """
        ranked = []
        
        for candidate in candidates:
            # Base similarity score
            similarity = candidate.get("similarity_score", 0.5)
            
            # Popularity score (mock for now)
            popularity = 0.7  # TODO: Get from analytics
            
            # Personalization score (mock for now)
            personalization = 0.6  # TODO: Based on user history
            
            # Weighted combination
            weights = self.ranking_strategies
            final_score = (
                similarity * weights["similarity"]["weight"] +
                popularity * weights["popularity"]["weight"] +
                personalization * weights["personalization"]["weight"]
            )
            
            product = Product(
                id=candidate["id"],
                title=candidate["title"],
                type=candidate["type"],
                tier=candidate["tier"],
                price=candidate["price"],
                slug=candidate["slug"],
                score=final_score,
                reason="Matches your query"
            )
            
            ranked.append(product)
        
        # Sort by score descending
        ranked.sort(key=lambda p: p.score, reverse=True)
        
        return ranked
    
    def _apply_filters(
        self,
        products: List[Product],
        filters: Dict[str, Any]
    ) -> List[Product]:
        """Apply final filtering"""
        filtered = products
        
        # Price filter
        if "price" in filters:
            price_filter = filters["price"]
            if price_filter["min"] is not None:
                filtered = [p for p in filtered if p.price >= price_filter["min"]]
            if price_filter["max"] is not None:
                filtered = [p for p in filtered if p.price <= price_filter["max"]]
        
        # Type filter
        if "type" in filters:
            filtered = [p for p in filtered if p.type == filters["type"]]
        
        # Tier filter
        if "tier" in filters:
            filtered = [p for p in filtered if p.tier == filters["tier"]]
        
        return filtered


# Global instance
_recommender: Optional[ProductRecommender] = None

def get_recommender() -> ProductRecommender:
    """Get or create global recommender instance"""
    global _recommender
    if _recommender is None:
        _recommender = ProductRecommender()
    return _recommender
