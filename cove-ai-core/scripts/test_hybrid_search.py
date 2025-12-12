"""
Test script for hybrid search (BM25 + Vector + RRF)

Compares:
1. Dense-only search (old way)
2. Hybrid search with RRF (new way)

Expected improvements:
- Better exact brand matching ("COVE hoodie" ranks COVE first)
- Better keyword precision ("black hoodie" finds black ones)
- Semantic understanding still works
"""

import asyncio
import os
from dotenv import load_dotenv

load_dotenv()

from app.providers.embedding import embed_query
from app.vector.hybrid_search import search_hybrid_rrf, search_results_to_dict, search_bm25, search_vector
from app.vector.store import get_conn_sync, init_pool

# Initialize connection pool
init_pool()


async def test_hybrid_search():
    """Test hybrid search with various queries"""
    
    test_queries = [
        "COVE black hoodie",
        "UrbanPulse tee",
        "designer jacket for women",
        "casual sweater",
        "BoldHues accessories"
    ]
    
    print("\n" + "="*80)
    print("🔍 HYBRID SEARCH TEST (BM25 + Vector + RRF)")
    print("="*80 + "\n")
    
    for query in test_queries:
        print(f"\n{'─'*80}")
        print(f"Query: \"{query}\"")
        print(f"{'─'*80}\n")
        
        # Generate embedding
        embedding = await embed_query(query)
        
        with get_conn_sync() as conn:
            # 1. BM25 only
            bm25_results = search_bm25(conn, query, kind="product", top_k=5)
            print("📝 BM25 Keyword Search (Top 5):")
            for idx, r in enumerate(bm25_results, 1):
                brand = r.meta.get('brand_id', 'Unknown')
                print(f"   {idx}. [{brand}] {r.title} (score: {r.score:.4f})")
            
            # 2. Vector only
            vector_results = search_vector(conn, embedding, kind="product", top_k=5)
            print(f"\n🎯 Vector Semantic Search (Top 5):")
            for idx, r in enumerate(vector_results, 1):
                brand = r.meta.get('brand_id', 'Unknown')
                print(f"   {idx}. [{brand}] {r.title} (score: {r.score:.4f})")
            
            # 3. Hybrid (RRF fusion)
            hybrid_results = search_hybrid_rrf(
                conn, query, embedding, 
                kind="product", top_k=5,
                bm25_k=20, vector_k=20, rrf_constant=60
            )
            print(f"\n🔥 HYBRID (RRF Fusion, k=60) (Top 5):")
            for idx, r in enumerate(hybrid_results, 1):
                brand = r.meta.get('brand_id', 'Unknown')
                product_type = r.meta.get('type', 'unknown')
                print(f"   {idx}. [{brand}] {r.title} - {product_type} (RRF: {r.score:.4f})")
    
    print(f"\n{'='*80}")
    print("✅ Hybrid search test complete!")
    print("="*80 + "\n")


async def test_brand_precision():
    """Test that brand-specific queries work correctly"""
    
    print("\n" + "="*80)
    print("🎯 BRAND PRECISION TEST")
    print("="*80 + "\n")
    
    brand_queries = [
        ("COVE hoodie", "COVE"),
        ("UrbanPulse jacket", "UrbanPulse"),
        ("BoldHues tee", "BoldHues"),
    ]
    
    for query, expected_brand in brand_queries:
        print(f"\nQuery: \"{query}\" (Expected brand: {expected_brand})")
        
        embedding = await embed_query(query)
        
        with get_conn_sync() as conn:
            results = search_hybrid_rrf(
                conn, query, embedding,
                kind="product", top_k=3
            )
            
            if results:
                top_result = results[0]
                actual_brand = top_result.meta.get('brand_id', 'Unknown')
                
                if actual_brand == expected_brand:
                    print(f"   ✅ CORRECT: Top result is {actual_brand}")
                else:
                    print(f"   ❌ WRONG: Top result is {actual_brand} (expected {expected_brand})")
                
                print(f"   Top 3 brands: {[r.meta.get('brand_id') for r in results[:3]]}")
            else:
                print(f"   ❌ No results found!")
    
    print("\n" + "="*80)
    print("✅ Brand precision test complete!")
    print("="*80 + "\n")


if __name__ == "__main__":
    asyncio.run(test_hybrid_search())
    asyncio.run(test_brand_precision())
