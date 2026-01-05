
from unittest.mock import patch, MagicMock
from fastapi.testclient import TestClient
import os
from dotenv import load_dotenv

load_dotenv()

# Mock DB
with patch("app.vector.store.connect"), patch("app.vector.store.get_conn"):
    from app.main import app 

client = TestClient(app)

def debug_cart():
    print("🚀 Debugging Cart Crash...")
    
    # Payload mimicking 'Add it to my cart'
    # We assume session has context. But let's just see if it crashes.
    payload = {
        "message": "Add it to my cart",
        "history": [],
        # "sessionType": "main" 
    }
    
    try:
        response = client.post("/ai/agent/query", json=payload)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
    except Exception as e:
        print(f"CRASH: {e}")

if __name__ == "__main__":
    debug_cart()
