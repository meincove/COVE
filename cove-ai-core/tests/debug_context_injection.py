"""
Debug script to see exactly what's being sent to the LLM
"""

import asyncio
import httpx
import json

SESSION_ID = "debug_context"
AI_CORE_URL = "http://localhost:8000"
DJANGO_URL = "http://localhost:8001"

async def debug_context_injection():
    print("="*80)
    print("DEBUG: What's Actually Being Sent to the LLM?")
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
        if items:
            print(f"   First: {items[0].get('title')}")
            print(f"   Second: {items[1].get('title') if len(items) > 1 else 'N/A'}")
    
    # Wait for facts
    print("\n⏳ Waiting 5 seconds for fact extraction...")
    await asyncio.sleep(5)
    
    # Check what facts were stored
    print("\n" + "="*80)
    print("FACTS STORED IN DATABASE")
    print("="*80)
    
    async with httpx.AsyncClient(timeout=5.0) as client:
        r = await client.get(
            f"{DJANGO_URL}/ai_profiles/session/facts/get/",
            params={"guest_session_id": SESSION_ID}
        )
        facts = r.json().get("facts", {})
        
        print(json.dumps(facts, indent=2))
        
        # Format facts as they would be sent to LLM
        from app.services.fact_extractor import get_fact_extractor
        extractor = get_fact_extractor()
        context_str = extractor.get_context_for_llm(facts)
        
        print("\n" + "="*80)
        print("CONTEXT STRING SENT TO LLM")
        print("="*80)
        print(context_str)
        print("="*80)
    
    # Turn 2: Ask about second hoodie
    print("\nTURN 2: what about the second hoodie you showed?")
    async with httpx.AsyncClient(timeout=30.0) as client:
        r2 = await client.post(
            f"{AI_CORE_URL}/ai/agent/query",
            json={"message": "what about the second hoodie you showed?", "guestSessionId": SESSION_ID}
        )
        
        data = r2.json()
        answer = data.get('answer', '')
        items = data.get('items', [])
        
        print(f"\nAI Response: {answer[:300]}...")
        print(f"Items shown: {len(items)}")
        
        if len(items) > 0:
            print("\n❌ PROBLEM: AI showed new products instead of answering from context")
            print("This means either:")
            print("  1. Intent classification routed to wrong branch")
            print("  2. Context isn't being used even though it's injected")
            print("  3. Prompt isn't strong enough")
        else:
            print("\n✅ GOOD: AI answered from context without showing new products")

if __name__ == "__main__":
    asyncio.run(debug_context_injection())
