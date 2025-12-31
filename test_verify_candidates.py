
import asyncio
import httpx
import json
import sys

async def verify_candidates():
    print("🚀 Starting Stream Test...")
    url = "http://127.0.0.1:8000/api/agent-dev/query-stream"
    payload = {
        "message": "outfit for hiking",
        "guestSessionId": "verify-list-test",
        # Note: frontend uses api/agent-dev/query-stream which wraps the agent call
        # But for direct agent testing we used /ai/agent/query
        # Let's use the one that definitely triggers the stream we modified
    }
    
    # Actually, let's use the same endpoint as the curl test but with python handling
    url = "http://127.0.0.1:8000/ai/agent/query"
    payload = {
        "message": "outfit for hiking",
        "guestSessionId": "verify-list-test", 
        "sessionType": "outfit_builder"
    }

    print(f"📡 Connecting to {url}...")
    async with httpx.AsyncClient(timeout=120.0) as client:
        async with client.stream("POST", url, json=payload) as response:
            async for line in response.aiter_lines():
                if line.startswith("data:"):
                    print(f"DEBUG RECV: {line[:100]}...") # Show we are alive
                    try:
                        data = json.loads(line[5:])
                        if data.get("event_type") == "category_candidates":
                            candidates = data.get("candidates", [])
                            print(f"\n✅ FOUND LIST OF {len(candidates)} CANDIDATES for {data.get('category')}:")
                            for c in candidates:
                                print(f"   - {c.get('title')} (€{c.get('price')})")
                            return # Found it, we are done
                    except:
                        pass
    print("❌ No candidate list found in stream.")

if __name__ == "__main__":
    asyncio.run(verify_candidates())
