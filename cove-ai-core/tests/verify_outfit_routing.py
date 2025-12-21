
import urllib.request
import json
import sys

def test_query(query):
    print(f"\n🕵️ Sending query: '{query}'")
    url = "http://127.0.0.1:8000/ai/agent/query-stream"
    data = {"message": query, "stream": False}
    
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    
    try:
        with urllib.request.urlopen(req) as response:
            lines = response.readlines()
            
            orchestrator_found = False
            
            for line in lines:
                text = line.decode('utf-8').strip()
                if not text: continue
                
                try:
                    event = json.loads(text)
                    
                    # Check for Orchestrator thinking step
                    if event.get("event") == "thinking:step":
                        status = event.get("status", "")
                        if "Building your complete outfit" in status:
                            print(f"✅ Orchestrator Triggered: {status}")
                            orchestrator_found = True
                            
                    if event.get("event") == "done":
                        debug = event.get("debug", {})
                        orch_debug = debug.get("orchestrator")
                        if orch_debug == "outfit_builder":
                             print(f"✅ Final Response confirms Outfit Builder workflow!")
                             orchestrator_found = True
                        else:
                             print(f"👉 Workflow: {orch_debug}")

                except:
                    pass
            
            if not orchestrator_found:
                print("❌ Orchestrator check failed. Query might have fallen through to Legacy.")
            else:
                print("✅ Routing Success: Complex query went to Orchestrator.")

    except Exception as e:
        print(f"❌ Request failed: {e}")

if __name__ == "__main__":
    test_query("style me for a casual first date with a budget of 200")
