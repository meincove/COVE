#!/usr/bin/env python3
"""
Test Outfit Builder v2 end-to-end.

Usage:
    PYTHONPATH=/Users/ssg/Desktop/COVE/cove-ai-core python3 scripts/test_outfit_builder_v2.py
"""

import asyncio
import logging

logging.basicConfig(level=logging.INFO, format='%(message)s')


async def test_outfit_builder_v2():
    from app.agents.outfit_builder_v2 import outfit_builder_v2_handler
    
    print("🧪 Testing Outfit Builder v2\n")
    print("=" * 60)
    
    task = {
        "budget_max": 500,
        "gender": "men",
        "style": "casual weekend",
        "num_outfits": 3,
    }
    
    context = {
        "user_id": None,
        "guest_session_id": "test_v2_session",
    }
    
    result = await outfit_builder_v2_handler(task, context)
    
    print("\n" + "=" * 60)
    print(f"✅ Result: success={result.success}")
    print(f"📦 Reasoning: {result.reasoning}")
    print()
    
    # Group items by outfit
    outfits = {}
    for item in result.data.get("outfit_items", []):
        oid = item["outfit_id"]
        if oid not in outfits:
            outfits[oid] = []
        outfits[oid].append(item)
    
    # Display each outfit
    for outfit_id, items in sorted(outfits.items()):
        total = sum(item.get("price", 0) for item in items)
        print(f"\n--- {outfit_id} ({len(items)} items) ---")
        print(f"Total Cost: €{total:.2f}")
        
        categories_found = set()
        for item in items:
            cat = item.get("category", "?")
            categories_found.add(cat)
            price = item.get("price", 0)
            print(f"  * [{cat}] {item['title']} (€{price:.2f})")
        
        # Check for missing categories
        missing = set(["tops", "bottoms", "shoes"]) - categories_found
        if missing:
            print(f"  ⚠️ Missing: {', '.join(missing)}")
        else:
            print(f"  ✅ Complete outfit!")
    
    # Check for missing categories in result
    if result.data.get("missing_categories"):
        print("\n⚠️ Missing categories noted:")
        for mc in result.data["missing_categories"]:
            print(f"   - {mc['outfit_id']}: {mc['category']} (budget: €{mc['budget']:.2f})")
    
    print("\n" + "=" * 60)
    print("✅ Outfit Builder v2 test complete!")


if __name__ == "__main__":
    asyncio.run(test_outfit_builder_v2())
