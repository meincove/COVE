"""
Quick test for Turn 5 fix: "what about the second hoodie you showed?"
Should answer from context, NOT show new products
"""

import asyncio
import httpx

SESSION_ID = "turn5_fix_test"
AI_CORE_URL = "http://localhost:8000"

async def test_turn5_fix():
    print("="*80)
    print("TESTING TURN 5 FIX: Intent Classification")
    print("="*80)
    
    # Turn 1: Show hoodies
    print("\nTURN 1: show me hoodies")
    async with httpx.AsyncClient(timeout=30.0) as client:
        r1 = await client.post(
            f"{AI_CORE_URL}/ai/agent/query",
            json={"message": "show me hoodies", "guestSessionId": SESSION_ID}
        )
        items = r1.json().get('items', [])
        print(f"✅ Showed {len(items)} hoodies")
        if len(items) >= 2:
            print(f"   1. {items[0].get('title')}")
            print(f"   2. {items[1].get('title')}")
    
    await asyncio.sleep(3)  # Wait for facts
    
    # Turn 5: Ask about second hoodie (THE KEY TEST)
    print("\n" + "="*80)
    print("TURN 5: what about the second hoodie you showed?")
    print("="*80)
    print("Expected: Answer from context WITHOUT showing new products")
    print()
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        r5 = await client.post(
            f"{AI_CORE_URL}/ai/agent/query",
            json={"message": "what about the second hoodie you showed?", "guestSessionId": SESSION_ID}
        )
        
        data = r5.json()
        answer = data.get('answer', '')
        items = data.get('items', [])
        
        print(f"AI Response: {answer[:300]}...")
        print(f"\nItems shown: {len(items)}")
        
        if len(items) == 0:
            print("\n✅ SUCCESS: No new products shown (answered from context)")
            return True
        else:
            print(f"\n❌ FAIL: Showed {len(items)} new products (should answer from context)")
            for i, item in enumerate(items[:3], 1):
                print(f"   {i}. {item.get('title')}")
            return False

if __name__ == "__main__":
    success = asyncio.run(test_turn5_fix())
    exit(0 if success else 1)
