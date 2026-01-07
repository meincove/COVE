#!/usr/bin/env python3
"""
Zalando Upgrade Validation Script

Tests:
1. Context Translation (Vibe -> Attributes)
2. Visual Vibe Boosting
3. Profile Affinity Ranking
"""

import asyncio
import httpx
import json

BASE_URL = "http://localhost:8000"
SESSION_ID = "zalando_test_session"

async def send_query(message: str, session_id: str = SESSION_ID) -> dict:
    print(f"\nExample Query: '{message}'")
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            f"{BASE_URL}/ai/agent/query",
            json={
                "message": message,
                "guestSessionId": session_id,
                "historyScope": "user"
            }
        )
        if resp.status_code != 200:
            print(f"❌ Error: {resp.status_code}")
            return {}
        return resp.json()

async def main():
    print("🚀 VALIDATING ZALANDO ARCHITECTURE UPGRADE")
    print("="*60)
    
    # TEST 1: Context Use
    # "wedding in summer" -> should NOT just look for "wedding" keyword, but "formal", "guest", "lightweight"
    print("\n🔍 TEST 1: Semantic Context Translation")
    data = await send_query("I need something for a summer wedding in Santorini")
    print(f"✅ Answer: {data.get('answer')[:100]}...")
    # Check backend logs for "Applied Strategy"
    
    # TEST 2: Vibe Boosting
    # "boho chic" -> should trigger Visual Vibe boosting
    print("\n🎨 TEST 2: Visual Vibe Boosting")
    data = await send_query("show me boho chic dresses")
    items = data.get('items', [])
    print(f"📦 Items Found: {len(items)}")
    for item in items[:3]:
        print(f"   - {item.get('title')}: {item.get('description')[:50]}...")
        
    # TEST 3: Profile Affinity
    # First, establish price sensitivity
    print("\n👤 TEST 3: Profile Affinity Ranking")
    print("   Setting up budget constraint...")
    await send_query("I'm on a tight budget, under 50 euros please", session_id="budget_user_1")
    
    print("   Searching for generic item 't-shirt'...")
    data = await send_query("show me t-shirts", session_id="budget_user_1")
    items = data.get('items', [])
    print(f"📦 Ranked Items for Budget User:")
    for item in items[:5]:
        print(f"   - €{item.get('price')} {item.get('title')}")
        
    # Confirm cheapest are at top (Soft Boost)

if __name__ == "__main__":
    asyncio.run(main())
