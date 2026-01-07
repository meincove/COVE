
import requests
import json
import time

BASE_URL = "http://localhost:8000/ai/agent/query"
GUEST_ID = f"verify_script_{int(time.time())}"

def run_test():
    print(f"🚀 Starting verification for guest_id: {GUEST_ID}")
    
    # Step 1: Initial Query
    payload1 = {
        "message": "I want an outfit for the weekend for men under 500 euros, casual style",
        "guest_id": GUEST_ID
    }
    print(f"\nSending Step 1: {payload1['message']}")
    r1 = requests.post(BASE_URL, json=payload1)
    d1 = r1.json()
    print(f"Response 1: {d1.get('answer')}")
    
    history = [
        {"role": "user", "content": payload1["message"]},
        {"role": "assistant", "content": d1.get("answer")}
    ]
    
    # Step 2: Confirmation
    payload2 = {
        "message": "Yes, please",
        "guest_id": GUEST_ID,
        "history": history
    }
    print(f"\nSending Step 2: {payload2['message']}")
    r2 = requests.post(BASE_URL, json=payload2)
    d2 = r2.json()
    
    answer = d2.get("answer", "")
    items = d2.get("items", [])
    
    print(f"\n✅ Final Response: {answer}")
    print(f"📦 Total Items: {len(items)}")
    
    outfits = {}
    for item in items:
        oid = item.get("outfit_id", "unknown")
        if oid not in outfits:
             outfits[oid] = []
        outfits[oid].append(item)
        
    for oid, o_items in outfits.items():
        print(f"\n--- {oid} ({len(o_items)} items) ---")
        total = sum(i.get("price", 0) for i in o_items)
        print(f"Total Cost: €{total:.2f}")
        for i in o_items:
            print(f"  * {i.get('title')} (€{i.get('price')})")

if __name__ == "__main__":
    run_test()
