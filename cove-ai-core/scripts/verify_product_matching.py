"""
Verify that products in candidate lists match the outfit occasion/formality
"""
import asyncio
import logging
import sys
import os

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.agents.stylist_agent import StylistAgent

# Setup logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("verify_products")

# Mock Context
context = {
    "user_id": "test_product_matching",
    "guest_session_id": "session_xyz",
}

async def inspect_products(query, description, expected_occasion):
    print(f"\n{'='*80}")
    print(f"TEST: {description}")
    print(f"Query: '{query}'")
    print(f"Expected Occasion: {expected_occasion}")
    print(f"{'='*80}\n")
    
    agent = StylistAgent("stylist")
    task = {"query": query, "budget": 1000}
    
    try:
        result = await agent.execute(task, context)
        
        if not result.success:
            print(f"❌ FAILED: {result.errors}")
            return
        
        print("✅ Agent executed successfully\n")
        
        # Extract intent
        intent = result.data.get("intent", {})
        detected_occasion = intent.get("occasion", "unknown")
        detected_gender = intent.get("gender", "unknown")
        
        print(f"📊 DETECTED INTENT:")
        print(f"   Occasion: {detected_occasion}")
        print(f"   Gender: {detected_gender}")
        print()
        
        # Inspect candidates
        candidates = result.data.get("candidates", {})
        
        for category, items in candidates.items():
            print(f"\n📦 {category.upper()} ({len(items)} items):")
            print("-" * 80)
            
            for idx, item in enumerate(items[:5], 1):  # Show first 5 items
                # Items from the agent are dicts from /ai/recs/suggest response
                name = item.get("title", "Unknown") #  RecItem uses 'title' not 'name'
                product_type = item.get("type", "Unknown")
                gender = "N/A"  # Gender not returned in RecItem by default
                price = item.get("price", 0)
                
                print(f"  {idx}. {name}")
                print(f"     Type: {product_type} | Price: €{price:.2f}")
        
        # Summary
        total_items = sum(len(items) for items in candidates.values())
        print(f"\n📊 SUMMARY: {total_items} total items found")
        
        # Validation check
        print(f"\n✅ VALIDATION:")
        if detected_occasion == expected_occasion:
            print(f"   ✓ Occasion matches expected: {expected_occasion}")
        else:
            print(f"   ⚠️ Occasion mismatch: expected={expected_occasion}, got={detected_occasion}")
        
        if total_items > 0:
            print(f"   ✓ Products found (did not halt)")
        else:
            print(f"   ⚠️ No products found")
            
    except Exception as e:
        print(f"💥 EXCEPTION: {e}")
        import traceback
        traceback.print_exc()

async def main():
    # Test 1: Formal outfit
    await inspect_products(
        "I need a formal outfit for a gala",
        "Formal Gala Outfit",
        "formal"
    )
    
    # Test 2: Casual outfit
    await inspect_products(
        "Casual weekend outfit for brunch",
        "Casual Brunch Outfit",
        "casual"
    )
    
    # Test 3: Business outfit
    await inspect_products(
        "Professional outfit for a job interview",
        "Business Interview Outfit",
        "formal"
    )

if __name__ == "__main__":
    asyncio.run(main())
