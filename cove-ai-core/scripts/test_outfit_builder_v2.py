import asyncio
import sys
import logging
from pathlib import Path

# Ensure we can import app modules
sys.path.append(str(Path(__file__).parent.parent))

from app.agents.stylist_agent import StylistAgent

# Configure Logging
logging.basicConfig(level=logging.INFO)
# Mute bulky logs
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("app.vector.store").setLevel(logging.WARNING)

async def run_tests():
    print("🚀 Initializing Stylist Agent for End-to-End Test...\n")
    agent = StylistAgent(name="stylist")
    
    test_cases = [
        {
            "name": "💃 Formal Gala (New Occasion)",
            "query": "I need a stunning outfit for a formal charity gala. I want to look respectful but stylish.",
            "budget": 2500,
            "expected_types": ["dress", "gown", "heels", "pumps"]
        },
        {
            "name": "💼 Business Meeting (New Occasion)",
            "query": "I have a big board meeting. I need a professional power suit look.",
            "budget": 1500,
            "expected_types": ["blazer", "trousers", "pants", "shirt", "loafers"]
        },
        {
            "name": "🏃 Morning Jog (New Activity)",
            "query": "I'm starting to run every morning. Need a functional outfit.",
            "budget": 600,
            "expected_types": ["sneakers", "activewear", "hoodie"]
        },
        {
            "name": "🚫 Negative Constraint (No Shoes)",
            "query": "I need a business outfit but I don't need shoes. I already have them.",
            "budget": 1000,
            "expected_types": ["blazer", "trousers", "pants", "shirt"] # Should NOT have shoes
        }
    ]

    for test in test_cases:
        print(f"--------------------------------------------------")
        print(f"✨ SCENARIO: {test['name']}")
        print(f"   Query: \"{test['query']}\"")
        print(f"   Budget: €{test['budget']}")
        
        task = {
            "query": test["query"],
            "budget_max": test["budget"],
            "categories": [] # Let agent decide
        }
        
        context = {
            "user_id": "test_user_terminal",
            "preferences": {"colors": ["black", "navy", "emerald"]} 
        }

        try:
            result = await agent.run(task, context)
            
            if result.success:
                items = result.data.get("outfit_items", [])
                
                # FALLBACK: StylistAgent returns 'candidates' dict?
                if not items and "candidates" in result.data:
                    print("   ℹ️ Agent returned 'candidates' dict instead of 'outfit_items'. Flattening...")
                    candidates = result.data["candidates"]
                    for cat, cat_items in candidates.items():
                        items.extend(cat_items)

                print(f"   ✅ AGENT SUCCESS! Found {len(items)} items.")
                print(f"   📝 Reasoning: {result.reasoning[:150]}...")
                
                print("\n   👕 SELECTED OUTFIT:")
                found_types = set()
                for item in items:
                    title = item.get("title", "Unknown")
                    meta = item.get("meta", {})
                    # Handle both 'brand' and 'brandId'
                    brand = meta.get("brandId") or meta.get("brand") or "Unknown Brand"
                    price = meta.get("price", 0)
                    type_ = meta.get("type", "unknown")
                    found_types.add(type_.lower())
                    
                    found_keyword_match = False
                    for exp in test["expected_types"]:
                        if exp in type_.lower() or exp in title.lower():
                            found_keyword_match = True
                    
                    match_icon = "🎯" if found_keyword_match else "❓"
                    print(f"      {match_icon} {title} (${price})")
                    print(f"         Brand: {brand} | Type: {type_}")
                
                # Validation
                print("\n   🕵️ MATCH VALIDATION:")
                matched_any = False
                for exp in test["expected_types"]:
                    # Check if any found type matches expected
                    if any(exp in ft for ft in found_types):
                        matched_any = True
                        break
                
                if matched_any:
                    print("      ✅ At least one expected product type found.")
                else:
                    print(f"      ❌ WARNING: Expected {test['expected_types']} but got {found_types}")

            else:
                print(f"   ❌ AGENT FAILED: {result.errors}")

        except Exception as e:
            print(f"   ⚠️ Exception: {e}")
            # import traceback
            # traceback.print_exc()
        
        print("\n")

if __name__ == "__main__":
    asyncio.run(run_tests())
