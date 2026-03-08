
import requests
import json

BASE_URL = "http://localhost:8000"

def test_recs():
    url = f"{BASE_URL}/ai/recs/suggest"
    payload = {
        "query": "shirt",
        "top_k": 5,
        "filters": {}  # No filters
    }
    
    print(f"Testing {url} with payload: {payload}")
    try:
        response = requests.post(url, json=payload)
        response.raise_for_status()
        data = response.json()
        print(f"Status Code: {response.status_code}")
        items = data.get("items", [])
        print(f"Items found: {len(items)}")
        for item in items:
            print(f"- {item.get('title')} (Type: {item.get('type')}, Category: {item.get('outfit_category')})")
            
    except Exception as e:
        print(f"Error: {e}")
        if 'response' in locals():
            print(f"Response text: {response.text}")

if __name__ == "__main__":
    test_recs()
