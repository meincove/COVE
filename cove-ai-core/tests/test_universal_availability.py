
import urllib.request
import json
import time

BASE_URL = "http://127.0.0.1:8000"

def run_query(query, session_id):
    url = f"{BASE_URL}/ai/agent/query-stream"
    data = {
        "message": query,
        "stream": False,
        "session_key": session_id
    }
    
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
            return done
    except Exception as e:
        print(f"   ❌ Request failed: {e}")
        return None

def test_availability():
    test_cases = [
        {
            "name": "EXACT MATCH (Hoodie)",
            "query": "show me a blue hoodie",
            "expect_items": True,
            "session": "avail-1"
        },
        {
            "name": "CLOSE ALTERNATIVE (Color mismatch)",
            "query": "show me an orange hoodie", # Likely we don't have orange, but have hoodies
            "expect_items": None, # Could be True (if we show alternatives) or False
            "session": "avail-2"
        },
        {
            "name": "WRONG TYPE (Suits)",
            "query": "find me a tuxedo",
            "expect_items": False,
            "session": "avail-3"
        },
        {
            "name": "NONSENSE (Bananas)",
            "query": "buy a banana",
            "expect_items": False,
            "session": "avail-4"
        }
    ]
    
    print("🚀 --- UNIVERSAL AVAILABILITY TEST ---")
    for tc in test_cases:
        print(f"\nTEST: {tc['name']}")
        print(f"👉 Query: '{tc['query']}'")
        
        result = run_query(tc['query'], tc['session'])
        if result:
            items = result.get('items', [])
            answer = result.get('answer', '')
            found_count = len(items)
            
            print(f"   💬 Answer: {answer}")
            print(f"   📉 Items Found: {found_count}")
            
            if tc['expect_items'] is True and found_count == 0:
                print(f"   ❌ FAILURE: Expected items but found none.")
            elif tc['expect_items'] is False and found_count > 0:
                print(f"   ❌ FAILURE: Expected no items but found {found_count}.")
            else:
                print(f"   ✅ PASS")
        else:
            print(f"   ⚠️ No response from server.")
        
        time.sleep(1) # Slow down slightly

if __name__ == "__main__":
    test_availability()
