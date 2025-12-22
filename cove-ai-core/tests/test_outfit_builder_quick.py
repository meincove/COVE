import urllib.request
import json

BASE_URL = "http://127.0.0.1:8000"

def test_outfit_builder_routing():
    """Test that complex outfit queries still route to outfit_builder"""
    
    test_cases = [
        "I need a complete outfit for a wedding",
        "help me build a casual weekend look",
        "what should I wear with dark blue pants",
    ]
    
    print("🧪 Testing Outfit Builder Routing\n")
    
    for query in test_cases:
        url = f"{BASE_URL}/ai/agent/query-stream"
        data = {
            "message": query,
            "stream": False,
            "session_key": f"outfit-test-{hash(query)}"
        }
        
        print(f"📝 Query: '{query}'")
        
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
                
                # Check for thinking events that mention orchestrator
                thinking = [e for e in events if e.get("event") == "thinking"]
                done = next((e for e in events if e.get("event") == "done"), None)
                
                if thinking:
                    for t in thinking:
                        if "orchestrator" in str(t).lower() or "workflow" in str(t).lower():
                            print(f"   ✅ Routed to orchestrator")
                            break
                    else:
                        print(f"   ⚠️ No orchestrator mention in thinking")
                else:
                    print(f"   ℹ️ Response: {done.get('answer', '')[:80] if done else 'No response'}...")
                        
        except Exception as e:
            print(f"   ❌ Error: {e}")
        
        print()

if __name__ == "__main__":
    test_outfit_builder_routing()
