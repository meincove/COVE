
import httpx
import json
import sys
import time
import random

BASE_URL = "http://127.0.0.1:8000/ai/agent/query"
HEADERS = {"Content-Type": "application/json"}

# Colors
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
RESET = "\033[0m"

def log(msg, success=True, warning=False):
    if warning:
        color = YELLOW
        icon = "⚠️ "
    else:
        color = GREEN if success else RED
        icon = "✅" if success else "❌"
    print(f"{color}{icon} {msg}{RESET}")

def run_query(message, session_id, session_type="main", extra=None):
    payload = {
        "message": message,
        "guestSessionId": session_id,
        "sessionType": session_type,
        "historyScope": "user"
    }
    if extra:
        payload.update(extra)
        
    try:
        resp = httpx.post(BASE_URL, json=payload, headers=HEADERS, timeout=30.0)
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        log(f"Request failed: {e}", success=False)
        return None

def test_greeting():
    print(f"\n--- Testing Greeting ---")
    session_id = f"test-sess-{int(time.time())}"
    data = run_query("Hello there", session_id)
    
    if data and data.get("answer"):
        log("Greeting received")
        return True
    return False

def test_recs_flow_basic():
    print(f"\n--- Testing Basic Recs -> Question -> Cart -> Checkout ---")
    session_id = f"test-sess-basic-{int(time.time())}"
    
    # 1. Recommendations
    print("1. Asking for hoodies...")
    data = run_query("Show me some hoodies", session_id)
    if not data or not data.get("items"):
        log("No items returned", success=False)
        return False
    
    items = data["items"]
    log(f"Received {len(items)} items")
    
    # 2. Context Question
    print("\n2. Asking context question...")
    time.sleep(1) 
    data = run_query("What material is the first one?", session_id)
    if data and "answer" in data:
         log("Context answer received")
    else:
         log("Context answer missing", success=False)
        
    # 3. Cart Add
    print("\n3. Adding to cart...")
    data = run_query("Add it to my cart", session_id)
    kind = data.get("kind")
    if kind == "cart_proposal" or (kind == "tool_call" and "cart" in str(data)):
         log("Cart intent detected")
    else:
        log(f"Failed to trigger cart add. Kind: {kind}", success=False)
        return False

    return True

def test_extended_filters():
    print(f"\n--- Testing Extended Filters (Colors/Types) ---")
    session_id = f"test-sess-filters-{int(time.time())}"
    
    scenarios = [
        ("black hoodies", "hoodie", ["black", "dark", "charcoal"]),
        ("blue tees", "tee", ["blue", "navy"]),
        ("beige pants", "pants", ["beige", "sand", "khaki"]),
        ("white shoes", "sneakers", ["white"]), 
    ]
    
    all_pass = True
    for query, expected_type, expected_colors in scenarios:
        print(f"\nTesting: '{query}'...")
        data = run_query(f"Show me {query}", session_id)
        
        if not data or not data.get("items"):
            log(f"No items for '{query}' - verifying if expected", warning=True)
            # Might be empty DB, so don't fail hard unless zero recs always
            # But we expect some mock data usually
            continue
            
        items = data["items"]
        if not items:
            continue
            
        # Verify type/color loosely
        matches_color = 0
        matches_type = 0
        for item in items:
            title = item.get("title", "").lower()
            color = item.get("color", "").lower()
            
            # Type check (title usually contains it)
            if expected_type in title or (item.get("type") and expected_type in item.get("type").lower()):
                matches_type += 1
                
            # Color check
            c_match = False
            for c in expected_colors:
                 if c in color or c in title:
                     c_match = True
                     break
            if c_match:
                matches_color += 1

        log(f"Received {len(items)} items. Type matches: {matches_type}, Color matches: {matches_color}")
        
        if matches_type == 0 and len(items) > 0:
             log(f"Type mismatch for '{query}'", warning=True)
             all_pass = False # Warn but maybe don't fail if relevance is fuzzy
        
    return all_pass

def test_context_switching():
    print(f"\n--- Testing Context Switching ---")
    session_id = f"test-sess-switch-{int(time.time())}"
    
    # 1. Hoodies
    print("1. Hoodies...")
    run_query("Show me hoodies", session_id)
    
    # 2. Switch to Pants
    print("2. Actually show me pants...")
    data = run_query("Actually show me pants instead", session_id)
    items = data.get("items", [])
    
    pants_count = sum(1 for i in items if "pant" in i.get("title", "").lower())
    log(f"Found {pants_count} pants in {len(items)} items")
    
    if pants_count > 0:
        return True
    
    log("Context switch failed (still showing hoodies?)", success=False)
    return False

def test_empty_results():
    print(f"\n--- Testing Empty/Edge Cases ---")
    session_id = f"test-sess-edge-{int(time.time())}"
    
    # 1. Nonsense
    print("1. Nonsense query...")
    data = run_query("Show me neon pink tuxedo with wings", session_id)
    
    items = data.get("items", [])
    if not items:
        log("Correctly handled empty results (no hallucination)")
    else:
        log(f"Returned {len(items)} items for nonsense (fuzzy match fallback?)", warning=True)
        # Should ideally be generic or empty
    
    return True

def main():
    print("🚀 Starting Extended E2E Verification")
    
    tests = [
        test_greeting,
        test_recs_flow_basic,
        test_extended_filters,
        test_context_switching,
        test_empty_results
    ]
    
    results = []
    for t in tests:
        try:
            success = t()
            results.append(success)
        except Exception as e:
            log(f"Test crashed: {e}", success=False)
            results.append(False)
            
    if all(results):
        print(f"\n{GREEN}ALL EXTENDED TESTS PASSED!{RESET}")
        sys.exit(0)
    else:
        print(f"\n{RED}SOME TESTS FAILED{RESET}")
        sys.exit(1)

if __name__ == "__main__":
    main()
