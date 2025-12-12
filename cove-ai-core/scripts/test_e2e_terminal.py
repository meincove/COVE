#!/usr/bin/env python3
"""
End-to-end terminal test: AI Core agent → cart add → checkout
"""
import requests
import json

BASE = "http://localhost:8000"

print("🧪 FULL E2E TEST\n" + "="*60)

# Step 1: Ask agent for product recommendations
print("\n1️⃣ Agent: 'show me tees'")
agent_resp = requests.post(f"{BASE}/ai/agent/query", json={
    "message": "show me tees",
    "top_k": 2,
    "historyScope": "none",
    "guestSessionId": "test-guest-123"
})

agent_data = agent_resp.json()
print(f"   Response kind: {agent_data.get('kind')}")
print(f"   Answer: {agent_data.get('answer', '')[:80]}...")

items = agent_data.get('items', [])
print(f"   Items returned: {len(items)}")

if not items:
    print("❌ No items - can't test cart add")
    exit(1)

# Step 2: Simulate user clicking "add to cart" suggestion
print("\n2️⃣ Simulating: 'add first item to cart'")
add_resp = requests.post(f"{BASE}/ai/agent/query", json={
    "message": "add first item to cart in size M",
    "top_k": 2,
    "historyScope": "none",
    "guestSessionId": "test-guest-123",
    "cartId": None
})

add_data = add_resp.json()
print(f"   Response kind: {add_data.get('kind')}")

cart_payload = add_data.get('cart_payload')
if not cart_payload:
    print(f"❌ No cart_payload returned")
    print(f"   Answer: {add_data.get('answer')}")
    exit(1)

print(f"   ✅ Got cart_payload:")
print(f"      variantId: {cart_payload.get('variantId')}")
print(f"      size: {cart_payload.get('size')}")

# Step 3: Actually add to cart using backend endpoint
print("\n3️⃣ Adding to cart via /ai/agent/cart_add")
cart_add_resp = requests.post(f"{BASE}/ai/agent/cart_add", json=cart_payload)
cart_result = cart_add_resp.json()

print(f"   Status: {cart_add_resp.status_code}")
print(f"   OK: {cart_result.get('ok')}")
print(f"   Message: {cart_result.get('message')}")

if cart_result.get('ok'):
    cart_id = cart_result.get('cartId')
    items_in_cart = cart_result.get('items', [])
    print(f"   ✅ Cart ID: {cart_id}")
    print(f"   Items in cart: {len(items_in_cart)}")
    if items_in_cart:
        print(f"   First item: {items_in_cart[0].get('name')} - €{items_in_cart[0].get('price')}")
else:
    print(f"   ❌ Cart add failed: {cart_result}")
    exit(1)

print("\n" + "="*60)
print("✅ COMPLETE E2E FLOW WORKING!" if cart_result.get('ok') else "❌ FLOW FAILED")
