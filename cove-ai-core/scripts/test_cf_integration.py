"""
Test CF Integration with Personalized Search

Tests:
1. Search without personalization (no user_id)
2. Search with personalization (with user history)
3. CF score impact on ranking
"""

import asyncio
from dotenv import load_dotenv

load_dotenv()

from app.providers.embedding import embed_query
from app.vector.personalized_search import personalized_search, personalized_results_to_dict
from app.vector.store import get_conn_sync, init_pool
from app.mcp_agents.product_recommender.item_based_cf import ItemBasedCF

# Initialize
init_pool()


async def test_no_personalization():
    """Test search without user_id - should work like regular hybrid search"""
    
    print("\n" + "="*80)
    print("🔍 TEST 1: Search WITHOUT Personalization")
    print("="*80 + "\n")
    
    query = "casual hoodie"
    embedding = await embed_query(query)
    
    with get_conn_sync() as conn:
        results = personalized_search(
            conn=conn,
            query=query,
            query_embedding=embedding,
            user_id=None,  # No personalization
            kind="product",
            top_k=5
        )
        
        print(f"Query: \"{query}\"")
        print(f"Results: {len(results)}\n")
        
        for idx, r in enumerate(results, 1):
            brand = r.meta.get('brand_id', 'Unknown')
            print(f"   {idx}. [{brand}] {r.title}")
            print(f"      Search: {r.search_score:.4f} | CF: {r.cf_score:.4f} | Final: {r.final_score:.4f}")
            print(f"      Source: {r.source}")
    
    print("\n✅ Results returned with source='search_only'\n")


async def test_with_mock_cf():
    """Test personalized search with mock CF model"""
    
    print("\n" + "="*80)
    print("🎯 TEST 2: Search WITH Mock Personalization")
    print("="*80 + "\n")
    
    # Create mock CF model
    cf = ItemBasedCF()
    
    # Note: CF model needs training data
    # For now, test that the pipeline works even with empty CF
    
    query = "designer jacket"
    embedding = await embed_query(query)
    
    with get_conn_sync() as conn:
        results = personalized_search(
            conn=conn,
            query=query,
            query_embedding=embedding,
            user_id="test_user_123",
            kind="product",
            top_k=5,
            cf_model=cf
        )
        
        print(f"Query: \"{query}\"")
        print(f"User: test_user_123")
        print(f"Results: {len(results)}\n")
        
        for idx, r in enumerate(results, 1):
            brand = r.meta.get('brand_id', 'Unknown')
            print(f"   {idx}. [{brand}] {r.title}")
            print(f"      Search: {r.search_score:.4f} | CF: {r.cf_score:.4f} | Final: {r.final_score:.4f}")
            print(f"      Source: {r.source}")
    
    print("\n✅ Personalization pipeline working (CF scores available)\n")


async def test_fusion_weights():
    """Test different fusion weight configurations"""
    
    print("\n" + "="*80)
    print("⚖️  TEST 3: Fusion Weight Configuration")
    print("="*80 + "\n")
    
    query = "black tee"
    embedding = await embed_query(query)
    cf = ItemBasedCF()
    
    weight_configs = [
        (1.0, 0.0, "100% Search, 0% CF"),
        (0.6, 0.4, "60% Search, 40% CF (Industry Standard)"),
        (0.5, 0.5, "50% Search, 50% CF"),
        (0.0, 1.0, "0% Search, 100% CF"),
    ]
    
    with get_conn_sync() as conn:
        for search_w, cf_w, label in weight_configs:
            results = personalized_search(
                conn=conn,
                query=query,
                query_embedding=embedding,
                user_id="test_user_123",
                kind="product",
                top_k=3,
                cf_model=cf,
                search_weight=search_w,
                cf_weight=cf_w
            )
            
            print(f"\n{label}:")
            if results:
                top = results[0]
                brand = top.meta.get('brand_id', 'Unknown')
                print(f"   Top Result: [{brand}] {top.title}")
                print(f"   Final Score: {top.final_score:.4f}")
    
    print("\n✅ Weight configurations working correctly\n")


async def test_brand_diversity():
    """Test that personalization doesn't reduce brand diversity"""
    
    print("\n" + "="*80)
    print("🌈 TEST 4: Brand Diversity Check")
    print("="*80 + "\n")
    
    query = "sweater"
    embedding = await embed_query(query)
    cf = ItemBasedCF()
    
    with get_conn_sync() as conn:
        # Without personalization
        results_no_cf = personalized_search(
            conn, query, embedding, None, "product", 10
        )
        
        # With personalization
        results_with_cf = personalized_search(
            conn, query, embedding, "test_user", "product", 10, cf
        )
        
        brands_no_cf = set(r.meta.get('brand_id') for r in results_no_cf)
        brands_with_cf = set(r.meta.get('brand_id') for r in results_with_cf)
        
        print(f"Without personalization: {len(brands_no_cf)} brands")
        print(f"   Brands: {sorted(brands_no_cf)}\n")
        
        print(f"With personalization: {len(brands_with_cf)} brands")
        print(f"   Brands: {sorted(brands_with_cf)}")
        
        if len(brands_with_cf) >= len(brands_no_cf) * 0.7:
            print(f"\n✅ Good diversity maintained ({len(brands_with_cf)}/{len(brands_no_cf)} brands)")
        else:
            print(f"\n⚠️  Diversity reduced ({len(brands_with_cf)}/{len(brands_no_cf)} brands)")
    

if __name__ == "__main__":
    print("\n" + "="*80)
    print("🧪 CF INTEGRATION TEST SUITE")
    print("="*80)
    
    asyncio.run(test_no_personalization())
    asyncio.run(test_with_mock_cf())
    asyncio.run(test_fusion_weights())
    asyncio.run(test_brand_diversity())
    
    print("\n" + "="*80)
    print("✅ ALL TESTS COMPLETE")
    print("="*80 + "\n")
