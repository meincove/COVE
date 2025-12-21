
import urllib.request
import json

BASE_URL = "http://127.0.0.1:8000"

def test_suit_query():
    url = f"{BASE_URL}/ai/agent/query-stream"
    # Note: Using 'blue suits' to test both routing and lack of results
    data = {
        "message": "show me 3 piece blue suits",
        "stream": False,
        "session_key": "suit-test-123"
    }
    
    print(f"👉 Query: '{data['message']}'")
    
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    
    try:
        with urllib.request.urlopen(req) as response:
            events = []
            current_event = None
            for line in response:
                line = line.decode('utf-8').strip()
                if not line: continue
                if line.startswith("event: "):
                    current_event = line[7:]
                elif line.startswith("data: "):
                    payload = json.loads(line[6:])
                    if current_event:
                        payload["event"] = current_event
                    events.append(payload)
                    current_event = None
            
            done = next((e for e in events if e.get("event") == "done"), None)
            if done:
                print(f"   🎯 Intent: {done.get('debug', {}).get('orchestrator') or done.get('debug', {}).get('semantic_intent')}")
                print(f"   💬 Answer: {done.get('answer')}")
                print(f"   📉 Items Found: {len(done.get('items', []))}")
                
                # Check for "honest availability" signal
                if "don't have" in done.get("answer", "").lower() or "not available" in done.get("answer", "").lower():
                    print("   ✅ SUCCESS: System was honest about missing suits.")
                elif len(done.get('items', [])) > 0:
                    print(f"   ❌ FAILURE: System suggested unrelated items: {[i.get('title') for i in done.get('items')][:3]}")
            else:
                print("   ⚠️ No 'done' event found.")
    except Exception as e:
        print(f"   ❌ Request failed: {e}")

if __name__ == "__main__":
    test_suit_query()
