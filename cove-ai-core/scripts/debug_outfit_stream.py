
import requests
import json
import sseclient

url = "http://localhost:8000/ai/agent/query-stream"
payload = {
    "message": "Men's Vortex Streetwear outfit casual under 800 euros",
    "sessionType": "outfit_builder",
    "historyScope": "none"
}

print(f"🚀 Sending query to {url}...")
print(f"Payload: {json.dumps(payload, indent=2)}")

response = requests.post(url, json=payload, stream=True)

client = sseclient.SSEClient(response)

candidate_counts = {}
total_items = 0
outfit_ids = set()

for event in client.events():
    if event.event == "error":
        print(f"❌ ERROR: {event.data}")
        continue
        
    try:
        data = json.loads(event.data)
    except:
        print(f"⚠️ Could not parse JSON: {event.data}")
        continue

    print(f"📨 Event: {event.event}")
    
    if event.event == "agentic:category_candidates":
        cat = data.get("category", "unknown")
        count = len(data.get("candidates", []))
        candidate_counts[cat] = count
        print(f"   found {count} candidates for {cat}")
        
    if event.event == "items:batch":
        batch_items = data.get("items", [])
        total_items += len(batch_items)
        print(f"   📦 Batch of {len(batch_items)} items")
        for item in batch_items:
            oid = item.get("outfit_id")
            if oid:
                outfit_ids.add(oid)
            else:
                print(f"   ⚠️ Item missing outfit_id: {item.get('slug')}")
                
    if event.event == "done":
        # Sometimes done event has data too
        if "items" in data:
             items = data.get("items", [])
             total_items += len(items)
             for item in items:
                oid = item.get("outfit_id")
                if oid:
                    outfit_ids.add(oid)
        print(f"✅ DONE event received.")
        break

print("\n--- SUMMARY ---")
print(f"Candidates Found: {candidate_counts}")
print(f"Final Items: {total_items}")
print(f"Outfit IDs found: {outfit_ids}")

if not candidate_counts:
    print("❌ FAILURE: No category_candidates events received!")
else:
    print("✅ SUCCESS: Candidates events received.")

if total_items == 0:
    print("❌ FAILURE: No final items returned!")
elif not outfit_ids:
    print("❌ FAILURE: Items returned but missing outfit_id (Frontend will ignore them!)")
else:
    print("✅ SUCCESS: Final items have outfit_ids.")
