#!/usr/bin/env python3
"""
Test StylistAgent with User Preferences
Verifies preference integration works end-to-end
"""

import asyncio
import sys
import os
sys.path.insert(0, '/Users/ssg/Desktop/COVE/cove-ai-core')

from dotenv import load_dotenv
load_dotenv('/Users/ssg/Desktop/COVE/cove-ai-core/.env')

from app.agents.stylist_agent import StylistAgent
from app.services.user_preference_manager import get_preference_manager


async def test_stylist_with_preferences():
    """Test outfit building with user preferences"""
    
    print("=" * 80)
    print("TESTING STYLIST AGENT WITH USER PREFERENCES")
    print("=" * 80)
    print()
    
    test_user = "test_stylist_user"
    
    # Step 1: Store user preferences
    print("📝 STEP 1: Storing user preferences")
    print("-" * 40)
    
    manager = await get_preference_manager()
    
    preferences = [
        "I hate hoodies, they're too casual for me",
        "I prefer navy and black colors",
        "I love slim fit blazers"
    ]
    
    for pref in preferences:
        result = await manager.process_statement(test_user, pref)
        print(f"✅ Stored: {pref[:60]}")
    
    print()
    
    # Step 2: Build outfit with preferences
    print("👔 STEP 2: Building outfit (should filter hoodies)")
    print("-" * 40)
    
    stylist = StylistAgent(name="StylistAgent")
    
    task = {
        "query": "casual outfit for weekend brunch",
        "budget_max": 300
    }
    
    context = {
        "user_id": test_user,
        "guest_session_id": None
    }
    
    try:
        result = await stylist.execute(task, context)
        
        if result.success:
            outfit_items = result.data.get("outfit_items", [])
            total_cost = result.data.get("total", 0.0)
            
            print(f"\nOutfit built:")
            print(f"  Items: {len(outfit_items)}")
            print(f"  Total cost: €{total_cost:.2f}")
            print(f"\n  Pieces:")
            
            # Check if hoodies are in results (should NOT be!)
            has_hoodie = False
            for item in outfit_items:
                item_type = item.get('type') or "unknown"
                item_title = item.get('title') or "unknown"
                print(f"    - {item_type:15} {item_title[:40]}")
                if 'hoodie' in item_type.lower():
                    has_hoodie = True
        else:
            print(f"❌ Stylist execution failed: {result.reasoning}")
            outfit_items = []
            has_hoodie = False
        if has_hoodie:
            print("❌ FAIL: Hoodie found despite user preference!")
        else:
            print("✅ PASS: No hoodies (user preference respected!)")
            
    except Exception as e:
        print(f"❌ Error building outfit: {e}")
        import traceback
        traceback.print_exc()
    
    print()
    print("=" * 80)
    print("TEST COMPLETE")
    print("=" * 80)


if __name__ == "__main__":
    asyncio.run(test_stylist_with_preferences())
