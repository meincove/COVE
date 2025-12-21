
import asyncio
import json
import httpx
import sys

BASE_URL = "http://localhost:8000"

async def test_legacy_flow():
    """
    Test legacy features that shouldn't be hijacked by the complex Orchestrator:
    1. Simple Product Discovery ("Show me hoodies")
    2. Cart Actions ("Add to cart")
    3. Checkout ("Buy now")
    """
    print("🕵️ TESTING LEGACY FEATURES")
    print("="*60)
    
    # 1. Discovery
    print("\n1. Testing Discovery ('Show me red hoodies')...")
    async with httpx.AsyncClient(timeout=30.0) as client:
        payload = {
            "message": "show me red hoodies",
            "clerkUserId": "test_legacy_user",
            "userPreferences": {}
        }
        try:
            # We use the NON-streaming endpoint for easier assertion parsing, 
            # or we can use streaming and look for specific events.
            # Let's use streaming since that's what we just fixed.
            async with client.stream("POST", f"{BASE_URL}/ai/agent/query-stream", json=payload) as response:
                if response.status_code != 200:
                    print(f"❌ API Error: {response.status_code}")
                    print(await response.aread())
                    return
                
                found_items = False
                async for line in response.aiter_lines():
                    if 'event: items:batch' in line:
                        found_items = True
                        print("   ✅ Received Items Batch (Discovery Working)")
                    if 'event: done' in line:
                        print("   ✅ Stream Finished")
                
                if not found_items:
                    print("   ❌ FAILED: No items returned for simple discovery.")
                    
        except Exception as e:
            print(f"   ❌ Exception: {e}")

    # 2. Add to Cart (requires context usually, but let's try direct intent)
    print("\n2. Testing Cart ('Add first item to cart')...")
    async with httpx.AsyncClient(timeout=30.0) as client:
        payload = {
            "message": "add the first item to my cart",
            "clerkUserId": "test_legacy_user",
             # Mock context of previous items if server is stateless, 
             # but server relies on implicit session or might fail if no history.
             # We'll just check if it routes to cart_proposal or answer.
        }
        try:
            async with client.stream("POST", f"{BASE_URL}/ai/agent/query-stream", json=payload) as response:
                is_cart = False
                async for line in response.aiter_lines():
                    if 'event: cart_proposal' in line:
                        is_cart = True
                        print("   ✅ Received Cart Proposal event")
                
                if not is_cart:
                    print("   ⚠️ WARNING: Did not receive 'cart_proposal'. Might need conversation history.")

        except Exception as e:
            print(f"   ❌ Exception: {e}")

    # 3. Checkout
    print("\n3. Testing Checkout ('I want to checkout')...")
    async with httpx.AsyncClient(timeout=30.0) as client:
        payload = {
            "message": "I want to checkout",
            "clerkUserId": "test_legacy_user"
        }
        try:
            async with client.stream("POST", f"{BASE_URL}/ai/agent/query-stream", json=payload) as response:
                is_checkout = False
                async for line in response.aiter_lines():
                    if 'event: checkout' in line:
                        is_checkout = True
                        print("   ✅ Received Checkout event")
                
                if not is_checkout:
                    print("   ❌ FAILED: Did not receive 'checkout' event.")

        except Exception as e:
            print(f"   ❌ Exception: {e}")

if __name__ == "__main__":
    asyncio.run(test_legacy_flow())
