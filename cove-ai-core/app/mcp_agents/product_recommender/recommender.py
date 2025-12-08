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

def load_cf_config() -> Dict[str, Any]:
    """Load collaborative filtering configuration"""
    cf_config_path = Path(__file__).parent.parent.parent.parent / "data" / "cf_config.json"
    with open(cf_config_path) as f:
        return json.load(f)

config = load_config()
cf_config = load_cf_config()


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
    
    def __init__(self, config_override: Optional[Dict[str, Any]] = None):
        self.config = config_override if config_override is not None else config
        self.embedding_model = self.config["model_config"]["embedding_model"]
        self.ranking_strategies = self.config.get("ranking_strategies", self.config.get("ranking", {}))
        self.filters_config = self.config["filters"]
        self.performance = self.config["performance"]
        
        # CF configuration
        self.cf_enabled = cf_config["item_based_cf"]["enabled"]
        self.hybrid_fusion = cf_config["hybrid_fusion"]
        
        # A/B testing support
        self.ab_testing_enabled = False  # Set to True to enable A/B tests
        
        log.info(f"ProductRecommender initialized with model: {self.embedding_model}")
        log.info(f"Collaborative filtering: {self.cf_enabled}")
        log.info(f"A/B testing: {self.ab_testing_enabled}")
    
    def _should_enable_cf_for_user(self, user_id: Optional[str]) -> bool:
        """Determine if CF should be enabled for this user (considering A/B tests)"""
        if not self.cf_enabled:
            return False
        
        if not self.ab_testing_enabled or not user_id:
            return self.cf_enabled
        
        # Use A/B testing to determine CF enablement
        from app.mcp_agents.product_recommender.ab_testing import get_ab_manager
        ab_manager = get_ab_manager()
        return ab_manager.should_use_cf(user_id)

    
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
        
        # Apply collaborative filtering if enabled for this user (considers A/B testing)
        cf_enabled_for_user = self._should_enable_cf_for_user(user_id)
        if cf_enabled_for_user and user_id:
            base_results = await self._apply_collaborative_filtering(
                base_results,
                user_id,
                top_k
            )
            log.info(f"Applied collaborative filtering for user {user_id}")
        
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
    
    async def _apply_collaborative_filtering(
        self,
        base_results: List[Dict[str, Any]],
        user_id: str,
        top_k: int
    ) -> List[Dict[str, Any]]:
        """
        Apply item-based collaborative filtering to enhance recommendations.
        
        Uses hybrid fusion strategy from cf_config:
        - item_cf_score: from user's interaction history
        - vector_similarity: from original hybrid search
        - personalization: from personalization engine (applied separately)
        
        Args:
            base_results: Results from hybrid search
            user_id: User identifier
            top_k: Number of results to return
            
        Returns:
            Enhanced results with CF scores
        """
        from app.mcp_agents.product_recommender.item_based_cf import get_item_cf
        
        cf = get_item_cf()
        
        # Check if CF model is trained
        if not cf.similarity_matrix:
            log.warning("CF similarity matrix not computed. Skipping CF enhancement.")
            return base_results
        
        # Get fusion weights
        weights = self.hybrid_fusion["weights"]
        cf_weight = weights["item_cf"]
        vector_weight = weights["vector_similarity"]
        
        # TODO: Get user's interaction history from database
        # For now, use empty list (cold start)
        user_items = []  # TODO: Fetch user's viewed/purchased items
        
        if not user_items:
            log.info(f"No interaction history for user {user_id}. Using vector similarity only.")
            return base_results
        
        # Get CF recommendations based on user history
        cf_recommendations = cf.recommend_based_on_history(
            user_items=user_items,
            top_k=top_k * 3,  # Get more candidates for fusion
            exclude_items=[r.get("id") for r in base_results]
        )
        
        # Convert CF recommendations to dict for lookup
        cf_scores = {item_id: score for item_id, score in cf_recommendations}
        
        # Apply hybrid fusion
        for result in base_results:
            item_id = result.get("id")
            
            # Get scores
            vector_score = result.get("rrf_score", result.get("final_score", 0.5))
            cf_score = cf_scores.get(item_id, 0.0)
            
            # Hybrid fusion
            fused_score = (
                cf_weight * cf_score +
                vector_weight * vector_score
            )
            
            result["cf_score"] = cf_score
            result["vector_score"] = vector_score
            result["fused_score"] = fused_score
            result["final_score"] = fused_score  # Update final score
        
        # Re-sort by fused score
        base_results.sort(key=lambda x: x.get("fused_score", 0), reverse=True)
        
        log.info(f"CF fusion applied. Top result score: {base_results[0].get('fused_score', 0):.4f}")
        
        return base_results


# Global instance
_recommender: Optional[ProductRecommender] = None

def get_recommender() -> ProductRecommender:
    """Get or create global recommender instance"""
    global _recommender
    if _recommender is None:
        _recommender = ProductRecommender()
    return _recommender

