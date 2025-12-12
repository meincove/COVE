#!/usr/bin/env python3
"""
Complete Backend Flow Test
Tests: recommendations → cart add → checkout
"""
import requests
import json

BASE_URL = "http://localhost:8000"

print("="*80)
print("🧪 COMPLETE BACKEND FLOW TEST")
print("="*80)

# Test 1: Get recommendations
print("\n1️⃣ Testing /ai/recs/suggest...")
resp = requests.post(f"{BASE_URL}/ai/recs/suggest", json={
    "query": "tee",
    "top_k": 2
})
recs = resp.json()
items = recs.get("items", [])

print(f"✅ Got {len(items)} recommendations")
for i, item in enumerate(items):
    print(f"\nItem {i+1}:")
    print(f"  Title: {item.get('title')}")
    print(f"  variantId: {item.get('variantId')} {'⚠️ MISSING!' if not item.get('variantId') else '✅'}")
    print(f"  slug: {item.get('slug')}")

if not items:
    print("❌ No items returned - can't test further")
    exit(1)

first_item = items[0]
variant_id = first_item.get("variantId")

if not variant_id:
    print("\n❌ CRITICAL: variantId is None - need to regenerate embeddings!")
    print("Run: python scripts/generate_embeddings.py")
    exit(1)

# Test 2: Cart add
print("\n2️⃣ Testing /ai/agent/cart_add...")
cart_payload = {
    "variantId": variant_id,
    "size": "M",
    "quantity": 1,
    "guestSessionId": "test-session-123"
}

print(f"Payload: {json.dumps(cart_payload, indent=2)}")

cart_resp = requests.post(f"{BASE_URL}/ai/agent/cart_add", json=cart_payload)
cart_data = cart_resp.json()

print(f"Status: {cart_resp.status_code}")
print(f"Response: {json.dumps(cart_data, indent=2)}")

if cart_data.get("ok"):
    print("✅ Cart add successful!")
else:
    print(f"❌ Cart add failed: {cart_data.get('message')}")

# Test 3: Show more (context awareness)
print("\n3️⃣ Testing 'show more' context...")
resp2 = requests.post(f"{BASE_URL}/ai/recs/suggest", json={
    "query": "show me more tees",
    "top_k": 4
})
items2 = resp2.json().get("items", [])

print(f"First query returned: {[i.get('title') for i in items]}")
print(f"'Show more' returned: {[i.get('title') for i in items2]}")

# Check if same products
first_slugs = set(i.get('slug') for i in items)
second_slugs = set(i.get('slug') for i in items2)
overlap = first_slugs & second_slugs

if overlap == first_slugs and len(items) > 0:
    print(f"⚠️  WARNING: 'Show more' returned same {len(overlap)} products!")
else:
    print(f"✅ Got different products (overlap: {len(overlap)}/{len(items2)})")

# Test 4: Agent query (full flow)
print("\n4️⃣ Testing agent full flow...")
agent_resp = requests.post(f"{BASE_URL}/ai/agent/query", json={
    "message": "show me tees",
    "top_k": 3,
    "historyScope": "none"
})

if agent_resp.status_code == 200:
    agent_data = agent_resp.json()
    print(f"✅ Agent response kind: {agent_data.get('kind')}")
    print(f"   Items: {len(agent_data.get('items', []))}")
else:
    print(f"❌ Agent failed: {agent_resp.status_code}")

print("\n" + "="*80)
print("TEST SUMMARY")
print("="*80)
print("✅ = Pass, ❌ = Fail, ⚠️  = Warning")
