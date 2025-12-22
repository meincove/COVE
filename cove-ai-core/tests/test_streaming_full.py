
import asyncio
import json
import httpx
import sys

async def test_streaming_endpoint():
    """
    Connects to the streaming endpoint and prints events in real-time.
    Simulates a frontend client consuming the SSE stream.
    """
    url = "http://localhost:8000/ai/agent/query-stream"
    payload = {
        "message": "build me an outfit for a summer wedding budget 500",
        "clerkUserId": "test_script_user_2",
        "userPreferences": {
            "size": "M",
            "style": "Classic"
        }
    }
    
    print(f"🔌 Connecting to {url}...")
    print(f"📤 Sending: {payload['message']}")
    print("-" * 50)
    
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            async with client.stream("POST", url, json=payload) as response:
                if response.status_code != 200:
                    print(f"❌ Error: Status {response.status_code}")
                    print(await response.aread())
                    return

                async for line in response.aiter_lines():
                    if not line:
                        continue
                        
                    if line.startswith("event:"):
                        event_type = line.replace("event: ", "").strip()
                        print(f"\n🔔 EVENT: {event_type}")
                        
                    elif line.startswith("data:"):
                        data_str = line.replace("data: ", "").strip()
                        try:
                            data = json.loads(data_str)
                            
                            # Pretty print specific event types
                            if "status" in data: # Thinking event
                                print(f"   🧠 THINKING: {data.get('icon', '')} {data.get('status')}")
                            elif "text" in data and len(data.keys()) == 1: # Intro text
                                print(f"   💬 INTRO: {data['text']}")
                            elif "items" in data: # Items batch
                                print(f"   👕 ITEMS: Received batch {data.get('batch')} ({len(data.get('items'))} items)")
                                for item in data['items']:
                                    print(f"      - {item.get('title')} (€{item.get('price', 'N/A')})")
                            elif "answer" in data and "kind" in data: # Done event
                                print(f"   ✅ DONE: {data['kind']}")
                                if data.get('answer'):
                                    print(f"      Answer: {data['answer']}")
                            else:
                                # Generic JSON dump for others
                                print(f"   📦 DATA: {json.dumps(data, indent=2)}")
                                
                        except json.JSONDecodeError:
                            print(f"   📄 RAW DATA: {data_str}")

    except Exception as e:
        print(f"\n❌ Exception: {e}")
        print("Note: Ensure the server is running on localhost:8000")

if __name__ == "__main__":
    asyncio.run(test_streaming_endpoint())
