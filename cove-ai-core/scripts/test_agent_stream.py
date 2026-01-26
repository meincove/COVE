
import requests
import json
import sys

def test_stream():
    url = "http://localhost:8000/ai/agent/query-stream"
    payload = {
        "message": "show me Vortex Streetwear products",
        "top_k": 3
    }
    
    print(f"📡 Requesting {url}...")
    with requests.post(url, json=payload, stream=True) as response:
        if response.status_code != 200:
            print(f"❌ Error: {response.status_code}")
            return

        for line in response.iter_lines():
            if line:
                decoded_line = line.decode('utf-8')
                if decoded_line.startswith("event: done"):
                    print("\n🏁 DONE EVENT RECEIVED")
                elif decoded_line.startswith("data:"):
                    try:
                        data = json.loads(decoded_line[5:])
                        if "items" in data:
                            print(f"📦 Found {len(data['items'])} items")
                            for item in data['items']:
                                print(f"   - {item.get('title')}")
                                print(f"     imageUrl: {item.get('imageUrl')}")
                                print(f"     image_url: {item.get('image_url')}") # Just in case
                    except:
                        pass

if __name__ == "__main__":
    test_stream()
