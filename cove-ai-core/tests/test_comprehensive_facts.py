"""
Comprehensive Fact Injection Test - 15 Turn Conversation

Tests realistic conversation flow with:
- Product queries (hoodies, bombers, tees)
- Outfit building
- Preference statements
- Context switching
- Vague references
"""

import asyncio
import httpx
import json
from typing import Dict, Any

SESSION_ID = "comprehensive_test_final"
AI_CORE_URL = "http://localhost:8000"
DJANGO_URL = "http://localhost:8001"


async def send_message(turn: int, message: str) -> Dict[str, Any]:
    """Send message and return response"""
    print(f"\n{'='*80}")
    print(f"TURN {turn}: {message}")
    print(f"{'='*80}")
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{AI_CORE_URL}/ai/agent/query",
            json={
                "message": message,
                "guestSessionId": SESSION_ID,
                "historyScope": "user"
            }
        )
        
        if response.status_code != 200:
            print(f"❌ Error: {response.status_code}")
            return {}
        
        data = response.json()
        answer = data.get('answer', 'No answer')
        print(f"✅ AI: {answer[:150]}...")
        
        # Show items if any
        items = data.get('items', [])
        if items:
            print(f"📦 Showed {len(items)} items: {', '.join([i['title'] for i in items[:3]])}...")
        
        return data


async def check_facts() -> Dict[str, Any]:
    """Check what facts are stored in database"""
    async with httpx.AsyncClient(timeout=5.0) as client:
        response = await client.get(
            f"{DJANGO_URL}/ai_profiles/session/facts/get/",
            params={"guest_session_id": SESSION_ID}
        )
        
        if response.status_code != 200:
            return {}
        
        return response.json().get("facts", {})


async def verify_facts(turn: int, expected_products: int = None, expected_prefs: list = None):
    """Verify facts after a turn"""
    await asyncio.sleep(2)  # Wait for background extraction
    
    facts = await check_facts()
    
    if not facts:
        print(f"⚠️  No facts stored yet")
        return
    
    # Check product focus
    product_focus = facts.get("product_focus", {})
    current_products = product_focus.get("current_products", [])
    product_history = product_focus.get("product_history", [])
    
    print(f"\n📊 FACTS CHECK (Turn {turn}):")
    print(f"  Current products: {len(current_products)}")
    if current_products:
        print(f"    → {', '.join([p['name'] for p in current_products[:3]])}...")
    
    print(f"  Product history: {len(product_history)} items")
    
    # Check preferences
    prefs = facts.get("user_preferences", {})
    if prefs:
        print(f"  Preferences: {list(prefs.keys())}")
    
    # Check active context
    active = facts.get("active_context", {})
    if active:
        print(f"  Active context: {active.get('current_feature', 'N/A')}")
    
    # Verify expectations
    if expected_products is not None:
        if len(current_products) >= expected_products:
            print(f"  ✅ Expected {expected_products}+ products, got {len(current_products)}")
        else:
            print(f"  ⚠️  Expected {expected_products}+ products, got {len(current_products)}")


async def run_comprehensive_test():
    """Run 15-turn comprehensive conversation test"""
    
    print("\n" + "🧪 " * 40)
    print("COMPREHENSIVE FACT INJECTION TEST - 15 TURNS")
    print("🧪 " * 40)
    
    # TURN 1: Initial product query with preferences
    await send_message(1, "I prefer size M and I'm looking for hoodies under €100")
    await verify_facts(1, expected_products=1)
    
    # TURN 2: Ask about specific product
    await send_message(2, "What's the material of the first one?")
    await verify_facts(2)
    
    # TURN 3: State style preferences
    await send_message(3, "I like minimalist style and dark colors")
    await verify_facts(3)
    
    # TURN 4: Switch to different product
    await send_message(4, "Actually, show me bombers instead")
    await verify_facts(4, expected_products=1)
    
    # TURN 5: Vague reference (should use context)
    await send_message(5, "What sizes do you have for these?")
    await verify_facts(5)
    
    # TURN 6: Add another preference
    await send_message(6, "I prefer premium quality")
    await verify_facts(6)
    
    # TURN 7: Ask for outfit
    await send_message(7, "Can you suggest a complete outfit with a bomber?")
    await verify_facts(7)
    
    # TURN 8: Switch to tees
    await send_message(8, "Show me some tees to go with it")
    await verify_facts(8, expected_products=1)
    
    # TURN 9: Vague reference to previous items
    await send_message(9, "Do these come in black?")
    await verify_facts(9)
    
    # TURN 10: Budget constraint
    await send_message(10, "I want to keep it under €150 total")
    await verify_facts(10)
    
    # TURN 11: Back to hoodies (context switch)
    await send_message(11, "Actually, let's go back to hoodies")
    await verify_facts(11, expected_products=1)
    
    # TURN 12: Specific question about previous product
    await send_message(12, "Is the COVE hoodie available in size M?")
    await verify_facts(12)
    
    # TURN 13: Ask about fit
    await send_message(13, "Does it fit true to size?")
    await verify_facts(13)
    
    # TURN 14: Multiple products
    await send_message(14, "Show me both hoodies and bombers in my size")
    await verify_facts(14, expected_products=2)
    
    # TURN 15: Final vague reference (ultimate context test)
    await send_message(15, "Which one would you recommend for everyday wear?")
    await verify_facts(15)
    
    # FINAL VERIFICATION
    print("\n" + "=" * 80)
    print("FINAL FACT VERIFICATION")
    print("=" * 80)
    
    facts = await check_facts()
    
    if not facts:
        print("❌ TEST FAILED: No facts stored")
        return False
    
    # Detailed fact analysis
    product_focus = facts.get("product_focus", {})
    current_products = product_focus.get("current_products", [])
    product_history = product_focus.get("product_history", [])
    prefs = facts.get("user_preferences", {})
    decisions = facts.get("decisions_made", [])
    
    print(f"\n📊 FINAL FACTS:")
    print(f"  Current products: {len(current_products)}")
    print(f"  Product history: {len(product_history)}")
    print(f"  User preferences: {len(prefs)} keys")
    print(f"  Decisions made: {len(decisions)}")
    
    # Success criteria
    checks = []
    
    # Check 1: Should have current products
    if len(current_products) > 0:
        print(f"✅ Has current products tracked")
        checks.append(True)
    else:
        print(f"❌ No current products")
        checks.append(False)
    
    # Check 2: Should have product history
    if len(product_history) > 0:
        print(f"✅ Has product history ({len(product_history)} items)")
        checks.append(True)
    else:
        print(f"⚠️  No product history")
        checks.append(False)
    
    # Check 3: Should have preferences
    if len(prefs) > 0:
        print(f"✅ Has user preferences: {list(prefs.keys())}")
        checks.append(True)
    else:
        print(f"⚠️  No preferences stored")
        checks.append(False)
    
    # Check 4: Active context should exist
    if "active_context" in facts:
        print(f"✅ Has active context")
        checks.append(True)
    else:
        print(f"⚠️  No active context")
        checks.append(False)
    
    success_rate = sum(checks) / len(checks) * 100
    print(f"\n📈 Success Rate: {success_rate:.0f}%")
    
    if success_rate >= 75:
        print("\n✅ TEST PASSED: Fact injection working correctly!")
        return True
    else:
        print("\n❌ TEST FAILED: Fact quality issues")
        return False


if __name__ == "__main__":
    success = asyncio.run(run_comprehensive_test())
    exit(0 if success else 1)
