#!/usr/bin/env python3
"""
E2E Test for Honest Product Availability
Tests real API integration - should fail properly when we don't have products
"""

import requests
import json
import sys


def test_product_availability_e2e():
    """Test with real API calls to verify honest failure"""
    
    base_url = "http://localhost:8000"
    
    test_cases = [
        {
            "name": "Product We Don't Have (Should Show Nothing)",
            "query": "red velvet jacket",
            "expected_behavior": "Should say 'we don't have this' - NO random products!",
            "should_show_items": False
        },
        {
            "name": "Specific Color We Don't Have",
            "query": "bright orange hoodie",
            "expected_behavior": "Should either show close alternative OR honestly say we don't have it",
            "should_show_items": "maybe"  # Depends on if we have hoodies in other colors
        },
        {
            "name": "Completely Unrelated Product",
            "query": "unicorn costume with rainbow tail",
            "expected_behavior": "Should definitely say we don't have this - NO fashion items!",
            "should_show_items": False
        },
        {
            "name": "Product We DO Have",
            "query": "black hoodie",
            "expected_behavior": "Should show black hoodies (exact match)",
            "should_show_items": True
        },
        {
            "name": "Close Alternative (Dark Blue → Blue)",
            "query": "dark blue shirt",
            "expected_behavior": "Should show blue SHIRTS if we have them, or NOTHING if we only have tees (don't change type!)",
            "should_show_items": "maybe"  # Depends on if we actually have "shirt" type products
        }
    ]
    
    print("=" * 80)
    print("E2E HONEST PRODUCT AVAILABILITY TEST")
    print("Testing with REAL API calls")
    print("=" * 80)
    print()
    
    results = []
    
    for test in test_cases:
        print(f"🧪 TEST: {test['name']}")
        print(f"   Query: '{test['query']}'")
        print(f"   Expected: {test['expected_behavior']}")
        print()
        
        try:
            # Call real agent endpoint
            response = requests.post(
                f"{base_url}/ai/agent/query-stream",
                json={"message": test['query']},
                headers={"Content-Type": "application/json"},
                timeout=30,
                stream=True
            )
            
            # Parse streaming response
            items_found = []
            messages = []
            
            for line in response.iter_lines():
                if line:
                    line_str = line.decode('utf-8')
                    if line_str.startswith('data:'):
                        try:
                            data = json.loads(line_str[5:])
                            
                            # Collect items
                            if 'items' in data and data.get('items'):
                                items_found.extend(data['items'])
                            
                            # Collect messages
                            if 'text' in data:
                                messages.append(data['text'])
                        except:
                            pass
            
            # Remove duplicates
            unique_items = []
            seen_slugs = set()
            for item in items_found:
                slug = item.get('slug')
                if slug and slug not in seen_slugs:
                    unique_items.append(item)
                    seen_slugs.add(slug)
            
            print(f"   📊 Results:")
            print(f"      Items returned: {len(unique_items)}")
            
            if unique_items:
                print(f"      Items:")
                for item in unique_items[:5]:  # Show first 5
                    print(f"         - {item.get('type', '?'):15} {item.get('title', 'Unknown')[:50]}")
                if len(unique_items) > 5:
                    print(f"         ... and {len(unique_items) - 5} more")
            else:
                print(f"      ✅ NO ITEMS SHOWN (honest failure!)")
            
            if messages:
                print(f"      Message: {messages[-1][:150]}")
            
            print()
            
            # Validate
            expected_shows = test['should_show_items']
            actually_showed = len(unique_items) > 0
            
            if expected_shows == "maybe":
                # Either behavior is acceptable
                if actually_showed:
                    print(f"   ℹ️  Showed alternatives (acceptable if close)")
                else:
                    print(f"   ℹ️  Showed nothing (acceptable if no close match)")
                results.append(('PASS', test['name']))
            elif expected_shows == True and actually_showed:
                print(f"   ✅ PASS: Correctly showed products")
                results.append(('PASS', test['name']))
            elif expected_shows == False and not actually_showed:
                print(f"   ✅ PASS: Correctly showed NOTHING (honest!)")
                results.append(('PASS', test['name']))
            elif expected_shows == True and not actually_showed:
                print(f"   ❌ FAIL: Should have shown products but didn't")
                results.append(('FAIL', test['name']))
            elif expected_shows == False and actually_showed:
                print(f"   ❌ FAIL: Showed {len(unique_items)} items when should show NOTHING!")
                print(f"      This is the BAD behavior we're trying to prevent!")
                results.append(('FAIL', test['name']))
            
            print()
            
        except requests.exceptions.ConnectionError:
            print(f"   ❌ ERROR: Cannot connect to {base_url}")
            print(f"      Make sure uvicorn is running!")
            results.append(('ERROR', test['name']))
            break
        except Exception as e:
            print(f"   ❌ ERROR: {e}")
            results.append(('ERROR', test['name']))
            print()
    
    # Summary
    print("=" * 80)
    print("SUMMARY")
    print("=" * 80)
    
    passes = sum(1 for status, _ in results if status == 'PASS')
    fails = sum(1 for status, _ in results if status == 'FAIL')
    errors = sum(1 for status, _ in results if status == 'ERROR')
    
    print(f"✅ Passed: {passes}/{len(test_cases)}")
    print(f"❌ Failed: {fails}/{len(test_cases)}")
    print(f"⚠️  Errors: {errors}/{len(test_cases)}")
    print()
    
    if fails > 0:
        print("❌ CRITICAL: Failed tests mean we're showing random products!")
        print("Failed tests:")
        for status, name in results:
            if status == 'FAIL':
                print(f"   - {name}")
        return False
    
    if errors > 0:
        print("⚠️  Some tests had errors (check server)")
        return False
    
    print("✅ All tests passed - honest product availability working!")
    return True


if __name__ == "__main__":
    success = test_product_availability_e2e()
    sys.exit(0 if success else 1)
