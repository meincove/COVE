#!/usr/bin/env python3
"""
BRUTAL Comprehensive Test Suite
Tests EVERYTHING - edge cases, errors, malformed input, concurrent requests, etc.
"""

import urllib.request
import json
import time
from concurrent.futures import ThreadPoolExecutor
import threading

BASE_URL = "http://127.0.0.1:8000"

class TestResults:
    def __init__(self):
        self.passed = 0
        self.failed = 0
        self.errors = 0
        self.lock = threading.Lock()
    
    def add_pass(self):
        with self.lock:
            self.passed += 1
    
    def add_fail(self):
        with self.lock:
            self.failed += 1
    
    def add_error(self):
        with self.lock:
            self.errors += 1

results = TestResults()

def query_api(message, session_key="brutal-test"):
    """Send query to API"""
    url = f"{BASE_URL}/ai/agent/query-stream"
    data = {
        "message": message,
        "stream": False,
        "session_key": session_key
    }
    
    req = urllib.request.Request(
        url,
        data=json.dumps(data).encode('utf-8'),
        headers={'Content-Type': 'application/json'}
    )
    
    with urllib.request.urlopen(req, timeout=30) as response:
        events = []
        for line in response:
            line = line.decode('utf-8').strip()
            if not line or not line.startswith("data: "):
                continue
            try:
                events.append(json.loads(line[6:]))
            except:
                pass
        
        done = next((e for e in events if e.get("event") == "done" or "kind" in e), None)
        return done

def test_case(name, query, expectations):
    """Run a single test case"""
    try:
        result = query_api(query)
        if not result:
            print(f"❌ {name}: No response")
            results.add_fail()
            return
        
        answer = result.get('answer', '')
        items = result.get('items', [])
        
        # Check expectations
        passed = True
        for key, expected in expectations.items():
            if key == 'min_items':
                if len(items) < expected:
                    print(f"❌ {name}: Expected >= {expected} items, got {len(items)}")
                    passed = False
            elif key == 'max_items':
                if len(items) > expected:
                    print(f"❌ {name}: Expected <= {expected} items, got {len(items)}")
                    passed = False
            elif key == 'exact_items':
                if len(items) != expected:
                    print(f"❌ {name}: Expected {expected} items, got {len(items)}")
                    passed = False
            elif key == 'contains':
                if expected.lower() not in answer.lower():
                    print(f"❌ {name}: Expected answer to contain '{expected}'")
                    passed = False
            elif key == 'not_contains':
                if expected.lower() in answer.lower():
                    print(f"❌ {name}: Answer should NOT contain '{expected}'")
                    passed = False
        
        if passed:
            print(f"✅ {name}")
            results.add_pass()
        else:
            results.add_fail()
            
    except Exception as e:
        print(f"💥 {name}: ERROR - {str(e)[:50]}")
        results.add_error()

print("🧪 BRUTAL COMPREHENSIVE TEST SUITE")
print("="*60)

# ============================================================
# Category 1: Product Availability (Honest AI)
# ============================================================
print("\n📦 Category 1: Product Availability")
print("-"*60)

test_case(
    "Unavailable product (shrug)",
    "show me a shrug",
    {'exact_items': 0, 'contains': "don't have"}
)

test_case(
    "Unavailable product (tuxedo)",
    "I need a tuxedo",
    {'exact_items': 0, 'contains': "don't have"}
)

test_case(
    "Unavailable product (dress)",
    "show me dresses",
    {'max_items': 0}  # Should either show 0 or be very honest
)

test_case(
    "Unavailable color (orange)",
    "find me orange hoodies",
    {'exact_items': 0}
)

test_case(
    "Unavailable color (pink)",
    "pink bomber jacket",
    {'exact_items': 0}
)

test_case(
    "Available product (hoodie)",
    "show me hoodies",
    {'min_items': 1}
)

test_case(
    "Available product with color (blue hoodie)",
    "blue hoodie",
    {'min_items': 1}
)

# ============================================================
# Category 2: Fuzzy Matching Edge Cases
# ============================================================
print("\n🔤 Category 2: Fuzzy Matching")
print("-"*60)

test_case(
    "Typo should NOT match nonsense (shrug → NOT shirt)",
    "show me a shrug",
    {'not_contains': "t-shirt"}
)

test_case(
    "Valid typo correction (hoddie → hoodie)",
    "show me a hoddie",  # Common typo
    {'contains': "hoodie"}
)

test_case(
    "Nonsense query",
    "asdfghjkl qwerty",
    {'exact_items': 0}
)

test_case(
    "Gibberish product type",
    "show me a flibbertigibbet",
    {'exact_items': 0}
)

# ============================================================
# Category 3: Edge Case Queries
# ============================================================
print("\n⚡ Category 3: Edge Cases")
print("-"*60)

test_case(
    "Empty query",
    "",
    {}  # Should handle gracefully
)

test_case(
    "Single character",
    "a",
    {}  # Should handle gracefully
)

test_case(
    "Very long query",
    "I need a really super ultra premium designer luxury fashion-forward minimalist aesthetic modern contemporary casual smart business professional versatile timeless classic essential wardrobe staple piece that is both comfortable and stylish" * 5,
    {}  # Should handle gracefully
)

test_case(
    "Only special characters",
    "!@#$%^&*()",
    {}  # Should handle gracefully
)

test_case(
    "Unicode and emojis",
    "show me hoodies 🔥💯",
    {'min_items': 0}  # Should parse correctly
)

test_case(
    "Mixed case chaos",
    "ShOw Me HoOdIeS",
    {'min_items': 1}
)

test_case(
    "Numbers only",
    "123456",
    {}  # Should handle gracefully
)

test_case(
    "SQL injection attempt",
    "show me hoodies'; DROP TABLE products; --",
    {}  # Should be safe
)

test_case(
    "XSS attempt",
    "<script>alert('xss')</script> hoodie",
    {}  # Should be safe
)

# ============================================================
# Category 4: Color Edge Cases
# ============================================================
print("\n🎨 Category 4: Color Edge Cases")
print("-"*60)

test_case(
    "Multiple colors",
    "blue and red hoodie",
    {}  # How should this be handled?
)

test_case(
    "Partial color match",
    "dark blue hoodie",
    {}  # Should find blue variants
)

test_case(
    "Color as product name",
    "navy tee",  # "navy" could be color or brand
    {}
)

test_case(
    "Nonsense color",
    "transparent invisible hoodie",
    {}
)

test_case(
    "Color synonym",
    "navy hoodie",  # Should match "ink navy"
    {}
)

# ============================================================
# Category 5: Intent Routing
# ============================================================
print("\n🧭 Category 5: Intent Routing")
print("-"*60)

test_case(
    "Complex outfit request",
    "I need a complete outfit for a wedding",
    {}  # Should route to orchestrator
)

test_case(
    "Simple product search",
    "show hoodies",
    {'min_items': 1}  # Should route to recommendations
)

test_case(
    "Cart operation",
    "add the first hoodie to cart",
    {}  # Should handle cart logic
)

test_case(
    "Size question",
    "what size should I get",
    {}  # Should provide size guidance
)

# ============================================================
# Category 6: Vocab & Catalog Integration
# ============================================================
print("\n📚 Category 6: Vocab & Catalog")
print("-"*60)

test_case(
    "Type in catalog (hoodie)",
    "hoodie",
    {'min_items': 1}
)

test_case(
    "Type in catalog (bomber)",
    "bomber",
    {'min_items': 0}  # May or may not have bombers
)

test_case(
    "Type in catalog (tee)",
    "tee",
    {'min_items': 0}  # May or may not have tees
)

test_case(
    "Type synonym (shirt → tee)",
    "show me shirts",
    {}  # Should normalize to "tee"
)

test_case(
    "Type synonym (t-shirt → tee)",
    "t-shirts",
    {}  # Should normalize to "tee"
)

# ============================================================
# Category 7: Error Resilience
# ============================================================
print("\n💪 Category 7: Error Resilience")
print("-"*60)

# These should all complete without crashing
test_case("Null bytes", "\x00hoodie\x00", {})
test_case("Newlines", "show\nme\nhoodies", {})
test_case("Tabs", "show\t\tme\t\thoodies", {})
test_case("HTML entities", "&lt;hoodie&gt;", {})
test_case("URL encoded", "show%20me%20hoodies", {})

# ============================================================
# Category 8: Concurrent Requests (Load Test)
# ============================================================
print("\n⚡ Category 8: Concurrent Load")
print("-"*60)

def concurrent_query(query_id):
    """Run a query concurrently"""
    try:
        result = query_api(f"hoodie {query_id}", f"concurrent-{query_id}")
        if result:
            print(f"✅ Concurrent {query_id}")
            results.add_pass()
        else:
            print(f"❌ Concurrent {query_id}")
            results.add_fail()
    except Exception as e:
        print(f"💥 Concurrent {query_id}: {str(e)[:30]}")
        results.add_error()

# Run 10 concurrent requests
print("Running 10 concurrent requests...")
with ThreadPoolExecutor(max_workers=10) as executor:
    executor.map(concurrent_query, range(10))

# ============================================================
# RESULTS SUMMARY
# ============================================================
print("\n" + "="*60)
print("📊 RESULTS SUMMARY")
print("="*60)
print(f"✅ Passed:  {results.passed}")
print(f"❌ Failed:  {results.failed}")
print(f"💥 Errors:  {results.errors}")
total = results.passed + results.failed + results.errors
if total > 0:
    print(f"📈 Success Rate: {results.passed/total*100:.1f}%")

if results.failed == 0 and results.errors == 0:
    print("\n🎉 ALL TESTS PASSED!")
else:
    print("\n⚠️  Some tests need attention")

print("\n" + "="*60)
