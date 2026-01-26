
import asyncio
import os
import sys
import logging

# Setup logging to console
logging.basicConfig(level=logging.WARN, format='%(message)s')
log = logging.getLogger("cove.agents.stylist")
log.setLevel(logging.WARN)

from app.agents.stylist_agent import StylistAgent

async def test_brand_candidates():
    print("\n\n📊 BRAND CANDIDATE VERIFICATION: Vortex Streetwear\n")
    print("-" * 60)
    
    agent = StylistAgent("stylist")
    
    # Track results
    results = {"tops": [], "bottoms": [], "shoes": []}

    # Mock Streaming Callback to capture candidates
    async def mock_callback(event):
        e_type = event.get("event_type")
        if e_type == "category_candidates":
            cat = event.get("category").lower()
            candidates = event.get("candidates", [])
            
            # Print Header
            print(f"\n📂 CATEGORY: {cat.upper()} ({len(candidates)} items)")
            print(f"{'TITLE':<40} | {'TYPE':<15} | {'PRICE':<8} | {'IMAGE'}")
            print("-" * 80)
            
            for c in candidates:
                title = c.get("title")[:38]
                type_ = c.get("type")
                price = c.get("price")
                img = c.get("imageUrl")
                has_img = "✅ Yes" if img and "http" in str(img) else "❌ No"
                
                print(f"{title:<40} | {type_:<15} | €{price:<7} | {has_img}")
                
                # Check for leakage
                if cat == "tops" and type_ in ["shoes", "sneakers", "boots", "high-tops"]:
                     print(f"    🚨 ERROR: {type_} found in TOPS!")
                
                if cat in results:
                    results[cat].append(c)

    task = {
        "query": "Vortex Streetwear outfit",
        "budget_max": 1000,
        "categories": ["tops", "bottoms", "shoes"]
    }
    
    context = {
        "user_id": "test_verification",
        "gender": "men"
    }
    
    await agent.execute(task, context, stream_callback=mock_callback)
    print("\n" + "-" * 60)
    print("✅ Verification Complete")

if __name__ == "__main__":
    sys.path.append(os.getcwd())
    asyncio.run(test_brand_candidates())
