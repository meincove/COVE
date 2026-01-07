#!/usr/bin/env python3
"""
Test User Intelligence Layer + Gender Filtering + Recent Changes

Tests:
1. Gender filtering and session persistence
2. Entity accumulation across queries
3. Verifier receiving user profile

Run with: PYTHONPATH=. python tests/test_user_intelligence.py
"""

import asyncio
import httpx
import json
from typing import Dict, Any

BASE_URL = "http://localhost:8000"
SESSION_ID = "test_intelligence_session_123"


async def send_query(message: str, turn: int) -> Dict[str, Any]:
    """Send a query and show response."""
    print(f"\n{'='*60}")
    print(f"🔵 TURN {turn}: {message}")
    print(f"{'='*60}")
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{BASE_URL}/ai/agent/query",
            json={
                "message": message,
                "guestSessionId": SESSION_ID,
                "clerkUserId": None,
                "historyScope": "user"
            }
        )
        
        if response.status_code != 200:
            print(f"❌ Error: {response.status_code}")
            return {}
        
        data = response.json()
        
        print(f"✅ Kind: {data.get('kind')}")
        print(f"📝 Answer: {data.get('answer', 'No answer')[:150]}...")
        
        items = data.get('items', [])
        if items:
            print(f"📦 Items: {len(items)}")
            for i, item in enumerate(items[:3]):
                gender = item.get('gender', 'N/A')
                print(f"   {i+1}. {item.get('title')} - €{item.get('price')} - Gender: {gender}")
        
        suggestions = data.get('suggestions', [])
        if suggestions:
            print(f"💡 Suggestions: {suggestions}")
        
        return data


async def main():
    print("\n" + "🧪 " * 20)
    print("USER INTELLIGENCE LAYER TEST")
    print("🧪 " * 20)
    print("\nThis tests:")
    print("1. Gender filtering (mens/womens)")
    print("2. Session entity accumulation")
    print("3. Profile-aware Verifier suggestions")
    print("\n⚠️  Watch the backend logs for:")
    print("   - 👤 [GENDER] Stored gender preference...")
    print("   - 🧠 [INTELLIGENCE] Accumulated profile: {...}")
    
    input("\nPress ENTER to start (make sure uvicorn is running)...")
    
    turn = 1
    
    # Turn 1: Specify gender + size
    await send_query("show me mens hoodies in size XL", turn)
    turn += 1
    await asyncio.sleep(1)
    
    # Turn 2: Follow-up without gender (should use stored gender)
    await send_query("what about jackets?", turn)
    turn += 1
    await asyncio.sleep(1)
    
    # Turn 3: Price filter (should accumulate)
    await send_query("show me something under 80 euros", turn)
    turn += 1
    await asyncio.sleep(1)
    
    # Turn 4: Color preference
    await send_query("do you have it in black?", turn)
    turn += 1
    await asyncio.sleep(1)
    
    # Turn 5: Check if profile is used
    await send_query("show me more options", turn)
    
    print("\n" + "="*60)
    print("✅ TEST COMPLETE")
    print("="*60)
    print("\n📊 CHECK BACKEND LOGS FOR:")
    print("1. 👤 [GENDER] Stored gender preference for session: male")
    print("2. 👤 [GENDER] Using stored session gender: male")
    print("3. 🧠 [INTELLIGENCE] Accumulated profile: {preferred_gender: male, ...}")
    print("\n💡 The Verifier should now suggest profile-aware options!")


if __name__ == "__main__":
    asyncio.run(main())
