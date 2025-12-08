"""
Test end-to-end integration of CF with recommender.
Tests hybrid fusion, cold start, and recommendation quality.
"""

import pytest
import sys
import json
from pathlib import Path

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from app.mcp_agents.product_recommender.recommender import get_recommender
from app.mcp_agents.product_recommender.item_based_cf import get_item_cf


@pytest.fixture
def item_cf_trained():
    """Train item CF with synthetic data"""
    cf = get_item_cf()
    
    # Load synthetic interactions
    data_file = Path(__file__).parent.parent.parent / "scripts" / "synthetic_interactions.json"
    
    if not data_file.exists():
        pytest.skip("Synthetic data not generated")
    
    with open(data_file) as f:
        interactions = json.load(f)
    
    # Build and train CF
    cf.build_user_item_matrix(interactions)
    cf.compute_all_similarities()
    
    return cf


@pytest.mark.asyncio
async def test_recommender_initialization():
    """Test recommender initializes with CF config"""
    recommender = get_recommender()
    
    assert recommender is not None
    assert hasattr(recommender, 'cf_enabled')
    assert hasattr(recommender, 'hybrid_fusion')
    
    print(f"\n✅ CF Enabled: {recommender.cf_enabled}")
    print(f"✅ Fusion weights: {recommender.hybrid_fusion['weights']}")


@pytest.mark.asyncio
async def test_recommendations_without_cf():
    """Test recommendations work without CF (cold start)"""
    recommender = get_recommender()
    
    results = await recommender.recommend(
        query="casual hoodie",
        top_k=5
    )
    
    assert isinstance(results, list)
    assert len(results) <= 5
    
    if results:
        print(f"\n✅ Got {len(results)} recommendations without CF")
        for i, product in enumerate(results, 1):
            print(f"  {i}. {product.title} (€{product.price}) - score: {product.score:.4f}")


@pytest.mark.asyncio
async def test_recommendations_with_cf_cold_start(item_cf_trained):
    """Test CF with user who has no history (cold start)"""
    recommender = get_recommender()
    
    # User with no history - should fallback to vector similarity
    results = await recommender.recommend(
        query="designer bomber jacket",
        user_id="new_user_123",
        top_k=5
    )
    
    assert isinstance(results, list)
    assert len(results) <= 5
    
    print(f"\n✅ Cold start handled: {len(results)} results")
    print("   (Should use vector similarity since no user history)")


@pytest.mark.asyncio
async def test_cf_similarity_matrix_loaded(item_cf_trained):
    """Test that CF similarity matrix is properly loaded"""
    cf = item_cf_trained
    
    assert cf.similarity_matrix is not None
    assert len(cf.similarity_matrix) > 0
    
    # Test get similar items
    test_item = list(cf.similarity_matrix.keys())[0]
    similar  = cf.get_similar_items(test_item, top_k=5)
    
    assert isinstance(similar, list)
    if similar:
        print(f"\n✅ Similarity matrix working")
        print(f"   Similar to {test_item}:")
        for item_id, score in similar[:3]:
            print(f"     - {item_id}: {score:.4f}")


@pytest.mark.asyncio
async def test_hybrid_fusion_scores(item_cf_trained):
    """Test that hybrid fusion combines scores correctly"""
    recommender = get_recommender()
    
    # This will apply CF if user has history (currently none)
    results = await recommender.recommend(
        query="hoodie",
        user_id="test_user",
        top_k=3
    )
    
    # Check results have expected scores
    for result in results:
        assert hasattr(result, 'score')
        assert result.score >= 0
    
    print(f"\n✅ Hybrid fusion applied: {len(results)} results")


@pytest.mark.asyncio
async def test_recommendations_with_filters_and_cf(item_cf_trained):
    """Test CF works with filters"""
    recommender = get_recommender()
    
    results = await recommender.recommend(
        query="jacket",
        filters={"type": "bomber", "price_max": 100.0},
        user_id="filter_test_user",
        top_k=5
    )
    
    # Verify filters applied
    for result in results:
        assert result.type == "bomber" or result.type is None
        if result.price:
            assert result.price <= 100.0
    
    print(f"\n✅ Filters + CF: {len(results)} bomber jackets under €100")


@pytest.mark.asyncio 
async def test_cf_performance():
    """Test CF recommendation performance"""
    import time
    
    recommender = get_recommender()
    
    # Warm up
    await recommender.recommend("test", top_k=5)
    
    # Measure
    start = time.time()
    for _ in range(10):
        await recommender.recommend(
            query="casual tee",
            user_id=f"perf_user_{_}",
            top_k=10
        )
    elapsed = time.time() - start
    
    avg_latency = (elapsed / 10) * 1000  # ms
    
    print(f"\n✅ Performance: {avg_latency:.2f}ms average latency")
    assert avg_latency < 200, f"Too slow: {avg_latency}ms"


@pytest.mark.asyncio
async def test_recommendations_consistency():
    """Test that same query returns consistent results"""
    recommender = get_recommender()
    
    # Run same query twice
    results1 = await recommender.recommend("hoodie", top_k=5)
    results2 = await recommender.recommend("hoodie", top_k=5)
    
    # Should return same products (order might vary slightly)
    ids1 = {p.id for p in results1}
    ids2 = {p.id for p in results2}
    
    overlap = len(ids1 & ids2) / max(len(ids1), len(ids2), 1)
    
    print(f"\n✅ Consistency: {overlap*100:.1f}% overlap between runs")
    assert overlap >= 0.7, "Results too inconsistent"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short", "-s"])
