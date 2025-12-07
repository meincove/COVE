#!/usr/bin/env python
"""
Test script for Week 4 Phase 4 agent commerce intents.

Tests:
1. Intent classification for checkout, order_query, order_email
2. Order history query (should return empty list or orders)
3. Email resend (should handle no orders gracefully)
4. Checkout intent (will fail without cart, but should recognize intent)
"""

import asyncio
import httpx
import json


BASE_URL = "http://127.0.0.1:8000"


async def test_intent_classification():
    """Test that new intents are recognized."""
    print("\n" + "="*60)
    print("TEST 1: Intent Classification")
    print("="*60)
    
    test_cases = [
        ("checkout now", "checkout_start"),
        ("proceed to payment", "checkout_start"),
        ("show my orders", "order_query"),
        ("order history", "order_query"),
        ("resend confirmation", "order_email"),
        ("send me email receipt", "order_email"),
    ]
    
    async with httpx.AsyncClient(timeout=10) as client:
        for message, expected_intent in test_cases:
            try:
                response = await client.post(
                    f"{BASE_URL}/ai/agent/query",
                    json={
                        "message": message,
                        "clerkUserId": "test_user_phase4",
                        "email": "test@example.com"
                    }
                )
                
                if response.status_code == 200:
                    data = response.json()
                    debug = data.get("debug_plan", {})
                    detected_intent = debug.get("intent_kind", "unknown")
                    
                    status = "✅" if detected_intent == expected_intent else "❌"
                    print(f"{status} '{message}' → {detected_intent} (expected: {expected_intent})")
                else:
                    print(f"❌ '{message}' → HTTP {response.status_code}")
            except Exception as e:
                print(f"❌ '{message}' → ERROR: {e}")


async def test_order_history():
    """Test order history query with no orders."""
    print("\n" + "="*60)
    print("TEST 2: Order History Query")
    print("="*60)
    
    async with httpx.AsyncClient(timeout=10) as client:
        try:
            response = await client.post(
                f"{BASE_URL}/ai/agent/query",
                json={
                    "message": "show my orders",
                    "clerkUserId": "test_user_phase4",
                    "email": "test@example.com"
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                answer = data.get("answer", "")
                debug = data.get("debug_plan", {})
                
                print(f"✅ Response: {answer}")
                print(f"   Debug: {json.dumps(debug, indent=2)}")
            else:
                print(f"❌ HTTP {response.status_code}: {response.text}")
        except Exception as e:
            print(f"❌ ERROR: {e}")


async def test_email_resend():
    """Test email resend with no orders (should handle gracefully)."""
    print("\n" + "="*60)
    print("TEST 3: Email Resend (No Orders)")
    print("="*60)
    
    async with httpx.AsyncClient(timeout=10) as client:
        try:
            response = await client.post(
                f"{BASE_URL}/ai/agent/query",
                json={
                    "message": "resend my confirmation email",
                    "clerkUserId": "test_user_phase4",
                    "email": "test@example.com"
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                answer = data.get("answer", "")
                debug = data.get("debug_plan", {})
                
                print(f"✅ Response: {answer}")
                print(f"   Expected: 'No orders found...' message")
                print(f"   Debug: {json.dumps(debug, indent=2)}")
            else:
                print(f"❌ HTTP {response.status_code}: {response.text}")
        except Exception as e:
            print(f"❌ ERROR: {e}")


async def test_checkout_intent():
    """Test checkout intent (will fail without cart items, but should recognize)."""
    print("\n" + "="*60)
    print("TEST 4: Checkout Intent (Empty Cart Expected)")
    print("="*60)
    
    async with httpx.AsyncClient(timeout=10) as client:
        try:
            response = await client.post(
                f"{BASE_URL}/ai/agent/query",
                json={
                    "message": "I want to checkout",
                    "clerkUserId": "test_user_phase4",
                    "email": "test@example.com"
                }
            )
            
            if response.status_code == 200:
                data = response.json()
                answer = data.get("answer", "")
                debug = data.get("debug_plan", {})
                intent = debug.get("intent_kind", "unknown")
                
                if intent == "checkout_start":
                    print(f"✅ Intent recognized: {intent}")
                    print(f"   Response: {answer}")
                    print(f"   Expected: Error about empty cart or checkout issue")
                else:
                    print(f"❌ Wrong intent: {intent} (expected: checkout_start)")
                
                print(f"   Debug: {json.dumps(debug, indent=2)}")
            else:
                print(f"❌ HTTP {response.status_code}: {response.text}")
        except Exception as e:
            print(f"❌ ERROR: {e}")


async def test_existing_intents_not_broken():
    """Verify existing intents still work."""
    print("\n" + "="*60)
    print("TEST 5: Existing Intents (Regression Check)")
    print("="*60)
    
    test_cases = [
        ("black hoodie size M", "discover"),
        ("what size should I get", "size_fit"),
        ("what is your return policy", "policy"),
    ]
    
    async with httpx.AsyncClient(timeout=10) as client:
        for message, expected_intent in test_cases:
            try:
                response = await client.post(
                    f"{BASE_URL}/ai/agent/query",
                    json={
                        "message": message,
                        "clerkUserId": "test_user_phase4"
                    }
                )
                
                if response.status_code == 200:
                    data = response.json()
                    debug = data.get("debug_plan", {})
                    detected_intent = debug.get("intent_kind", "unknown")
                    
                    status = "✅" if detected_intent == expected_intent else "❌"
                    print(f"{status} '{message}' → {detected_intent} (expected: {expected_intent})")
                else:
                    print(f"❌ '{message}' → HTTP {response.status_code}")
            except Exception as e:
                print(f"❌ '{message}' → ERROR: {e}")


async def main():
    """Run all tests."""
    print("\n" + "🧪"*30)
    print("Week 4 - Phase 4: Agent Commerce Intents Test Suite")
    print("🧪"*30)
    
    await test_intent_classification()
    await test_order_history()
    await test_email_resend()
    await test_checkout_intent()
    await test_existing_intents_not_broken()
    
    print("\n" + "="*60)
    print("✅ All tests complete!")
    print("="*60)


if __name__ == "__main__":
    asyncio.run(main())
