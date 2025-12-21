#!/usr/bin/env python3
"""
Diagnostic: Test Catalog Coverage for Different Occasions
Tests if the product catalog has semantic embeddings for various occasions.
"""

import urllib.request
import json

BASE_URL = "http://127.0.0.1:8000"

def test_semantic_search(query: str) -> int:
    """Test semantic search and return item count"""
    url = f"{BASE_URL}/ai/recs/suggest"
    payload = {
        "query": query,
        "top_k": 20
    }
    
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            result = json.loads(response.read())
            return len(result.get('items', []))
    except Exception as e:
        print(f"  ERROR: {e}")
        return -1

print("=" * 60)
print("📊 CATALOG COVERAGE DIAGNOSTIC")
print("=" * 60)
print()

test_cases = [
    # Casual occasions (expected to work)
    ("Casual occasions", [
        "hoodie for casual",
        "tee for casual",
        "shorts for weekend",
        "streetwear casual outfit"
    ]),
    
    # Formal occasions (likely failing)
    ("Formal occasions", [
        "hoodie for meeting",
        "outfit for job interview",
        "clothes for conference",
        "business casual work"
    ]),
    
    # Specific events (likely failing)
    ("Specific events", [
        "outfit for wedding",
        "clothes for date",
        "look for party",
        "attire for dinner"
    ]),
    
    # Generic product searches (should work)
    ("Generic searches", [
        "black hoodie",
        "blue tee",
        "StreetVibe hoodie",
        "bomber jacket"
    ])
]

for category, queries in test_cases:
    print(f"\\n{category}:")
    print("-" * 60)
    for query in queries:
        count = test_semantic_search(query)
        status = "✅" if count > 0 else "❌"
        print(f"  {status} '{query}': {count} items")

print()
print("=" * 60)
print("📝 FINDINGS:")
print("=" * 60)
print("If formal/event searches return 0 items, the issue is:")
print("1. Product embeddings don't capture occasion context")
print("2. Need to enrich product descriptions with use-case keywords")
print("3. Or modify StylistAgent to use generic queries first")
