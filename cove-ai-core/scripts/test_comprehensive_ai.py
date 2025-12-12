#!/usr/bin/env python3
"""
COMPREHENSIVE AI/ML FEATURE TESTING
Tests all implemented features end-to-end with detailed metrics.
"""
import requests
import json
import time
from typing import List, Dict, Any

BASE_URL = "http://localhost:8000"

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    END = '\033[0m'

def print_section(title: str):
    print(f"\n{'='*70}")
    print(f"{Colors.BLUE}{title}{Colors.END}")
    print('='*70)

def print_test(name: str, passed: bool, details: str = ""):
    status = f"{Colors.GREEN}✅ PASS{Colors.END}" if passed else f"{Colors.RED}❌ FAIL{Colors.END}"
    print(f"{status} {name}")
    if details:
        print(f"    {details}")

# Test 1: Intent Classification - BRUTAL EDGE CASES
def test_intent_classification():
    print_section("1. INTENT CLASSIFICATION - EDGE CASES")
    
    test_cases = [
        # Ambiguous phrasing
        ("I want this", "cart_proposal", "Vague cart intent"),
        ("get me something nice", "recommendations", "Vague search"),
        ("what do you think about sizing", "answer", "Open-ended question"),
        
        # Typos and misspellings
        ("shwo me tees", "recommendations", "Typo in search"),
        ("ad hoodie too cart", "cart_proposal", "Multiple typos in cart add"),
        
        # Mixed intent
        ("show me hoodies and add one to cart", "recommendations", "Mixed search + cart"),
        ("compare tees vs hoodies", "recommendations", "Comparison query"),
        
        # Colloquial language
        ("gimme some fresh fits", "recommendations", "Slang search"),
        ("throw that jacket in my bag", "cart_proposal", "Slang cart add"),
        
        # Context-dependent
        ("more like this", "recommendations", "Context-dependent query"),
        ("what about in black", "recommendations", "Follow-up query"),
        
        # Edge cases
        ("???", "answer", "Just question marks"),
        ("large", "answer", "Single word - size query"),
        ("COVE", "recommendations", "Single word - brand"),
    ]
    
    passed = 0
    for query, expected_kind, description in test_cases:
        try:
            resp = requests.post(f"{BASE_URL}/ai/agent/query", json={
                "message": query,
                "top_k": 3,
                "historyScope": "none"
            }, timeout=5)
            data = resp.json()
            actual_kind = data.get('kind')
            is_pass = actual_kind == expected_kind
            passed += is_pass
            print_test(description, is_pass, f"'{query}' → {actual_kind} (expected {expected_kind})")
        except Exception as e:
            print_test(description, False, f"Error: {str(e)[:50]}")
    
    accuracy = (passed / len(test_cases)) * 100
    print(f"\n  Intent Classification Accuracy: {accuracy:.1f}% ({passed}/{len(test_cases)})")
    print(f"  Threshold: 60% (brutal edge cases)")
    return accuracy >= 60  # Lower threshold for edge cases

# Test 2: BM25 Search - CHALLENGING QUERIES
def test_bm25_search():
    print_section("2. BM25 KEYWORD SEARCH - CHALLENGING QUERIES")
    
    test_cases = [
        # Partial brand names
        ("bold hues", "boldhues", "Partial brand name (space)"),
        ("nordic", "nordicthread", "Brand prefix only"),
        
        # Misspellings
        ("cov hoodie", "cove", "Brand typo"),
        ("bouldhues tee", None, "Severe brand typo"),
        
        # Multiple keywords
        ("black cotton tee mens", None, "Multi-attribute query"),
        ("winter outdoor jacket", None, "Seasonal + occasion"),
        
        # Special characters
        ("COVE's best tees", "cove", "Possessive form"),
        ("eco-friendly", "eco", "Hyphenated word"),
        
        # Non-English (if applicable)
        ("vêtements", None, "Foreign language"),
    ]
    
    passed = 0
    for query, expected_brand_match, description in test_cases:
        try:
            resp = requests.post(f"{BASE_URL}/ai/recs/suggest", json={
                "query": query,
                "top_k": 5
            }, timeout=5)
            data = resp.json()
            items = data.get('items', [])
            
            if expected_brand_match:
                found = any(expected_brand_match.lower() in item.get('title', '').lower() for item in items)
                passed += found
                print_test(description, found, f"'{query}' → {len(items)} results, brand match: {found}")
            else:
                has_results = len(items) > 0
                passed += has_results
                print_test(description, has_results, f"'{query}' → {len(items)} results")
        except Exception as e:
            print_test(description, False, f"Error: {str(e)[:50]}")
    
    print(f"\n  BM25 Robustness: {passed}/{len(test_cases)}")
    return passed >= len(test_cases) * 0.6  # 60% threshold

# Test 3: Vector Search & Embeddings - SEMANTIC CHALLENGES
def test_vector_search():
    print_section("3. VECTOR SEARCH - SEMANTIC CHALLENGES")
    
    test_results = []
    
    # Test 1: Abstract concepts
    resp1 = requests.post(f"{BASE_URL}/ai/recs/suggest", json={
        "query": "minimalist aesthetic wardrobe staples",
        "top_k": 5
    })
    items1 = resp1.json().get('items', [])
    has_variant_ids = all(item.get('variantId') for item in items1)
    test_results.append(("Variant IDs populated", has_variant_ids, 
                        f"{sum(1 for i in items1 if i.get('variantId'))}/{len(items1)} items"))
    
    # Test 2: Opposite query
    resp2 = requests.post(f"{BASE_URL}/ai/recs/suggest", json={
        "query": "bold statement pieces for standing out",
        "top_k": 5
    })
    items2 = resp2.json().get('items', [])
    
    # Results should be DIFFERENT
    slugs1 = set(i.get('slug') for i in items1)
    slugs2 = set(i.get('slug') for i in items2)
    are_different = len(slugs1.intersection(slugs2)) < 3
    test_results.append(("Semantic distinction (minimalist vs bold)", are_different,
                        f"Overlap: {len(slugs1.intersection(slugs2))}/5 items"))
    
    # Test 3: Multi-word semantic
    resp3 = requests.post(f"{BASE_URL}/ai/recs/suggest", json={
        "query": "professional business casual outfit ideas",
        "top_k": 5
    })
    items3 = resp3.json().get('items', [])
    has_results = len(items3) > 0
    test_results.append(("Complex semantic query", has_results, 
                        f"{len(items3)} results for business casual"))
    
    # Test 4: Unusual phrasing
    resp4 = requests.post(f"{BASE_URL}/ai/recs/suggest", json={
        "query": "drip check essentials",
        "top_k": 3
    })
    items4 = resp4.json().get('items', [])
    has_slang_results = len(items4) > 0
    test_results.append(("Slang/Gen-Z terminology", has_slang_results,
                        f"{len(items4)} results for 'drip check'"))
    
    for test_name, passed, details in test_results:
        print_test(test_name, passed, details)
    
    return all(result[1] for result in test_results)

# Test 4: Hybrid Search - STRESS TESTING
def test_hybrid_search():
    print_section("4. HYBRID SEARCH (BM25 + Vector + RRF) - STRESS TEST")
    
    test_results = []
    
    # Test 1: Conflicting signals (BM25 vs Vector)
    resp1 = requests.post(f"{BASE_URL}/ai/recs/suggest", json={
        "query": "BoldHues comfortable everyday basics",  # Brand (BM25) + semantic (Vector)
        "top_k": 5
    })
    items1 = resp1.json().get('items', [])
    has_boldhues = any('boldhues' in i.get('title', '').lower() for i in items1)
    test_results.append(("Hybrid fusion (brand + semantic)", has_boldhues and len(items1) > 0,
                        f"BoldHues found: {has_boldhues}, total: {len(items1)}"))
    
    # Test 2: Very long query
    long_query = "I need something comfortable and casual but also stylish and modern for everyday wear that's not too expensive"
    resp2 = requests.post(f"{BASE_URL}/ai/recs/suggest", json={
        "query": long_query,
        "top_k": 5
    })
    items2 = resp2.json().get('items', [])
    handles_long = len(items2) > 0
    test_results.append(("Long query handling", handles_long, 
                        f"{len(items2)} results for {len(long_query)} char query"))
    
    # Test 3: Very short query
    resp3 = requests.post(f"{BASE_URL}/ai/recs/suggest", json={
        "query": "tee",
        "top_k": 5
    })
    items3 = resp3.json().get('items', [])
    has_tees = any('tee' in i.get('type', '').lower() for i in items3)
    test_results.append(("Short query precision", has_tees,
                        f"'tee' → {sum(1 for i in items3 if 'tee' in i.get('type','').lower())}/5 actual tees"))
    
    # Test 4: Result quality (scores decrease)
    scores = [item.get('score', 0) for item in items1 if 'score' in item]
    scores_decrease = all(scores[i] >= scores[i+1] for i in range(len(scores)-1)) if len(scores) > 1 else True
    test_results.append(("RRF score ranking", scores_decrease,
                        f"Scores: {[f'{s:.2f}' for s in scores[:3]]}"))
    
    # Test 5: Result diversity
    brands = set(i.get('title', '').split()[0] for i in items1)
    has_diversity = len(brands) > 1
    test_results.append(("Brand diversity in results", has_diversity,
                        f"{len(brands)} different brands in top 5"))
    
    for test_name, passed, details in test_results:
        print_test(test_name, passed, details)
    
    return sum(result[1] for result in test_results) >= 4  # 4/5 must pass


# Test 5: Collaborative Filtering - PERSONALIZATION CHALLENGES
def test_cf_with_history():
    print_section("5. COLLABORATIVE FILTERING - PERSONALIZATION")
    
    test_results = []
    
    # Test 1: Sparse history (only 1 item)
    sparse_history = [
        {"action": "view", "productId": "PG_HOODIE_BOLDHUES_31", "timestamp": "2024-12-10T10:00:00Z"},
    ]
    
    resp_sparse = requests.post(f"{BASE_URL}/ai/agent/query", json={
        "message": "what would I like",
        "top_k": 5,
        "historyScope": "session",
        "history": sparse_history
    })
    sparse_items = resp_sparse.json().get('items', [])
    handles_sparse = len(sparse_items) > 0
    test_results.append(("Sparse history (1 item)", handles_sparse,
                        f"{len(sparse_items)} recommendations from 1 history item"))
    
    # Test 2: Diverse history (different categories)
    diverse_history = [
        {"action": "view", "productId": "PG_HOODIE_BOLDHUES_31"},
        {"action": "view", "productId": "PG_TEE_COVE_15"},
        {"action": "cart_add", "productId": "PG_JACKET_LUXELINE_89"},
        {"action": "view", "productId": "PG_ACCESSORIES_TECHURBAN_12"},
    ]
    
    resp_diverse = requests.post(f"{BASE_URL}/ai/agent/query", json={
        "message": "recommend something for me",
        "top_k": 5,
        "historyScope": "session",
        "history": diverse_history
    })
    diverse_items = resp_diverse.json().get('items', [])
    
    # Should NOT be all same category
    types = [i.get('type') for i in diverse_items]
    has_variety = len(set(types)) > 1
    test_results.append(("Diverse recommendations", has_variety,
                        f"{len(set(types))} different types recommended"))
    
    # Test 3: WITH history vs WITHOUT history
    resp_no_history = requests.post(f"{BASE_URL}/ai/agent/query", json={
        "message": "recommend something for me",
        "top_k": 5,
        "historyScope": "none"
    })
    
    with_slugs = set(i.get('slug') for i in diverse_items)
    without_slugs = set(i.get('slug') for i in resp_no_history.json().get('items', []))
    
    personalized = len(with_slugs - without_slugs) > 0
    diff_percent = len(with_slugs - without_slugs) / max(len(with_slugs), 1) * 100
    test_results.append(("Personalization effect", personalized,
                        f"{diff_percent:.0f}% different items with history"))
    
    # Test 4: Extreme repeats (same product viewed 10 times)
    repeat_history = [{"action": "view", "productId": "PG_TEE_COVE_15", "timestamp": f"2024-12-10T10:{i:02d}:00Z"} for i in range(10)]
    
    resp_repeat = requests.post(f"{BASE_URL}/ai/agent/query", json={
        "message": "show me more",
        "top_k": 5,
        "historyScope": "session",
        "history": repeat_history
    })
    repeat_items = resp_repeat.json().get('items', [])
    
    # Should still return results (not crash)
    handles_repeats = len(repeat_items) > 0
    test_results.append(("Handle repeat views", handles_repeats,
                        f"{len(repeat_items)} items despite 10x same view"))
    
    for test_name, passed, details in test_results:
        print_test(test_name, passed, details)
    
    return sum(result[1] for result in test_results) >= 3  # 3/4 must pass

# Test 6: Context-Aware (Show More) - DEDUPLICATION CHALLENGES
def test_context_aware():
    print_section("6. CONTEXT-AWARE RECOMMENDATIONS - DEDUPLICATION")
    
    test_results = []
    session_id = f"test-brutal-{int(time.time())}"
    
    # Test 1: Basic "show more"
    resp1 = requests.post(f"{BASE_URL}/ai/agent/query", json={
        "message": "show me tees",
        "top_k": 3,
        "historyScope": "session",
        "guestSessionId": session_id
    })
    first_items = set(i.get('slug') for i in resp1.json().get('items', []))
    
    # Build history properly
    history1 = [{"query": "show me tees", "response": resp1.json()}]
    
    resp2 = requests.post(f"{BASE_URL}/ai/agent/query", json={
        "message": "show me more",
        "top_k": 3,
        "historyScope": "session",
        "guestSessionId": session_id,
        "history": history1
    })
    second_items = set(i.get('slug') for i in resp2.json().get('items', []))
    
    no_overlap = len(first_items.intersection(second_items)) == 0
    test_results.append(("Basic show more (no duplicates)", no_overlap,
                        f"Overlap: {len(first_items.intersection(second_items))}/3 items"))
    
    # Test 2: Multiple "show more" in sequence
    history2 = history1 + [{"query": "show more", "response": resp2.json()}]
    
    resp3 = requests.post(f"{BASE_URL}/ai/agent/query", json={
        "message": "show more again",
        "top_k": 3,
        "historyScope": "session",
        "guestSessionId": session_id,
        "history": history2
    })
    third_items = set(i.get('slug') for i in resp3.json().get('items', []))
    
    all_shown = first_items | second_items
    still_new = len(third_items - all_shown) > 0
    test_results.append(("Multiple show more (still unique)", still_new,
                        f"{len(third_items - all_shown)}/3 items are new"))
    
    # Test 3: Ambiguous follow-up
    resp_ambiguous = requests.post(f"{BASE_URL}/ai/agent/query", json={
        "message": "other colors",
        "top_k": 3,
        "historyScope": "session",
        "guestSessionId": session_id,
        "history": history1
    })
    ambiguous_items = resp_ambiguous.json().get('items', [])
    
    has_results = len(ambiguous_items) > 0
    test_results.append(("Ambiguous context query", has_results,
                        f"'{resp_ambiguous.json().get('kind')}' with {len(ambiguous_items)} items"))
    
    # Test 4: Context switch
    resp_switch = requests.post(f"{BASE_URL}/ai/agent/query", json={
        "message": "actually show me hoodies instead",
        "top_k": 3,
        "historyScope": "session",
        "guestSessionId": session_id,
        "history": history2
    })
    switch_items = resp_switch.json().get('items', [])
    
    # Should return hoodies, not tees
    has_hoodies = any('hoodie' in i.get('type', '').lower() for i in switch_items)
    test_results.append(("Context switch (new product type)", has_hoodies,
                        f"{sum(1 for i in switch_items if 'hoodie' in i.get('type','').lower())}/3 hoodies"))
    
    for test_name, passed, details in test_results:
        print_test(test_name, passed, details)
    
    return sum(result[1] for result in test_results) >= 3  # 3/4 must pass

# Test 7: Multi-Turn Conversation - COMPLEX DIALOGUES
def test_multi_turn():
    print_section("7. MULTI-TURN CONVERSATION - COMPLEX DIALOGUES")
    
    test_results = []
    session_id = f"test-conversation-brutal-{int(time.time())}"
    history = []
    
    # Complex conversation flow
    conversation = [
        ("show me hoodies", "recommendations"),
        ("what about in black", "recommendations"),  # Follow-up
        ("hmm not quite right", "recommendations"),  # Negative feedback
        ("show me something cheaper", "recommendations"),  # Price constraint
        ("add the second one to cart in large", "cart_proposal"),  # Cart add with position
        ("actually make it medium", "cart_proposal"),  # Change size
        ("what sizes do you have", "answer"),  # Question
    ]
    
    correct_intents = 0
    for i, (query, expected_kind) in enumerate(conversation, 1):
        try:
            resp = requests.post(f"{BASE_URL}/ai/agent/query", json={
                "message": query,
                "top_k": 3,
                "historyScope": "session",
                "guestSessionId": session_id,
                "history": history
            }, timeout=10)
            data = resp.json()
            kind = data.get('kind')
            
            # Add to history
            history.append({"query": query, "response": data})
            
            is_correct = kind == expected_kind
            correct_intents += is_correct
            
            print(f"  Turn {i}: '{query}' → {kind} {'✅' if is_correct else f'❌ (expected {expected_kind})'}")
        except Exception as e:
            print(f"  Turn {i}: ❌ Error: {str(e)[:40]}")
    
    # Success metrics
    intent_accuracy = correct_intents / len(conversation)
    test_results.append(("Intent accuracy in conversation", intent_accuracy >= 0.7,
                        f"{correct_intents}/{len(conversation)} correct ({intent_accuracy*100:.0f}%)"))
    
    # Check if cart was proposed with correct info
    last_cart_turns = [h for h in history if h.get('response', {}).get('kind') == 'cart_proposal']
    has_cart_proposals = len(last_cart_turns) > 0
    test_results.append(("Cart proposals generated", has_cart_proposals,
                        f"{len(last_cart_turns)} cart proposals in {len(conversation)} turns"))
    
    # Check if size change was captured
    if len(last_cart_turns) >= 2:
        first_size = last_cart_turns[0].get('response', {}).get('cart_payload', {}).get('size')
        last_size = last_cart_turns[-1].get('response', {}).get('cart_payload', {}).get('size')
        size_changed = first_size != last_size
        test_results.append(("Size modification handled", size_changed,
                            f"Size changed from {first_size} to {last_size}"))
    else:
        test_results.append(("Size modification handled", False, "No size changes detected"))
    
    for test_name, passed, details in test_results:
        print_test(test_name, passed, details)
    
    return sum(result[1] for result in test_results) >= 2  # 2/3 must pass

# Test 8: Performance - LOAD TESTING
def test_performance():
    print_section("8. PERFORMANCE - LOAD TESTING")
    
    test_results = []
    
    # Test 1: Individual query latency
    queries = [
        "show me tees",
        "BoldHues hoodie black medium",
        "minimalist aesthetic everyday basics",
        "add COVE jacket to cart in size L"
    ]
    
    times = []
    for query in queries:
        start = time.time()
        try:
            resp = requests.post(f"{BASE_URL}/ai/agent/query", json={
                "message": query,
                "top_k": 5,
                "historyScope": "none"
            }, timeout=10)
            duration = time.time() - start
            times.append(duration)
            print(f"  '{query[:30]}...': {duration*1000:.0f}ms")
        except Exception as e:
            print(f"  '{query[:30]}...': ❌ {str(e)[:30]}")
            times.append(10.0)  # Penalty
    
    avg_time = sum(times) / len(times)
    is_fast = avg_time < 2.5  # Relaxed threshold for complex queries
    test_results.append(("Average latency (<2.5s)", is_fast,
                        f"{avg_time*1000:.0f}ms average"))
    
    # Test 2: Concurrent requests
    print("\n  Testing concurrent requests...")
    concurrent_queries = ["show me tees", "COVE hoodie", "casual wear"] * 3
    
    start_concurrent = time.time()
    # Simple sequential test (not true concurrency but tests throughput)
    for q in concurrent_queries:
        try:
            requests.post(f"{BASE_URL}/ai/agent/query", json={
                "message": q,
                "top_k": 3,
                "historyScope": "none"
            }, timeout=5)
        except:
            pass
    
    total_time = time.time() - start_concurrent
    throughput = len(concurrent_queries) / total_time
    test_results.append(("Throughput (>2 req/s)", throughput > 2,
                        f"{throughput:.1f} requests/second"))
    
    # Test 3: Large result set
    start_large = time.time()
    try:
        resp_large = requests.post(f"{BASE_URL}/ai/recs/suggest", json={
            "query": "clothing",
            "top_k": 20  # Large result set
        }, timeout=10)
        large_time = time.time() - start_large
        large_items = resp_large.json().get('items', [])
        
        handles_large = len(large_items) == 20 and large_time < 3.0
        test_results.append(("Large result set (20 items <3s)", handles_large,
                            f"{len(large_items)} items in {large_time*1000:.0f}ms"))
    except Exception as e:
        test_results.append(("Large result set (20 items <3s)", False,
                            f"Error: {str(e)[:40]}"))
    
    for test_name, passed, details in test_results:
        print_test(test_name, passed, details)
    
    return sum(result[1] for result in test_results) >= 2  # 2/3 must pass

# Main Test Runner
def main():
    print(f"\n{Colors.BLUE}{'='*70}")
    print("COMPREHENSIVE AI/ML FEATURE TEST SUITE")
    print(f"{'='*70}{Colors.END}\n")
    
    print("Testing against:", BASE_URL)
    print("Starting comprehensive tests...\n")
    
    results = {
        "Intent Classification": test_intent_classification(),
        "BM25 Search": test_bm25_search(),
        "Vector Search": test_vector_search(),
        "Hybrid Search": test_hybrid_search(),
        "Collaborative Filtering": test_cf_with_history(),
        "Context Awareness": test_context_aware(),
        "Multi-Turn Conversation": test_multi_turn(),
        "Performance": test_performance(),
    }
    
    # Summary
    print_section("TEST SUMMARY")
    passed = sum(results.values())
    total = len(results)
    
    for test_name, result in results.items():
        status = f"{Colors.GREEN}✅{Colors.END}" if result else f"{Colors.RED}❌{Colors.END}"
        print(f"{status} {test_name}")
    
    print(f"\n{Colors.BLUE}Overall: {passed}/{total} tests passed ({passed/total*100:.1f}%){Colors.END}\n")
    
    if passed == total:
        print(f"{Colors.GREEN}🎉 ALL TESTS PASSED - PRODUCTION READY!{Colors.END}\n")
    else:
        print(f"{Colors.YELLOW}⚠️  Some tests failed - review and improve{Colors.END}\n")

if __name__ == "__main__":
    main()
