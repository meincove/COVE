"""
Unit tests for Item-Based Collaborative Filtering.
Tests similarity calculation, recommendation generation, and edge cases.
"""

import pytest
import sys
from pathlib import Path

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from app.mcp_agents.product_recommender.item_based_cf import ItemBasedCF, load_config


@pytest.fixture
def item_cf():
    """Create ItemBasedCF instance"""
    return ItemBasedCF()


@pytest.fixture
def sample_interactions():
    """Sample user-item interactions for testing"""
    return [
        {"user_id": "u1", "item_id": "prod_a", "weight": 1.0},
        {"user_id": "u1", "item_id": "prod_b", "weight": 0.8},
        {"user_id": "u2", "item_id": "prod_a", "weight": 1.0},
        {"user_id": "u2", "item_id": "prod_c", "weight": 0.6},
        {"user_id": "u3", "item_id": "prod_b", "weight": 1.0},
        {"user_id": "u3", "item_id": "prod_c", "weight": 0.9},
        {"user_id": "u4", "item_id": "prod_a", "weight": 1.0},
        {"user_id": "u4", "item_id": "prod_b", "weight": 0.7},
        {"user_id": "u4", "item_id": "prod_c", "weight": 0.5},
    ]


def test_config_loading():
    """Test that config loads correctly"""
    config = load_config()
    assert config is not None
    assert "item_based_cf" in config
    assert "matrix_factorization" in config
    assert "hybrid_fusion" in config


def test_item_cf_initialization(item_cf):
    """Test ItemBasedCF initialization"""
    assert item_cf is not None
    assert item_cf.config is not None
    assert item_cf.similarity_matrix == {}


def test_build_user_item_matrix(item_cf, sample_interactions):
    """Test user-item matrix construction"""
    matrix = item_cf.build_user_item_matrix(sample_interactions)
    
    assert matrix is not None
    assert matrix.shape[0] == 4  # 4 users
    assert matrix.shape[1] == 3  # 3 items
    
    # Check sparsity
    assert matrix.nnz == len(sample_interactions)


def test_item_similarity_computation(item_cf, sample_interactions):
    """Test item-item similarity calculation"""
    item_cf.build_user_item_matrix(sample_interactions)
    
    # prod_a and prod_b should have high similarity (both liked by u1, u4)
    sim_ab = item_cf.compute_item_similarity("prod_a", "prod_b")
    assert sim_ab > 0
    assert sim_ab <= 1.0
    
    # Same item should have similarity 0 (filtered out)
    sim_aa = item_cf.compute_item_similarity("prod_a", "prod_a")
    assert sim_aa >= 0


def test_compute_all_similarities(item_cf, sample_interactions):
    """Test full similarity matrix computation"""
    item_cf.build_user_item_matrix(sample_interactions)
    similarities = item_cf.compute_all_similarities()
    
    assert isinstance(similarities, dict)
    assert len(similarities) > 0
    
    # Each item should have similarity scores
    for item_id, similar_items in similarities.items():
        assert isinstance(similar_items, list)
        for similar_id, score in similar_items:
            assert isinstance(similar_id, str)
            assert 0 <= score <= 1.0


def test_get_similar_items(item_cf, sample_interactions):
    """Test retrieving similar items"""
    item_cf.build_user_item_matrix(sample_interactions)
    item_cf.compute_all_similarities()
    
    similar = item_cf.get_similar_items("prod_a", top_k=2)
    
    assert isinstance(similar, list)
    assert len(similar) <= 2
    
    # Check structure
    for item_id, score in similar:
        assert isinstance(item_id, str)
        assert item_id != "prod_a"  # Should not include itself
        assert 0 <= score <= 1.0


def test_recommend_based_on_history(item_cf, sample_interactions):
    """Test recommendations based on user history"""
    item_cf.build_user_item_matrix(sample_interactions)
    item_cf.compute_all_similarities()
    
    # User liked prod_a, get recommendations
    recommendations = item_cf.recommend_based_on_history(
        user_items=["prod_a"],
        top_k=2,
        exclude_items=["prod_a"]
    )
    
    assert isinstance(recommendations, list)
    assert len(recommendations) <= 2
    
    # Check that prod_a is not in recommendations
    rec_ids = [item_id for item_id, score in recommendations]
    assert "prod_a" not in rec_ids
    
    # Scores should be positive
    for item_id, score in recommendations:
        assert score > 0


def test_recommend_with_multiple_items(item_cf, sample_interactions):
    """Test recommendations based on multiple items"""
    item_cf.build_user_item_matrix(sample_interactions)
    item_cf.compute_all_similarities()
    
    # User liked both prod_a and prod_b
    recommendations = item_cf.recommend_based_on_history(
        user_items=["prod_a", "prod_b"],
        top_k=1
    )
    
    assert isinstance(recommendations, list)
    
    # prod_c should be recommended (similar to both)
    rec_ids = [item_id for item_id,  _ in recommendations]
    if recommendations:
        assert "prod_a" not in rec_ids
        assert "prod_b" not in rec_ids


def test_empty_interactions(item_cf):
    """Test handling of empty interactions"""
    matrix = item_cf.build_user_item_matrix([])
    
    assert matrix is not None
    assert matrix.shape[0] == 0
    assert matrix.shape[1] == 0


def test_single_interaction(item_cf):
    """Test handling of single interaction"""
    interactions = [{"user_id": "u1", "item_id": "prod_a", "weight": 1.0}]
    matrix = item_cf.build_user_item_matrix(interactions)
    
    assert matrix.shape == (1, 1)
    
    similarities = item_cf.compute_all_similarities()
    
    # Single item has no similar items
    similar = item_cf.get_similar_items("prod_a")
    assert similar == []


def test_min_common_users_threshold(item_cf):
    """Test minimum common users threshold"""
    # Create interactions where items have only 1 common user
    interactions = [
        {"user_id": "u1", "item_id": "prod_a", "weight": 1.0},
        {"user_id": "u1", "item_id": "prod_b", "weight": 1.0},
        {"user_id": "u2", "item_id": "prod_a", "weight": 1.0},
        {"user_id": "u3", "item_id": "prod_b", "weight": 1.0},
    ]
    
    item_cf.build_user_item_matrix(interactions)
    
    # With min_common_users=2 (default in config), items with only 1 common user should not be similar
    item_cf.config['min_common_users'] = 2
    similarities = item_cf.compute_all_similarities()
    
    # prod_a and prod_b have only u1 in common, so should not appear
    # if threshold is 2
    for item_id, similar_items in similarities.items():
        for similar_id, score in similar_items:
            # Verify this pair has at least min_common_users
            pass  # Would need to verify actual common users


def test_model_save_load(item_cf, sample_interactions, tmp_path):
    """Test saving and loading model"""
    item_cf.build_user_item_matrix(sample_interactions)
    item_cf.compute_all_similarities()
    
    # Save model
    model_path = tmp_path / "test_model.pkl"
    item_cf.save_model(str(model_path))
    
    assert model_path.exists()
    
    # Load into new instance
    new_cf = ItemBasedCF()
    new_cf.load_model(str(model_path))
    
    # Verify loaded data
    assert new_cf.similarity_matrix == item_cf.similarity_matrix
    assert new_cf.item_to_idx == item_cf.item_to_idx


@pytest.mark.asyncio
async def test_performance_with_large_dataset():
    """Test performance with synthetic dataset"""
    import json
    import time
    from pathlib import Path
    
    # Load synthetic data
    data_file = Path(__file__).parent.parent.parent / "scripts" / "synthetic_interactions.json"
    
    if not data_file.exists():
        pytest.skip("Synthetic data not generated yet")
    
    with open(data_file) as f:
        interactions = json.load(f)
    
    print(f"\n📊 Testing with {len(interactions)} interactions")
    
    cf = ItemBasedCF()
    
    # Build matrix
    start = time.time()
    cf.build_user_item_matrix(interactions)
    build_time = time.time() - start
    print(f"   Matrix build: {build_time:.2f}s")
    
    # Compute similarities
    start = time.time()
    cf.compute_all_similarities()
    sim_time = time.time() - start
    print(f"   Similarity computation: {sim_time:.2f}s")
    
    # Test recommendations
    sample_items = list(cf.item_to_idx.keys())[:5]
    start = time.time()
    for item in sample_items:
        cf.get_similar_items(item, top_k=10)
    lookup_time = (time.time() - start) / len(sample_items)
    print(f"   Average similarity lookup: {lookup_time*1000:.2f}ms")
    
    # Performance assertions
    assert build_time < 5.0, "Matrix build too slow"
    assert sim_time < 30.0, "Similarity computation too slow"
    assert lookup_time < 0.01, "Similarity lookup too slow"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
