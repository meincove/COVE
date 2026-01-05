
import asyncio
import os
import sys
# Add app to path
sys.path.append(os.getcwd())

from app.vector.hybrid_search import search_hybrid_rrf
from app.core.config import PG_DSN
import psycopg

# Mock embedding (all zeros) for speed
mock_embedding = [0.0] * 1536

def test_sku_boost():
    print("🧪 Testing SKU Boost Strategy...")
    # 1. Connect
    conn = psycopg.connect(PG_DSN)
    
    try:
        # 2. Insert dummy product with specific SKU in title
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO ai_core.docs (id, title, text, kind, meta, embedding)
                VALUES 
                ('test-sku-1', 'Product SKU-999', 'A generic item', 'product', '{"slug": "test-sku-1"}', %s::vector),
                ('test-sku-2', 'Semantic Match Item', 'A generic item similar to the other one', 'product', '{"slug": "test-sku-2"}', %s::vector)
                ON CONFLICT (id) DO NOTHING
            """, (mock_embedding, mock_embedding))
            conn.commit()
            
        # 3. Search WITHOUT boost (Control) -> Should be balanced
        print("\n🔍 Control Search (sku_boost=False): 'SKU-999'")
        results_control = search_hybrid_rrf(
            conn=conn, 
            query="SKU-999", 
            query_embedding=mock_embedding, 
            sku_boost=False
        )
        for r in results_control:
            if 'test-sku' in r.id:
                print(f"   - {r.title} ({r.id}): Score={r.score:.4f}")

        # 4. Search WITH boost (Test) -> BM25 should dominate
        print("\n🚀 Boosted Search (sku_boost=True): 'SKU-999'")
        results_boost = search_hybrid_rrf(
            conn=conn, 
            query="SKU-999", 
            query_embedding=mock_embedding, 
            sku_boost=True
        )
        for r in results_boost:
            if 'test-sku' in r.id:
                print(f"   - {r.title} ({r.id}): Score={r.score:.4f}")
                
        # 5. Cleanup
        with conn.cursor() as cur:
            cur.execute("DELETE FROM ai_core.docs WHERE id IN ('test-sku-1', 'test-sku-2')")
            conn.commit()

    finally:
        conn.close()

if __name__ == "__main__":
    test_sku_boost()
