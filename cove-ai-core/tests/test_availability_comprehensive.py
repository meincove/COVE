import urllib.request
import json

BASE_URL = "http://127.0.0.1:8000"

def test_unavailable_products():
    """Test that the system shows honest availability messages for products not in catalog"""
    
    test_cases = [
        {
            "query": "show me a shrug",
            "expected": "unavailable_product",
            "description": "Shrug (not in catalog)",
            "should_mention": "don't have"
        },
        {
            "query": "I want a tuxedo",
            "expected": "unavailable_product", 
            "description": "Tuxedo (not in catalog)",
            "should_mention": "don't have"
        },
        {
            "query": "find me orange hoodies",
            "expected": "color_mismatch",
            "description": "Orange hoodie (color not available)",
            "should_mention": ["don't have orange", "available colors"]
        },
        {
            "query": "show me hoodies",
            "expected": "available",
            "description": "Hoodie (in catalog)",
            "should_mention": None
        },
    ]
    
    print("🧪 Testing Product Availability Honesty\n")
    print("="*60)
    
    results = []
    
    for test in test_cases:
        query = test["query"]
        url = f"{BASE_URL}/ai/agent/query-stream"
        data = {
            "message": query,
            "stream": False,
            "session_key": f"avail-test-{hash(query)}"
        }
        
        print(f"\n📝 Test: {test['description']}")
        print(f"   Query: '{query}'")
        
        req = urllib.request.Request(
            url,
            data=json.dumps(data).encode('utf-8'),
            headers={'Content-Type': 'application/json'}
        )
        
        try:
            with urllib.request.urlopen(req) as response:
                events = []
                current_event = None
                for line in response:
                    line = line.decode('utf-8').strip()
                    if not line: continue
                    if line.startswith("event: "):
                        current_event = line[7:]
                    elif line.startswith("data: "):
                        payload = json.loads(line[6:])
                        if current_event:
                            payload["event"] = current_event
                        events.append(payload)
                        current_event = None
                
                done = next((e for e in events if e.get("event") == "done"), None)
                
                if done:
                    answer = done.get('answer', '')
                    items = done.get('items', [])
                    
                    print(f"   💬 Answer: {answer[:100]}...")
                    print(f"   📦 Items: {len(items)}")
                    
                    # Check expectations
                    passed = False
                    if test['expected'] == 'unavailable_product':
                        if len(items) == 0 and test['should_mention'] in answer.lower():
                            print(f"   ✅ PASS: Correctly shows unavailability")
                            passed = True
                        else:
                            print(f"   ❌ FAIL: Should show 0 items with honesty message")
                            
                    elif test['expected'] == 'color_mismatch':
                        mentions = test['should_mention']
                        if isinstance(mentions, list):
                            found_mention = any(m in answer.lower() for m in mentions)
                        else:
                            found_mention = mentions in answer.lower()
                            
                        if found_mention or len(items) == 0:
                            print(f"   ✅ PASS: Handles color mismatch appropriately")
                            passed = True
                        else:
                            print(f"   ⚠️  WARN: Should mention color unavailability")
                            
                    elif test['expected'] == 'available':
                        if len(items) > 0:
                            print(f"   ✅ PASS: Shows available items")
                            passed = True
                        else:
                            print(f"   ❌ FAIL: Should show items for available product")
                    
                    results.append({
                        'test': test['description'],
                        'passed': passed,
                        'items': len(items),
                        'answer': answer[:80]
                    })
                        
        except Exception as e:
            print(f"   ❌ Error: {e}")
            results.append({
                'test': test['description'],
                'passed': False,
                'error': str(e)
            })
    
    print("\n" + "="*60)
    print("📊 SUMMARY")
    print("="*60)
    passed = sum(1 for r in results if r.get('passed'))
    total = len(results)
    print(f"✅ Passed: {passed}/{total}")
    print(f"❌ Failed: {total - passed}/{total}")
    
    for r in results:
        status = "✅" if r.get('passed') else "❌"
        print(f"{status} {r['test']}")

if __name__ == "__main__":
    test_unavailable_products()
