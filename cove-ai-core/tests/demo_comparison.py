
import asyncio
import os
import sys
import prettytable

# Add app to path
sys.path.append(os.getcwd())

from app.vector.hybrid_search import search_hybrid_rrf
from app.vector.personalized_search import personalized_search
from app.core.config import PG_DSN
import psycopg

# Mock embedding (all zeros) for speed - in real life these would be different
mock_embedding = [0.0] * 1536

def print_results(title, results):
    t = prettytable.PrettyTable(["Rank", "Title", "Score", "Type"])
    for i, r in enumerate(results[:3]): # Top 3
        # PersonalizedResult has final_score, SearchResult has score
        score = getattr(r, 'final_score', getattr(r, 'score', 0))
        t.add_row([i+1, r.title, f"{score:.4f}", r.source])
    print(f"\n--- {title} ---")
    print(t)

def demo_comparison():
    print("🧪 Generative Search Comparison: Before vs After")
    conn = psycopg.connect(PG_DSN)
    
    try:
        # 1. SETUP DATA
        print("\n📝 Setting up test data...")
        with conn.cursor() as cur:
            # Clean up old test data
            cur.execute("DELETE FROM ai_core.docs WHERE id LIKE 'demo-%'")
            
            # Scenario 1: Exact SKU vs Semantic match
            # "Blue T-Shirt" is a semantic match for "Blue Tee", "Ref-999" is exact
            cur.execute("""
                INSERT INTO ai_core.docs (id, title, text, kind, meta, embedding)
                VALUES 
                ('demo-sku-1', 'Basic Blue Tee Ref-999', 'Just a t-shirt', 'product', '{"slug": "demo-sku-1", "price": 20}', %s::vector),
                ('demo-semantic-1', 'Premium Ocean Blue T-Shirt', 'High quality aesthetic blue top', 'product', '{"slug": "demo-sem-1", "price": 100}', %s::vector)
            """, (mock_embedding, mock_embedding))
            
            # Scenario 2: Budget Personalization
            # Query "Wedding Guest"
            cur.execute("""
                INSERT INTO ai_core.docs (id, title, text, kind, meta, embedding)
                VALUES 
                ('demo-exp-1', 'Luxury Silk Gown', 'Perfect for wedding guest', 'product', '{"slug": "demo-exp-1", "price": 500, "color": "red"}', %s::vector),
                ('demo-cheap-1', 'Affordable Party Dress', 'Great for wedding guest', 'product', '{"slug": "demo-cheap-1", "price": 80, "color": "blue"}', %s::vector)
            """, (mock_embedding, mock_embedding))
            
            conn.commit()

        # ---------------------------------------------------------
        # SCENARIO 1: The "Specific Item" Search (SKU/Ref)
        # Query: "Ref-999" (The user wants the specific item, not just any blue shirt)
        # ---------------------------------------------------------
        print("\n\n🔎 SCENARIO 1: Specific Intent ('Ref-999')")
        print("User says: 'I want that Basic Blue Tee Ref-999'")
        
        # BEFORE (Standard Search)
        # Without boost, semantic match might compete or rank similarly due to vector noise
        results_before = search_hybrid_rrf(
            conn=conn, query="Ref-999", query_embedding=mock_embedding, 
            sku_boost=False
        )
        print_results("BEFORE (Standard Hybrid)", results_before)
        
        # AFTER (Context-Aware SKU Boost)
        # Agent detects "Ref-999" -> sets sku_boost=True
        results_after = search_hybrid_rrf(
            conn=conn, query="Ref-999", query_embedding=mock_embedding, 
            sku_boost=True
        )
        print_results("AFTER (Context-Aware + SKU Boost)", results_after)


        # ---------------------------------------------------------
        # SCENARIO 2: The "Personalized" Search (Budget)
        # Query: "wedding guest"
        # User Profile: Budget sensitive (< €100)
        # ---------------------------------------------------------
        print("\n\n🔎 SCENARIO 2: Personalized Intent ('wedding guest')")
        print("User Profile: Budget max €100")
        
        # BEFORE (Standard Search)
        # Relevance only - Luxury item likely ranks high due to text match
        results_p_before = personalized_search(
            conn=conn, query="wedding guest", query_embedding=mock_embedding,
            user_profile=None # No profile
        )
        print_results("BEFORE (No Personalization)", results_p_before)
        
        # AFTER (Profile Boosting)
        results_p_after = personalized_search(
            conn=conn, query="wedding guest", query_embedding=mock_embedding,
            user_profile={"avg_price_max": 100} # User has budget affinity
        )
        print_results("AFTER (With Profile Boost)", results_p_after)

    finally:
        # Cleanup
        with conn.cursor() as cur:
            cur.execute("DELETE FROM ai_core.docs WHERE id LIKE 'demo-%'")
            conn.commit()
        conn.close()

if __name__ == "__main__":
    demo_comparison()
