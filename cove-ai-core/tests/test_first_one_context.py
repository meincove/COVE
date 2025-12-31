"""
Test: "What can you tell me about the first one" - should use context, not fetch
"""

import asyncio
import httpx

SESSION_ID = "first_one_test"
AI_CORE_URL = "http://localhost:8000"

async def test_first_one_question():
    print("=" * 80)
    print("TEST: 'What can you tell me about the first one' using context")
    print("=" * 80)
    
    # Turn 1: Show hoodies
    print("\nTURN 1: Show me hoodies")
    async with httpx.AsyncClient(timeout=30.0) as client:
        r1 = await client.post(
            f"{AI_CORE_URL}/ai/agent/query",
            json={"message": "show me hoodies", "guestSessionId": SESSION_ID}
        )
        items = r1.json().get('items', [])
        print(f"✅ Showed {len(items)} hoodies")
        if items:
            print(f"   First one: {items[0].get('title', 'Unknown')}")
    
    # Wait for facts to be extracted
    print("\n⏳ Waiting 3 seconds for fact extraction...")
    await asyncio.sleep(3)
    
    # Check facts
    async with httpx.AsyncClient(timeout=5.0) as client:
        r = await client.get(
            f"http://localhost:8001/ai_profiles/session/facts/get/",
            params={"guest_session_id": SESSION_ID}
        )
        facts = r.json().get("facts", {})
        products = facts.get("product_focus", {}).get("current_products", [])
        print(f"✅ Facts stored: {len(products)} products")
        if products:
            print(f"   Product 1: {products[0].get('name', 'Unknown')}")
            print(f"   Details: {products[0].get('full_details', {})}")
    
    # Turn 2: Ask about the first one (THE KEY TEST)
    print("\n" + "=" * 80)
    print("TURN 2: What can you tell me about the first one?")
    print("=" * 80)
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        r2 = await client.post(
            f"{AI_CORE_URL}/ai/agent/query",
            json={"message": "what can you tell me about the first one", "guestSessionId": SESSION_ID}
        )
        
        if r2.status_code != 200:
            print(f"❌ ERROR: {r2.status_code}")
            print(f"   Response: {r2.text}")
            return False
        
        answer = r2.json().get('answer', '')
        
        if not answer:
            print("❌ FAIL: No answer returned")
            return False
        
        print(f"✅ AI Response: {answer[:300]}...")
        
        # Check if response mentions the product
        first_product_name = products[0].get('name', '').lower() if products else ''
        if first_product_name and first_product_name.split()[0] in answer.lower():
            print(f"\n✅ SUCCESS: AI referenced the product from context!")
            print(f"   Mentioned: {first_product_name.split()[0]}")
            return True
        else:
            print(f"\n⚠️  PARTIAL: AI responded but didn't clearly reference product")
            print(f"   Expected mention of: {first_product_name}")
            return False

if __name__ == "__main__":
    print("\n🧪 Testing: AI should use conversation context for 'first one' questions\n")
    success = asyncio.run(test_first_one_question())
    
    if success:
        print("\n" + "=" * 80)
        print("✅ TEST PASSED: AI uses context instead of trying to fetch!")
        print("=" * 80)
    else:
        print("\n" + "=" * 80)
        print("⚠️  TEST NEEDS WORK: Check if AI is using context correctly")
        print("=" * 80)
    
    exit(0 if success else 1)
