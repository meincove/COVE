#!/usr/bin/env python3
"""Quick test: Does routing work now?"""
import urllib.request
import json

BASE_URL = "http://127.0.0.1:8000"

queries = [
    "build me an outfit for a date",
    "I need an outfit for a conference",
    "casual outfit for work"
]

for q in queries:
    url = f"{BASE_URL}/ai/agent/query-stream"
    data = {"message": q, "stream": False, "session_key": f"test-{hash(q)}"}
    req = urllib.request.Request(url, data=json.dumps(data).encode('utf-8'), headers={'Content-Type': 'application/json'})
    
    with urllib.request.urlopen(req, timeout=60) as response:
        events = [json.loads(line[6:]) for line in response if line.decode('utf-8').strip().startswith("data: ")]
        done = next((e for e in events if e.get("event") == "done" or e.get("kind")), {})
        
        items = len(done.get('items', []))
        thinking = len(done.get('thinking_events', []))
        
        status = "✅" if items > 0 else "❌"
        print(f"{status} '{q}': {items} items, {thinking} thinking events")
