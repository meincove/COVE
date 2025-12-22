import urllib.request
import json

BASE_URL = "http://127.0.0.1:8000"

def test_blue_hoodie():
    url = f"{BASE_URL}/ai/agent/query-stream"
    data = {
        "message": "show me a blue hoodie",
        "stream": False,
        "session_key": "blue-test-final"
    }
    
    print(f"🧪 Testing: '{data['message']}'")
    
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
                items = done.get('items', [])
                answer = done.get('answer', '')
                attrs = done.get('debug', {}).get('attrs', {})
                rec_filters = done.get('debug', {}).get('rec_filters', {})
                
                print(f"   💬 Answer: {answer}")
                print(f"   📊 Parsed Attrs: {attrs}")
                print(f"   🎯 Rec Filters: {rec_filters}")
                print(f"   📉 Items Found: {len(items)}")
                
                if len(items) > 0:
                    print(f"   ✅ SUCCESS: Found {len(items)} items")
                    for i, item in enumerate(items[:3], 1):
                        print(f"      {i}. {item.get('title')}")
                else:
                    print(f"   ❌ FAILURE: Expected items but found none")
            else:
                print(f"   ⚠️ No 'done' event found")
    except Exception as e:
        print(f"   ❌ Request failed: {e}")

if __name__ == "__main__":
    test_blue_hoodie()
