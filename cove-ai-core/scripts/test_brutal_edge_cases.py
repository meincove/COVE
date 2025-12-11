#!/usr/bin/env python3
"""
🔥 BRUTAL EDGE CASE TEST SUITE 🔥

Tests designed to BREAK the system and find every possible failure mode.
No mercy. We want to know where it fails BEFORE users do.
"""

import requests
import json
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
import sys

BASE_URL = "http://localhost:8000"
SUGGEST_ENDPOINT = f"{BASE_URL}/ai/recs/suggest"

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    END = '\033[0m'

def test_request(query, top_k=5, expected_brands=None, should_fail=False, test_name=""):
    """Make a request and validate results"""
    try:
        response = requests.post(
            SUGGEST_ENDPOINT,
            json={"query": query, "user_id": None, "top_k": top_k},
            timeout=10
        )
        
        if should_fail:
            if response.status_code != 200:
                return True, f"✅ Correctly failed (HTTP {response.status_code})"
            return False, f"❌ Should have failed but got 200"
        
        if response.status_code != 200:
            return False, f"❌ HTTP {response.status_code}: {response.text[:100]}"
        
        data = response.json()
        items = data.get('items', [])
        
        if not items:
            return False, f"❌ No results returned"
        
        # Extract brands
        brands = set()
        for item in items:
            title = item.get('title', '')
            if title:
                brand = title.split()[0]  # First word is brand
                brands.add(brand)
        
        # Check expected brands
        if expected_brands:
            if isinstance(expected_brands, set):
                if brands == expected_brands:
                    return True, f"✅ Correct brands: {brands}"
                else:
                    return False, f"❌ Expected {expected_brands}, got {brands}"
            else:  # Single brand
                if len(brands) == 1 and list(brands)[0] == expected_brands:
                    return True, f"✅ All results from {expected_brands}"
                else:
                    return False, f"❌ Expected only {expected_brands}, got {brands}"
        
        return True, f"✅ {len(items)} results, {len(brands)} brands: {brands}"
        
    except requests.exceptions.Timeout:
        return False, f"❌ Timeout (>10s)"
    except Exception as e:
        if should_fail:
            return True, f"✅ Correctly failed: {str(e)[:50]}"
        return False, f"❌ Exception: {str(e)[:100]}"


def print_test(category, test_name, passed, message):
    """Pretty print test results"""
    status = f"{Colors.GREEN}PASS{Colors.END}" if passed else f"{Colors.RED}FAIL{Colors.END}"
    print(f"  [{status}] {test_name}: {message}")
    return passed


print("\n" + "="*80)
print(f"{Colors.BLUE}🔥 BRUTAL EDGE CASE TEST SUITE 🔥{Colors.END}")
print("Testing COVE AI Core with extreme edge cases")
print("="*80 + "\n")

total_tests = 0
passed_tests = 0

# =============================================================================
# CATEGORY 1: EMPTY/NULL/INVALID INPUTS
# =============================================================================
print(f"\n{Colors.YELLOW}Category 1: Empty/Null/Invalid Inputs{Colors.END}")
print("-" * 80)

tests = [
    ("", None, False, "Empty string query"),
    ("   ", None, False, "Whitespace-only query"),
    ("\\n\\t", None, False, "Escape characters query"),
    (None, None, True, "NULL query (should fail)"),
]

for query, expected, should_fail, name in tests:
    total_tests += 1
    passed, msg = test_request(query, expected_brands=expected, should_fail=should_fail)
    if print_test("Empty", name, passed, msg):
        passed_tests += 1

# =============================================================================
# CATEGORY 2: SQL INJECTION & XSS ATTEMPTS
# =============================================================================
print(f"\n{Colors.YELLOW}Category 2: Injection Attack Attempts{Colors.END}")
print("-" * 80)

injection_tests = [
    ("'; DROP TABLE docs; --", None, False, "SQL injection attempt"),
    ("<script>alert('xss')</script>", None, False, "XSS attempt"),
    ("1' OR '1'='1", None, False, "SQL boolean injection"),
    ("../../../etc/passwd", None, False, "Path traversal"),
    ("%00 null byte", None, False, "Null byte injection"),
]

for query, expected, should_fail, name in injection_tests:
    total_tests += 1
    passed, msg = test_request(query, expected_brands=expected, should_fail=should_fail)
    if print_test("Injection", name, passed, msg):
        passed_tests += 1

# =============================================================================
# CATEGORY 3: EXTREME LENGTHS
# =============================================================================
print(f"\n{Colors.YELLOW}Category 3: Extreme Query Lengths{Colors.END}")
print("-" * 80)

length_tests = [
    ("a", None, False, "Single character"),
    ("ab", None, False, "Two characters"),
    ("hoodie " * 100, None, False, "Very long query (600 chars)"),
    ("x" * 1000, None, False, "1000 character query"),
    ("COVE " * 500, "COVE", False, "500x repeated brand name"),
]

for query, expected, should_fail, name in length_tests:
    total_tests += 1
    passed, msg = test_request(query, expected_brands=expected, should_fail=should_fail)
    if print_test("Length", name, passed, msg):
        passed_tests += 1

# =============================================================================
# CATEGORY 4: SPECIAL CHARACTERS & UNICODE
# =============================================================================
print(f"\n{Colors.YELLOW}Category 4: Special Characters & Unicode{Colors.END}")
print("-" * 80)

special_tests = [
    ("COVE!!!!", "COVE", False, "Exclamation marks"),
    ("höödie", None, False, "Umlaut characters"),
    ("тээ", None, False, "Cyrillic characters"),
    ("👕 tee", None, False, "Emoji in query"),
    ("COVE@#$%^&*()", "COVE", False, "Special symbols"),
    ("100% cotton hoodie", None, False, "Percentage sign"),
    ("$49.99 tee", None, False, "Dollar sign and decimal"),
]

for query, expected, should_fail, name in special_tests:
    total_tests += 1
    passed, msg = test_request(query, expected_brands=expected, should_fail=should_fail)
    if print_test("Special", name, passed, msg):
        passed_tests += 1

# =============================================================================
# CATEGORY 5: BRAND NAME EDGE CASES
# =============================================================================
print(f"\n{Colors.YELLOW}Category 5: Brand Name Edge Cases{Colors.END}")
print("-" * 80)

brand_tests = [
    ("cove hoodie", "COVE", False, "Lowercase brand name"),
    ("COVE HOODIE", "COVE", False, "Uppercase brand name"),
    ("CoVe HoOdIe", "COVE", False, "Mixed case brand"),
    ("COVEhoodie", "COVE", False, "No space between brand/product"),
    ("C O V E hoodie", "COVE", False, "Spaced brand letters"),
    ("NotARealBrand tee", None, False, "Non-existent brand"),
    ("UrbanPuls jacket", "UrbanPulse", False, "Typo in brand name (missing 'e')"),
    ("Urb Puls jacket", None, False, "Severely misspelled brand"),
]

for query, expected, should_fail, name in brand_tests:
    total_tests += 1
    passed, msg = test_request(query, expected_brands=expected, should_fail=should_fail)
    if print_test("Brand", name, passed, msg):
        passed_tests += 1

# =============================================================================
# CATEGORY 6: PRODUCT TYPE TYPOS & VARIANTS
# =============================================================================
print(f"\n{Colors.YELLOW}Category 6: Product Type Typos{Colors.END}")
print("-" * 80)

typo_tests = [
    ("hodie", None, False, "Missing 'o' in hoodie"),
    ("hoddie", None, False, "Extra 'd' in hoodie"),
    ("jackett", None, False, "Extra 't' in jacket"),
    ("tshirt", None, False, "T-shirt no hyphen"),
    ("t-shirt", None, False, "T-shirt with hyphen"),
    ("teeee", None, False, "Extra letters"),
    ("swetr", None, False, "Missing vowels"),
]

for query, expected, should_fail, name in typo_tests:
    total_tests += 1
    passed, msg = test_request(query, expected_brands=expected, should_fail=should_fail)
    if print_test("Typo", name, passed, msg):
        passed_tests += 1

# =============================================================================
# CATEGORY 7: BOUNDARY CONDITIONS
# =============================================================================
print(f"\n{Colors.YELLOW}Category 7: Boundary Conditions{Colors.END}")
print("-" * 80)

boundary_tests = [
    ("hoodie", 0, True, "top_k = 0 (should fail or return empty)"),
    ("hoodie", 1, False, "top_k = 1 (minimum)"),
    ("hoodie", 100, False, "top_k = 100 (very large)"),
    ("hoodie", -1, True, "top_k = -1 (negative, should fail)"),
]

for query, top_k, should_fail, name in boundary_tests:
    total_tests += 1
    try:
        response = requests.post(
            SUGGEST_ENDPOINT,
            json={"query": query, "user_id": None, "top_k": top_k},
            timeout=10
        )
        if should_fail:
            # Accept both 4xx errors (400, 422 for validation) and non-200
            passed = response.status_code >= 400
            msg = f"✅ Correctly failed (HTTP {response.status_code})" if passed else f"❌ Should have failed but got {response.status_code}"
        else:
            passed = response.status_code == 200
            items = response.json().get('items', []) if passed else []
            msg = f"✅ {len(items)} results" if passed else f"❌ HTTP {response.status_code}"
    except Exception as e:
        passed = should_fail
        msg = f"✅ Correctly failed: {str(e)[:50]}" if should_fail else f"❌ Exception: {str(e)[:50]}"
    
    if print_test("Boundary", name, passed, msg):
        passed_tests += 1

# =============================================================================
# CATEGORY 8: AMBIGUOUS/CONFLICTING QUERIES
# =============================================================================
print(f"\n{Colors.YELLOW}Category 8: Ambiguous Queries{Colors.END}")
print("-" * 80)

ambiguous_tests = [
    ("COVE UrbanPulse hoodie", None, False, "Two brands in one query"),
    ("black white red blue green tee", None, False, "Multiple colors"),
    ("expensive cheap hoodie", None, False, "Contradictory adjectives"),
    ("mens womens unisex jacket", None, False, "All genders"),
    ("small large XL hoodie", None, False, "Multiple sizes"),
]

for query, expected, should_fail, name in ambiguous_tests:
    total_tests += 1
    passed, msg = test_request(query, expected_brands=expected, should_fail=should_fail)
    if print_test("Ambiguous", name, passed, msg):
        passed_tests += 1

# =============================================================================
# CATEGORY 9: PERFORMANCE STRESS TEST
# =============================================================================
print(f"\n{Colors.YELLOW}Category 9: Performance & Concurrency{Colors.END}")
print("-" * 80)

# Rapid fire same query
print("  Testing: 10 identical queries in rapid succession")
start = time.time()
for i in range(10):
    requests.post(SUGGEST_ENDPOINT, json={"query": "hoodie", "top_k": 5}, timeout=10)
elapsed = time.time() - start
total_tests += 1
passed = elapsed < 30  # Should complete in <30s total
msg = f"✅ {elapsed:.1f}s for 10 queries ({elapsed/10:.1f}s avg)" if passed else f"❌ Too slow: {elapsed:.1f}s"
if print_test("Performance", "Rapid fire queries", passed, msg):
    passed_tests += 1

# Concurrent requests
print("  Testing: 5 concurrent different queries")
queries = ["COVE hoodie", "UrbanPulse tee", "jacket", "sweater", "accessories"]
start = time.time()
with ThreadPoolExecutor(max_workers=5) as executor:
    futures = [executor.submit(test_request, q) for q in queries]
    results = [f.result() for f in as_completed(futures)]
elapsed = time.time() - start
total_tests += 1
all_passed = all(r[0] for r in results)
msg = f"✅ {len(results)} concurrent requests in {elapsed:.1f}s" if all_passed else f"❌ Some failed"
if print_test("Performance", "Concurrent queries", all_passed, msg):
    passed_tests += 1

# =============================================================================
# FINAL RESULTS
# =============================================================================
print("\n" + "="*80)
print(f"{Colors.BLUE}FINAL RESULTS{Colors.END}")
print("="*80)
print(f"Total Tests: {total_tests}")
print(f"Passed: {Colors.GREEN}{passed_tests}{Colors.END}")
print(f"Failed: {Colors.RED}{total_tests - passed_tests}{Colors.END}")
print(f"Success Rate: {passed_tests/total_tests*100:.1f}%")
print("="*80 + "\n")

if passed_tests == total_tests:
    print(f"{Colors.GREEN}🎉 ALL TESTS PASSED - System is robust!{Colors.END}\n")
    sys.exit(0)
else:
    print(f"{Colors.YELLOW}⚠️  Some tests failed - Review failures above{Colors.END}\n")
    sys.exit(1)
