
import traceback
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
import os
from dotenv import load_dotenv

load_dotenv()

with patch("app.vector.store.connect"), patch("app.vector.store.get_conn"):
    from app.main import app 

client = TestClient(app)

def mock_search_side_effect(*args, **kwargs):
    query = args[0] if args else kwargs.get("q", "")
    print(f"🔎 [MOCK DB] Searching for: '{query}'")
    
    if "dark blue" in query.lower():
        # Return only standard blue (Simulate bad result)
        m = MagicMock()
        m.dict.return_value = {"id": "1", "name": "Standard Blue Hoodie", "color": "Blue", "type": "hoodie", "price": 50}
        return [m]
    elif "navy" in query.lower():
        # Return correct navy (Simulate good result)
        m = MagicMock()
        m.dict.return_value = {"id": "2", "name": "Navy Blue Hoodie", "color": "Navy", "type": "hoodie", "price": 60}
        return [m]
    else:
        return []

def demo_crag_loop():
    print("\n🚀 [CRAG DEMO] User asks for 'Dark Blue'. DB has 'Blue' and 'Navy'.")
    print("EXPECTATION: Verifier rejects 'Blue', retries with 'Navy', returns 'Navy'.")
    
    with patch("app.vector.store.get_conn") as mock_get_conn:
        mock_conn = MagicMock()
        mock_get_conn.return_value = mock_conn
        # Dynamic search results
        mock_conn.hybrid_search.side_effect = mock_search_side_effect
        
        payload = {
            "message": "Show me dark blue hoodies",
            "history": []
        }
        
        try:
            resp = client.post("/ai/agent/query", json=payload)
            print(f"Status: {resp.status_code}")
            data = resp.json()
            
            answer = data.get("answer", "")
            print(f"FINAL ANSWER: {answer}")
            
            if "Navy" in answer:
                print("✅ SUCCESS: Agent found Navy item (Retry Worked!)")
            elif "Standard Blue" in answer:
                print("❌ FAIL: Agent stuck with Blue item (No Retry)")
            else:
                print("❓ UNKNOWN RESULT")
                
        except Exception as e:
            print(f"CRASH: {e}")
            traceback.print_exc()

if __name__ == "__main__":
    demo_crag_loop()
