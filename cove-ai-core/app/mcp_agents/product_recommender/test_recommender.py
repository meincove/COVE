"""
Tests for Product Recommender.
Tests config loading, filtering, ranking, and recommendation logic.
"""

import pytest
import asyncio
from pathlib import Path
from app.mcp_agents.product_recommender.recommender import (
    ProductRecommender,
    Product,
    load_config,
    get_recommender
)


class TestConfig:
    """Test configuration loading"""
    
    def test_load_config(self):
        """Config loads successfully"""
        config = load_config()
        
        assert "model_config" in config
        assert "ranking_strategies" in config
        assert "filters" in config
        assert config["model_config"]["embedding_model"] == "text-embedding-3-small"
    
    def test_ranking_strategies(self):
        """Ranking strategies are properly configured"""
        config = load_config()
        strategies = config["ranking_strategies"]
        
        assert "similarity" in strategies
        assert "popularity" in strategies
        assert "personalization" in strategies
        
        # Weights should sum to 1.0
        total_weight = sum(s["weight"] for s in strategies.values())
        assert abs(total_weight - 1.0) < 0.01  # Allow small floating point error


class TestProductRecommender:
    """Test core recommender functionality"""
    
    @pytest.fixture
    def recommender(self):
        """Create recommender instance"""
        return ProductRecommender()
    
    def test_instance_creation(self, recommender):
        """Recommender creates successfully"""
        assert recommender is not None
        assert recommender.embedding_model == "text-embedding-3-small"
    
    def test_parse_filters_price(self, recommender):
        """Price filters parsed correctly"""
        filters = {
            "price_min": 20.0,
            "price_max": 50.0
        }
        
        parsed = recommender._parse_filters(filters)
        
        assert "price" in parsed
        assert parsed["price"]["min"] == 20.0
        assert parsed["price"]["max"] == 50.0
    
    def test_parse_filters_type(self, recommender):
        """Type filters parsed correctly"""
        filters = {"type": "hoodie"}
        parsed = recommender._parse_filters(filters)
        
        assert parsed["type"] == "hoodie"
    
    def test_parse_filters_invalid_type(self, recommender):
        """Invalid type filter ignored"""
        filters = {"type": "invalid_type"}
        parsed = recommender._parse_filters(filters)
        
        assert "type" not in parsed
    
    def test_apply_price_filter(self, recommender):
        """Price filtering works"""
        products = [
            Product(id="1", title="Cheap Tee", type="tee", tier="originals", price=20.0, slug="tee-1", score=0.9),
            Product(id="2", title="Mid Hoodie", type="hoodie", tier="limited", price=50.0, slug="hoodie-1", score=0.8),
            Product(id="3", title="Premium Bomber", type="bomber", tier="designer", price=150.0, slug="bomber-1", score=0.7),
        ]
        
        filters = {"price": {"min": 30.0, "max": 100.0}}
        filtered = recommender._apply_filters(products, filters)
        
        assert len(filtered) == 1
        assert filtered[0].title == "Mid Hoodie"
    
    def test_apply_type_filter(self, recommender):
        """Type filtering works"""
        products = [
            Product(id="1", title="Tee 1", type="tee", tier="originals", price=20.0, slug="tee-1", score=0.9),
            Product(id="2", title="Hoodie 1", type="hoodie", tier="limited", price=50.0, slug="hoodie-1", score=0.8),
            Product(id="3", title="Tee 2", type="tee", tier="designer", price=40.0, slug="tee-2", score=0.7),
        ]
        
        filters = {"type": "tee"}
        filtered = recommender._apply_filters(products, filters)
        
        assert len(filtered) == 2
        assert all(p.type == "tee" for p in filtered)
    
    @pytest.mark.asyncio
    async def test_recommend_basic(self, recommender):
        """Basic recommendation works"""
        results = await recommender.recommend(
            query="show me hoodies",
            limit=5
        )
        
        assert results is not None
        assert len(results) <= 5
        assert all(isinstance(p, Product) for p in results)
    
    @pytest.mark.asyncio
    async def test_recommend_with_filters(self, recommender):
        """Recommendations respect filters"""
        results = await recommender.recommend(
            query="show me tees",
            filters={"type": "tee", "price_max": 50.0},
            limit=10
        )
        
        assert all(p.type == "tee" for p in results)
        assert all(p.price <= 50.0 for p in results)
    
    @pytest.mark.asyncio
    async def test_recommend_sorted_by_score(self, recommender):
        """Results sorted by relevance score"""
        results = await recommender.recommend(
            query="designer hoodies",
            limit=10
        )
        
        # Check scores are descending
        scores = [p.score for p in results]
        assert scores == sorted(scores, reverse=True)


class TestGlobalInstance:
    """Test global recommender instance"""
    
    def test_get_recommender(self):
        """Global instance works"""
        r1 = get_recommender()
        r2 = get_recommender()
        
        assert r1 is r2  # Same instance
        assert isinstance(r1, ProductRecommender)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
