"""
Debug script to see exactly what's being passed to the fact extractor
"""

import asyncio
import httpx
import json

SESSION_ID = "debug_fact_extraction"
AI_CORE_URL = "http://localhost:8000"
DJANGO_URL = "http://localhost:8001"

async def debug_fact_extraction():
    print("="*80)
    print("DEBUG: What's Being Passed to Fact Extractor?")
    print("="*80)
    
    # Turn 1: Show hoodies
    print("\nTURN 1: show me hoodies")
    async with httpx.AsyncClient(timeout=30.0) as client:
        r1 = await client.post(
            f"{AI_CORE_URL}/ai/agent/query",
            json={"message": "show me hoodies", "guestSessionId": SESSION_ID}
        )
        data = r1.json()
        items = data.get('items', [])
        print(f"✅ Showed {len(items)} hoodies")
        
        if items:
            print("\nFirst item returned by API:")
            item = items[0]
            print(f"  Title: {item.get('title')}")
            print(f"  Material: {item.get('material')}")
            print(f"  Fit: {item.get('fit')}")
            print(f"  Fabric: {item.get('fabric')}")
            print(f"  Style: {item.get('style')}")
            print(f"  Care: {item.get('care')}")
    
    # Wait for facts
    print("\n⏳ Waiting 5 seconds for fact extraction...")
    await asyncio.sleep(5)
    
    # Check facts
    print("\n" + "="*80)
    print("FACTS EXTRACTED")
    print("="*80)
    
    async with httpx.AsyncClient(timeout=5.0) as client:
        r = await client.get(
            f"{DJANGO_URL}/ai_profiles/session/facts/get/",
            params={"guest_session_id": SESSION_ID}
        )
        facts = r.json().get("facts", {})
        products = facts.get("product_focus", {}).get("current_products", [])
        
        if products:
            print(f"\nExtracted {len(products)} products")
            product = products[0]
            details = product.get("full_details", {})
            
            print(f"\nFirst product details:")
            print(f"  Name: {product.get('name')}")
            print(f"  Material: {details.get('material')}")
            print(f"  Fit: {details.get('fit')}")
            print(f"  Fabric: {details.get('fabric')}")
            print(f"  Style: {details.get('style')}")
            print(f"  Care: {details.get('care')}")
            print(f"  Price: {details.get('price')}")
        else:
            print("No products extracted!")

if __name__ == "__main__":
    asyncio.run(debug_fact_extraction())
