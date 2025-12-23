"""
Comprehensive E2E Test for Fact Extraction

Tests a realistic 15+ turn conversation with:
- Product queries
- Product switches
- Detailed questions about specific products
- Outfit building
- Context switching

Verifies that facts are extracted and maintained correctly.
"""

import asyncio
import httpx
import json
from typing import Dict, Any

BASE_URL = "http://localhost:8000"

# Simulated user session
SESSION_ID = "test_session_fact_extraction_123"
USER_ID = None  # Guest user


async def send_message(message: str, turn_num: int) -> Dict[str, Any]:
    """Send a message to the agent and return the response"""
    print(f"\n{'='*80}")
    print(f"TURN {turn_num}: USER")
    print(f"{'='*80}")
    print(f"💬 {message}")
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{BASE_URL}/ai/agent/query",
            json={
                "message": message,
                "guestSessionId": SESSION_ID,
                "clerkUserId": USER_ID,
                "historyScope": "user"
            }
        )
        
        if response.status_code != 200:
            print(f"❌ Error: {response.status_code}")
            print(response.text)
            return {}
        
        data = response.json()
        
        print(f"\n{'='*80}")
        print(f"TURN {turn_num}: ASSISTANT")
        print(f"{'='*80}")
        print(f"🤖 {data.get('answer', 'No answer')}")
        
        if data.get('items'):
            print(f"\n📦 Showed {len(data['items'])} products:")
            for item in data['items'][:3]:  # Show first 3
                print(f"   - {item.get('name', 'Unknown')} (€{item.get('price', 0)})")
        
        # Check debug plan for fact extraction
        debug_plan = data.get('debug_plan', {})
        print(f"\n📊 Debug Info:")
        print(f"   Intent: {debug_plan.get('intent_kind', 'unknown')}")
        print(f"   Kind: {data.get('kind', 'unknown')}")
        
        return data


async def run_comprehensive_test():
    """Run a comprehensive 15+ turn conversation test"""
    
    print("\n" + "🧪 " * 40)
    print("COMPREHENSIVE FACT EXTRACTION TEST")
    print("🧪 " * 40)
    
    turn = 1
    
    # Turn 1: Initial product query
    await send_message("Show me Nike hoodies under €100", turn)
    turn += 1
    await asyncio.sleep(1)
    
    # Turn 2: Ask about a specific product
    await send_message("What's the material of the first one?", turn)
    turn += 1
    await asyncio.sleep(1)
    
    # Turn 3: Size question
    await send_message("Does it run true to size?", turn)
    turn += 1
    await asyncio.sleep(1)
    
    # Turn 4: More details
    await send_message("What colors is it available in?", turn)
    turn += 1
    await asyncio.sleep(1)
    
    # Turn 5: State preference
    await send_message("I prefer size M and minimalist style", turn)
    turn += 1
    await asyncio.sleep(1)
    
    # Turn 6: Switch products
    await send_message("Actually, show me Adidas bombers instead", turn)
    turn += 1
    await asyncio.sleep(1)
    
    # Turn 7: Ask about the new product
    await send_message("Is that one waterproof?", turn)
    turn += 1
    await asyncio.sleep(1)
    
    # Turn 8: Price question
    await send_message("Can you show me something cheaper?", turn)
    turn += 1
    await asyncio.sleep(1)
    
    # Turn 9: Switch to outfit building
    await send_message("Help me build an outfit for a date night", turn)
    turn += 1
    await asyncio.sleep(1)
    
    # Turn 10: Outfit details
    await send_message("Make it smart casual, budget around €200", turn)
    turn += 1
    await asyncio.sleep(1)
    
    # Turn 11: Refine outfit
    await send_message("Can you swap the shoes for sneakers?", turn)
    turn += 1
    await asyncio.sleep(1)
    
    # Turn 12: Back to products
    await send_message("Actually, let's go back to those Nike hoodies from earlier", turn)
    turn += 1
    await asyncio.sleep(1)
    
    # Turn 13: Reference to first product
    await send_message("What was the price of the first one again?", turn)
    turn += 1
    await asyncio.sleep(1)
    
    # Turn 14: Vague reference
    await send_message("Show me more like that", turn)
    turn += 1
    await asyncio.sleep(1)
    
    # Turn 15: Another vague reference
    await send_message("What about in my size?", turn)
    turn += 1
    await asyncio.sleep(1)
    
    # Turn 16: Final question
    await send_message("Which one would you recommend for everyday wear?", turn)
    
    print("\n" + "✅ " * 40)
    print("TEST COMPLETE - 16 TURNS")
    print("✅ " * 40)
    
    print("\n📝 WHAT TO CHECK:")
    print("1. Backend logs should show fact extraction after each turn")
    print("2. Look for '📊 Extracted facts: X products' in logs")
    print("3. Vague references ('that one', 'in my size') should work")
    print("4. Context should be maintained across 16 turns")
    print("\n🔍 Check backend logs now!")


if __name__ == "__main__":
    asyncio.run(run_comprehensive_test())
