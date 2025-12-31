"""
Test if enhanced fact extraction captures rich product details
"""

import asyncio
import httpx

SESSION_ID = "rich_facts_test"
AI_CORE_URL = "http://localhost:8000"
DJANGO_URL = "http://localhost:8001"

async def test_rich_fact_extraction():
    print("="*80)
    print("TESTING: Rich Product Detail Extraction")
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
    
    # Wait for fact extraction
    print("\n⏳ Waiting 5 seconds for fact extraction...")
    await asyncio.sleep(5)
    
    # Check facts
    print("\n" + "="*80)
    print("CHECKING EXTRACTED FACTS")
    print("="*80)
    
    async with httpx.AsyncClient(timeout=5.0) as client:
        r = await client.get(
            f"{DJANGO_URL}/ai_profiles/session/facts/get/",
            params={"guest_session_id": SESSION_ID}
        )
        facts = r.json().get("facts", {})
        products = facts.get("product_focus", {}).get("current_products", [])
        
        if not products:
            print("❌ FAIL: No products extracted")
            return False
        
        print(f"\n✅ Extracted {len(products)} products")
        
        # Check first product details
        product = products[0]
        details = product.get("full_details", {})
        
        print(f"\nProduct 1: {product.get('name')}")
        print(f"Details extracted:")
        
        checks = []
        
        # Check for rich details
        if "price" in details:
            print(f"  ✅ price: {details['price']}")
            checks.append(True)
        else:
            print(f"  ❌ price: MISSING")
            checks.append(False)
        
        if "material" in details:
            print(f"  ✅ material: {details['material']}")
            checks.append(True)
        else:
            print(f"  ❌ material: MISSING")
            checks.append(False)
        
        if "fit" in details:
            print(f"  ✅ fit: {details['fit']}")
            checks.append(True)
        else:
            print(f"  ❌ fit: MISSING")
            checks.append(False)
        
        if "fabric" in details:
            print(f"  ✅ fabric: {details['fabric']}")
            checks.append(True)
        else:
            print(f"  ❌ fabric: MISSING")
            checks.append(False)
        
        if "style" in details:
            print(f"  ✅ style: {details['style']}")
            checks.append(True)
        else:
            print(f"  ❌ style: MISSING")
            checks.append(False)
        
        success_rate = sum(checks) / len(checks) * 100
        print(f"\n📊 Detail Extraction Rate: {success_rate:.0f}%")
        
        if success_rate >= 60:
            print("\n✅ SUCCESS: Rich details being extracted!")
            return True
        else:
            print("\n❌ FAIL: Not enough details extracted")
            return False

if __name__ == "__main__":
    success = asyncio.run(test_rich_fact_extraction())
    exit(0 if success else 1)
