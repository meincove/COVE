#!/usr/bin/env python3
"""
Quick diagnostic: Why are stylist agent tests still failing?
"""

import urllib.request
import json

BASE_URL = "http://127.0.0.1:8000"

def test_query(query: str):
    """Send query to agent and see what happens"""
    url = f"{BASE_URL}/ai/agent/query-stream"
    data = {
        "message": query,
        "stream": False,
        "session_key": f"debug-{hash(query)}"
    }
    
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    
    with urllib.request.urlopen(req, timeout=60) as response:
        events = []
        for line in response:
            line = line.decode('utf-8').strip()
            if not line or not line.startswith("data: "):
                continue
            try:
                events.append(json.loads(line[6:]))
            except:
                pass
        
        # Find the 'done' event
        done_event = next((e for e in events if e.get("event") == "done" or e.get("kind")), None)
        return done_event or {}

print("=" * 60)
print("🔍 STYLIST AGENT DEBUG")
print("=" * 60)

queries = [
    "build me an outfit for a date",
    "I need an outfit for a conference",
    "casual outfit for work"
]

for query in queries:
    print(f"\\n📝 Query: '{query}'")
    result = test_query(query)
    
    items_count = len(result.get('items', []))
    answer = result.get('answer', '')[:100]
    
    print(f"   Items: {items_count}")
    print(f"   Answer: {answer}...")
    
    if items_count == 0:
        print(f"   ⚠️  NO ITEMS - checking why...")
        # Check if it even routed to orchestrator
        thinking = result.get('thinking_events', [])
        print(f"   Thinking events: {len(thinking)}")
        if thinking:
            print(f"   First thinking: {thinking[0].get('content', '')[:60]}")
