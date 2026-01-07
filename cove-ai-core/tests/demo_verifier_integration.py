import asyncio
import os
import json
from unittest.mock import patch, MagicMock
from httpx import AsyncClient
from dotenv import load_dotenv

# Load env 
load_dotenv()
os.environ["INTENT_CLASSIFIER_MODEL"] = "openrouter/openai/gpt-4o-mini"
os.environ["VERIFIER_MODEL"] = "openrouter/openai/gpt-4o-mini"

# Import app (Mocking vector store connection to avoid DB requirement)
with patch("app.vector.store.connect"), patch("app.vector.store.get_conn"):
    from app.main import app 
    from app.routes import agent

# Payload
payload = {
    "message": "Show me blue hoodies",
    "history": []
}

async def run_async_demo():
    async with AsyncClient(app=app, base_url="http://test") as ac:
        print(f"📨 [CLIENT] Sending Query: '{payload['message']}'")
        
        try:
            response = await ac.post("/ai/agent/query", json=payload)
            print(f"Status Code: {response.status_code}")
            
            if response.status_code != 200:
                print(f"❌ API Error: {response.text}")
                return None

            res_json = response.json()
            print(f"Answer: {res_json.get('answer')}")
            print(f"Suggestions: {res_json.get('suggestions')}")
            
            return res_json
        except Exception as e:
            print(f"❌ Exception during request: {e}")
            return None

def demo_hallucination_fix():
    print("\n🚀 [DEMO] Starting Full Flow: User asks for 'Blue Hoodies' but we only have 'Red'...")
    
    # Mock Hybrid Search to return a RED hoodie
    mock_item = MagicMock()
    mock_item.dict.return_value = {
        "id": "123", "name": "Red Fire Hoodie", "color": "Red", 
        "price": 49.99, "type": "hoodie", "tier": "premium"
    }
    mock_item.text = "Red Fire Hoodie"
    
    with patch("app.routes.agent.get_conn") as mock_get_conn:
        mock_conn = MagicMock()
        mock_get_conn.return_value = mock_conn
        
        # Mock search results
        mock_conn.hybrid_search.return_value = [mock_item]
        
        # Run async loop
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        # We need to ensure app startup event logic is okay?
        # AsyncClient handles lifecycles.
        
        try:
            res_json = loop.run_until_complete(run_async_demo())
            
            if res_json:
                ans = res_json.get('answer', '')
                if ans and ("Red" in ans or "couldn't find blue" in ans.lower() or "find any blue" in ans.lower()):
                    print("\n✅ SUCCESS: Verifier caught the hallucination!")
                else:
                    print("\n❌ FAIL: Agent lied or failed.")
        finally:
            loop.close()

if __name__ == "__main__":
    demo_hallucination_fix()
