"""
Quick test to verify fact injection works across multiple turns
"""

import asyncio
import httpx

async def test_fact_injection():
    session_id = "fact_injection_final_test"
    
    print("=" * 80)
    print("TURN 1: Show me hoodies")
    print("=" * 80)
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        r1 = await client.post(
            "http://localhost:8000/ai/agent/query",
            json={"message": "show me hoodies", "guestSessionId": session_id}
        )
        print(f"Response: {r1.json()['answer'][:100]}...")
    
    print("\n⏳ Waiting 3 seconds for fact extraction/storage...")
    await asyncio.sleep(3)
    
    # Check facts in database
    async with httpx.AsyncClient(timeout=5.0) as client:
        r = await client.get(
            f"http://localhost:8001/ai_profiles/session/facts/get/",
            params={"guest_session_id": session_id}
        )
        facts = r.json().get("facts", {})
        product_count = len(facts.get("product_focus", {}).get("current_products", []))
        print(f"✅ Facts stored: {product_count} products in database")
    
    print("\n" + "=" * 80)
    print("TURN 2: What colors are available? (should use stored product context)")
    print("=" * 80)
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        r2 = await client.post(
            "http://localhost:8000/ai/agent/query",
            json={"message": "what colors are available?", "guestSessionId": session_id}
        )
        answer = r2.json()['answer']
        print(f"Response: {answer}")
        
        # Check if response references the hoodies from turn 1
        if "hoodie" in answer.lower() or "cove" in answer.lower():
            print("\n✅ SUCCESS: AI used stored product context!")
        else:
            print("\n⚠️  AI response doesn't clearly reference stored products")
    
    print("\n" + "=" * 80)
    print("FINAL CHECK: Verify facts were injected into LLM")
    print("=" * 80)
    print("Check /tmp/ai_core.log for '📋 CONVERSATION CONTEXT' in system prompt")

if __name__ == "__main__":
    asyncio.run(test_fact_injection())
