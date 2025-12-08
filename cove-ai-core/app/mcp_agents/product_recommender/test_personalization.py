"""
Unit tests for Personalization Engine.
Tests user profiles, temporal decay, diversity constraints, and cold start handling.
"""

import pytest
from datetime import datetime, timedelta

from app.mcp_agents.product_recommender.personalization import (
    PersonalizationEngine,
    UserProfile,
    UserInteraction,
    load_config
)


@pytest.fixture
def config():
    """Load personalization config"""
    return load_config()


@pytest.fixture
def personalization_engine(config):
    """Create personalization engine"""
    return PersonalizationEngine(config)


@pytest.fixture
def sample_interactions():
    """Create sample user interactions"""
    now = datetime.now()
    return [
        UserInteraction(
            product_id="prod_001",
            interaction_type="view",
            timestamp=now - timedelta(days=1),
            metadata={"type": "hoodie", "tier": "designer"}
        ),
        UserInteraction(
            product_id="prod_002",
            interaction_type="purchase",
            timestamp=now - timedelta(days= 2),
            metadata={"type": "hoodie", "tier": "designer"}
        ),
        UserInteraction(
            product_id="prod_003",
            interaction_type="cart_add",
            timestamp=now - timedelta(days=7),
            metadata={"type": "tee", "tier": "originals"}
        ),
        UserInteraction(
            product_id="prod_004",
            interaction_type="view",
            timestamp=now - timedelta(days=30),
            metadata={"type": "bomber", "tier": "limited"}
        )
    ]


def test_config_loading(config):
    """Test that config loads correctly"""
    assert config is not None
    assert "version" in config
    assert "signals" in config
    assert "temporal_decay" in config


def test_personalization_engine_init(personalization_engine):
    """Test engine initialization"""
    assert personalization_engine is not None
    assert personalization_engine.config is not None


def test_temporal_decay(personalization_engine, sample_interactions):
    """Test temporal decay weighting"""
    decayed = personalization_engine._apply_temporal_decay(sample_interactions.copy())
    
    # Recent interactions should have higher weight
    assert decayed[0].weight > decayed[3].weight  # 1 day ago vs 30 days ago
    
    # All weights should be positive
    for interaction in decayed:
        assert interaction.weight > 0


def test_signal_weights(personalization_engine, sample_interactions):
    """Test signal-specific weighting"""
    weighted = personalization_engine._apply_signal_weights(sample_interactions.copy())
    
    # Find purchase and view
    purchase = next(i for i in weighted if i.interaction_type == "purchase")
    view = next(i for i in weighted if i.interaction_type == "view")
    
    # Purchase should have higher weight than view
    # From config: purchase=0.4, browse=0.3
    assert purchase.weight > view.weight


def test_build_user_profile(personalization_engine, sample_interactions):
    """Test user profile building"""
    profile = personalization_engine.build_user_profile("user123", sample_interactions)
    
    assert profile.user_id == "user123"
    assert len(profile.interactions) == len(sample_interactions)
    assert len(profile.preferred_types) > 0
    assert len(profile.preferred_tiers) > 0


def test_extract_preferred_types(personalization_engine, sample_interactions):
    """Test type preference extraction"""
    # Add temporal decay and signal weights
    interactions = personalization_engine._apply_temporal_decay(sample_interactions.copy())
    interactions = personalization_engine._apply_signal_weights(interactions)
    
    types = personalization_engine._extract_preferred_types(interactions)
    
    # "hoodie" should be top (2 interactions, one is purchase)
    assert "hoodie" in types
    assert types[0] == "hoodie"  # Most preferred


def test_cold_start_detection(config):
    """Test cold start user detection"""
    # New user (created yesterday)
    new_profile = UserProfile(
        user_id="new_user",
        created_at=datetime.now() - timedelta(days=1)
    )
    
    assert new_profile.is_cold_start(config)
    
    # Old user (created 30 days ago)
    old_profile = UserProfile(
        user_id="old_user",
        created_at=datetime.now() - timedelta(days=30)
    )
    
    assert not old_profile.is_cold_start(config)


def test_personalize_results_cold_start(personalization_engine):
    """Test personalization with cold start user"""
    base_results = [
        {"id": "prod_001", "title": "Hoodie", "type": "hoodie", "rrf_score": 0.8},
        {"id": "prod_002", "title": "Tee", "type": "tee", "rrf_score": 0.6}
    ]
    
    # Cold start user
    new_profile = UserProfile(
        user_id="new_user",
        created_at=datetime.now() - timedelta(days=1)
    )
    
    results = personalization_engine.personalize_results(base_results, new_profile)
    
    # Results should still be returned
    assert len(results) == 2
    # Order might change due to diversity, but all results present
    assert all(r['id'] in ['prod_001', 'prod_002'] for r in results)


def test_personalize_results_with_profile(personalization_engine, sample_interactions):
    """Test personalization with established user profile"""
    profile = personalization_engine.build_user_profile("user123", sample_interactions)
    profile.created_at = datetime.now() - timedelta(days=30)  # Not cold start
    
    base_results = [
        {
            "id": "prod_001",
            "title": "Designer Hoodie",
            "type": "hoodie",
            "tier": "designer",
            "rrf_score": 0.6
        },
        {
            "id": "prod_002",
            "title": "Originals Tee",
            "type": "tee",
            "tier": "originals",
            "rrf_score": 0.7
        }
    ]
    
    results = personalization_engine.personalize_results(base_results, profile)
    
    # All results should have personalization_score and final_score
    for result in results:
        assert 'personalization_score' in result
        assert 'final_score' in result
    
    # Hoodie should get boost (user likes hoodies)
    hoodie_result = next(r for r in results if r['type'] == 'hoodie')
    assert hoodie_result['personalization_score'] > 0


def test_calculate_personalization_score(personalization_engine, sample_interactions):
    """Test personalization score calculation"""
    profile = personalization_engine.build_user_profile("user123", sample_interactions)
    
    # Product matching user's preference
    matching_product = {
        "type": "hoodie",  # User's top preference
        "tier": "designer"  # User's preferred tier
    }
    
    # Product not matching preference
    other_product = {
        "type": "accessories",
        "tier": "limited"
    }
    
    matching_score = personalization_engine._calculate_personalization_score(
        matching_product,
        profile
    )
    
    other_score = personalization_engine._calculate_personalization_score(
        other_product,
        profile
    )
    
    # Matching product should have higher score
    assert matching_score > other_score


def test_diversity_constraint(personalization_engine):
    """Test diversity constraint application"""
    # All same type
    homogeneous_results = [
        {"id": f"prod_{i}", "type": "hoodie", "tier": "designer"} 
        for i in range(10)
    ]
    
    diversified = personalization_engine._apply_diversity(homogeneous_results)
    
    # Results should still be present
    assert len(diversified) == 10
    # Top result should be preserved
    assert diversified[0]['id'] == 'prod_0'


def test_no_interactions_profile(personalization_engine):
    """Test profile building with no interactions"""
    profile = personalization_engine.build_user_profile("user_empty", [])
    
    assert profile.user_id == "user_empty"
    assert len(profile.interactions) == 0
    assert len(profile.preferred_types) == 0


@pytest.mark.asyncio
async def test_personalization_performance():
    """Test that personalization meets latency targets"""
    import time
    
    engine = PersonalizationEngine()
    
    # Create sample data
    interactions = [
        UserInteraction(
            product_id=f"prod_{i}",
            interaction_type="view",
            timestamp=datetime.now() - timedelta(days=i),
            metadata={"type": "hoodie", "tier": "designer"}
        )
        for i in range(20)
    ]
    
    results = [
        {"id": f"prod_{i}", "type": "hoodie", "tier": "designer", "rrf_score": 0.5}
        for i in range(10)
    ]
    
    # Build profile
    start = time.time()
    profile = engine.build_user_profile("perf_test", interactions)
    profile.created_at = datetime.now() - timedelta(days=30)
    build_time = (time.time() - start) * 1000
    
    # Personalize
    start = time.time()
    personalized = engine.personalize_results(results, profile)
    personalize_time = (time.time() - start) * 1000
    
    # Target: <30ms total
    total_time = build_time + personalize_time
    
    print(f"\nPerformance: build={build_time:.2f}ms, personalize={personalize_time:.2f}ms, total={total_time:.2f}ms")
    
    # Should be well under target
    assert total_time < 30, f"Personalization too slow: {total_time}ms"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
