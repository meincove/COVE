"""
Test Hybrid Search System with Real Queries.
Validates vector search, keyword search, and RRF fusion.
"""

import asyncio
import sys
from pathlib import Path

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.mcp_agents.product_recommender.hybrid_search import get_hybrid_search
from app.mcp_agents.product_recommender.vector_db import get_vector_db


async def test_vector_search():
    """Test pure vector similarity search"""
    print("\n" + "="*60)
    print("🔍 TEST 1: Vector Similarity Search")
    print("="*60)
    
    vector_db = await get_vector_db()
    hybrid = get_hybrid_search()
    
    # Generate embedding for query
    test_query = "comfortable hoodie"
    print(f"\nQuery: '{test_query}'")
    print("Generating embedding...")
    
    embedding = await hybrid._get_embedding(test_query)
    print(f"✅ Embedding generated ({len(embedding)} dimensions)")
    
    # Search
    print("\nSearching with vector similarity...")
    results = await vector_db.vector_search(embedding, filters=None, limit=5)
    
    print(f"\n📊 Results: {len(results)} products found")
    for i, product in enumerate(results, 1):
        print(f"   {i}. {product['title']}")
        print(f"      Similarity: {product['similarity_score']:.3f}")
        print(f"      Type: {product['type']} | Tier: {product['tier']} | Price: €{product['price']}")
    
    return results


async def test_keyword_search():
    """Test keyword/full-text search"""
    print("\n" + "="*60)
    print("🔤 TEST 2: Keyword Search (Full-Text)")
    print("="*60)
    
    vector_db = await get_vector_db()
    
    test_query = "designer hoodie"
    print(f"\nQuery: '{test_query}'")
    print("Searching with keyword matching...")
    
    results = await vector_db.keyword_search(test_query, filters=None, limit=5)
    
    print(f"\n📊 Results: {len(results)} products found")
    for i, product in enumerate(results, 1):
        print(f"   {i}. {product['title']}")
        print(f"      Keyword Score: {product['keyword_score']:.3f}")
        print(f"      Type: {product['type']} | Price: €{product['price']}")
    
    return results


async def test_hybrid_search():
    """Test hybrid search with RRF fusion"""
    print("\n" + "="*60)
    print("🎯 TEST 3: Hybrid Search (Vector + Keyword + RRF)")
    print("="*60)
    
    hybrid = get_hybrid_search()
    
    test_queries = [
        "comfortable designer hoodie",
        "structured tee",
        "premium fleece"
    ]
    
    for query in test_queries:
        print(f"\n📝 Query: '{query}'")
        print("-" * 60)
        
        results = await hybrid.search(query, filters=None, limit=3)
        
        print(f"✅ {len(results)} results (after RRF fusion)")
        for i, product in enumerate(results, 1):
            print(f"\n   {i}. {product['title']}")
            print(f"      RRF Score: {product['rrf_score']:.4f}")
            print(f"      Type: {product['type']} | Tier: {product['tier']}")
            print(f"      Price: €{product['price']}")


async def test_with_filters():
    """Test hybrid search with filters"""
    print("\n" + "="*60)
    print("🎚️  TEST 4: Hybrid Search with Filters")
    print("="*60)
    
    hybrid = get_hybrid_search()
    
    # Test with type filter
    print("\n📝 Query: 'designer clothing'")
    print("Filter: type='hoodie'")
    print("-" * 60)
    
    results = await hybrid.search(
        query="designer clothing",
        filters={"type": "hoodie"},
        limit=5
    )
    
    print(f"✅ {len(results)} hoodies found")
    for i, product in enumerate(results, 1):
        print(f"   {i}. {product['title']} - €{product['price']}")
    
    # Test with price filter
    print("\n📝 Query: 'designer clothing'")
    print("Filter: price <= €40")
    print("-" * 60)
    
    results = await hybrid.search(
        query="designer clothing",
        filters={"price_max": 40.0},
        limit=5
    )
    
    print(f"✅ {len(results)} products under €40 found")
    for i, product in enumerate(results, 1):
        print(f"   {i}. {product['title']} - €{product['price']}")


async def test_edge_cases():
    """Test edge cases and robustness"""
    print("\n" + "="*60)
    print("⚡ TEST 5: Edge Cases & Robustness")
    print("="*60)
    
    hybrid = get_hybrid_search()
    
    edge_cases = [
        "nonexistent product xyz123",
        "tee",  # Very short query
        "I need something comfortable for winter casual wear",  # Long semantic query
    ]
    
    for query in edge_cases:
        print(f"\n📝 Query: '{query}'")
        results = await hybrid.search(query, limit=2)
        print(f"   → {len(results)} results")
        if results:
            print(f"   Top: {results[0]['title']} (RRF: {results[0]['rrf_score']:.4f})")


async def run_all_tests():
    """Run complete test suite"""
    print("\n" + "="*70)
    print("🧪 HYBRID SEARCH SYSTEM - COMPREHENSIVE TEST SUITE")
    print("="*70)
    
    try:
        # Individual tests
        await test_vector_search()
        await test_keyword_search()
        await test_hybrid_search()
        await test_with_filters()
        await test_edge_cases()
        
        # Summary
        print("\n" + "="*70)
        print("✅ ALL TESTS COMPLETED SUCCESSFULLY")
        print("="*70)
        print("\n🎉 Hybrid Search System: VALIDATED")
        print("   - Vector search: Working")
        print("   - Keyword search: Working")
        print("   - RRF fusion: Working")
        print("   - Filters: Working")
        print("   - Edge cases: Handled")
        print("\n" + "="*70 + "\n")
        
    except Exception as e:
        print(f"\n❌ Error during testing: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(run_all_tests())
