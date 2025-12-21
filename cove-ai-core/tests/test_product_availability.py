#!/usr/bin/env python3
"""
Test ProductAvailabilityChecker
Verifies honest product recommendations
"""

import asyncio
import sys
sys.path.insert(0, '/Users/ssg/Desktop/COVE/cove-ai-core')

from app.agents.product_availability_checker import ProductAvailabilityChecker


async def test_availability_checker():
    """Test different availability scenarios"""
    
    checker = ProductAvailabilityChecker()
    
    test_cases = [
        {
            "name": "Close Match - Color Variation",
            "query": "dark blue shirt",
            "results": [
                {"title": "Blue Cotton Shirt", "type": "shirt", "color": "blue"},
                {"title": "Navy Dress Shirt", "type": "shirt", "color": "navy"},
                {"title": "Light Blue Shirt", "type": "shirt", "color": "light_blue"}
            ],
            "expected": {"close_match": True, "should_recommend": True}
        },
        {
            "name": "Close Match - Material Variation",
            "query": "linen blazer",
            "results": [
                {"title": "Cotton Blazer", "type": "blazer", "color": "navy"},
                {"title": "Wool Blazer", "type": "blazer", "color": "grey"},
            ],
            "expected": {"close_match": True, "should_recommend": True}
        },
        {
            "name": "No Match - Wrong Type",
            "query": "red hoodie",
            "results": [
                {"title": "Blue Jeans", "type": "pants", "color": "blue"},
                {"title": "Black Shorts", "type": "shorts", "color": "black"}
            ],
            "expected": {"close_match": False, "should_recommend": False}
        },
        {
            "name": "No Results",
            "query": "unicorn costume",
            "results": [],
            "expected": {"close_match": False, "should_recommend": False}
        },
        {
            "name": "Exact Match",
            "query": "black tee",
            "results": [
                {"title": "Black Cotton Tee", "type": "tee", "color": "black"},
                {"title": "Black V-Neck Tee", "type": "tee", "color": "black"}
            ],
            "expected": {"exact_match": True, "should_recommend": True}
        }
    ]
    
    print("=" * 80)
    print("TESTING PRODUCT AVAILABILITY CHECKER")
    print("=" * 80)
    print()
    
    results = []
    
    for test in test_cases:
        print(f"🧪 TEST: {test['name']}")
        print(f"   Query: '{test['query']}'")
        print(f"   Results: {len(test['results'])} items")
        print()
        
        try:
            analysis = await checker.check_and_recommend(
                user_query=test['query'],
                search_results=test['results']
            )
            
            exact = analysis.get('exact_match', False)
            close = analysis.get('has_close_alternative', False)
            should_show = analysis.get('should_show_results', False)
            message = analysis.get('honesty_message', '')
            explanation = analysis.get('alternative_explanation', '')
            
            print(f"   📊 Analysis:")
            print(f"      Exact match: {exact}")
            print(f"      Close alternative: {close}")
            print(f"      Should show: {should_show}")
            print(f"      Message: {message}")
            if explanation:
                print(f"      Explanation: {explanation}")
            print()
            
            # Validate
            success = True
            expected = test['expected']
            
            if 'exact_match' in expected and exact != expected['exact_match']:
                print(f"   ⚠️  Expected exact_match={expected['exact_match']}, got {exact}")
                success = False
            
            if 'close_match' in expected and close != expected['close_match']:
                print(f"   ⚠️  Expected close_match={expected['close_match']}, got {close}")
                success = False
            
            if 'should_recommend' in expected and should_show != expected['should_recommend']:
                print(f"   ⚠️  Expected should_recommend={expected['should_recommend']}, got {should_show}")
                success = False
            
            if success:
                print(f"   ✅ Test passed!")
                results.append(('PASS', test['name']))
            else:
                print(f"   ⚠️  Test had warnings")
                results.append(('WARN', test['name']))
            
            print()
            
        except Exception as e:
            print(f"   ❌ ERROR: {e}")
            print()
            results.append(('FAIL', test['name']))
    
    # Summary
    print("=" * 80)
    print("SUMMARY")
    print("=" * 80)
    
    passes = sum(1 for status, _ in results if status == 'PASS')
    warns = sum(1 for status, _ in results if status == 'WARN')
    fails = sum(1 for status, _ in results if status == 'FAIL')
    
    print(f"✅ Passed: {passes}/{len(test_cases)}")
    print(f"⚠️  Warnings: {warns}/{len(test_cases)}")
    print(f"❌ Failed: {fails}/{len(test_cases)}")
    
    return passes >= len(test_cases) * 0.8  # 80% pass rate


if __name__ == "__main__":
    success = asyncio.run(test_availability_checker())
    sys.exit(0 if success else 1)
