import requests
import json
import uuid

BASE_URL = "http://localhost:8000"
SESSION_ID = f"debug-{uuid.uuid4()}"

print(f"🔍 Debugging Live Server with session: {SESSION_ID}")

# 1. Test RECS directly (Bypass Agent)
print("\n1️⃣ Testing /ai/recs/suggest (Direct Retrieval)...")
try:
    recs_payload = {
        "query": "hoodie",
        "top_k": 4,
        "filters": {"type": "hoodie"}
    }
    resp = requests.post(f"{BASE_URL}/ai/recs/suggest", json=recs_payload)
    if resp.status_code == 200:
        items = resp.json().get("items", [])
        print(f"✅ Recs Endpoint returned {len(items)} items")
        for item in items:
            print(f"   - {item.get('title')}")
    else:
        print(f"❌ Recs Endpoint Failed: {resp.text}")
except Exception as e:
    print(f"💥 Recs Exception: {e}")

# 2. Test Agent (With Logic)
print("\n2️⃣ Testing /ai/agent/query (Agent Logic)...")
payload = {
    "message": "Show me some hoodies",
    "guestSessionId": SESSION_ID,
    "top_k": 4,
    "historyScope": "none"
}

try:
    resp = requests.post(f"{BASE_URL}/ai/agent/query", json=payload)
    if resp.status_code == 200:
        data = resp.json()
        items = data.get("items", [])
        print(f"📦 Agent returned: {len(items)} items")
        print(f"📝 Answer: {data.get('answer')}")
    else:
        print(f"❌ Agent Failed: {resp.text}")

except Exception as e:
    print(f"💥 Agent Exception: {e}")
