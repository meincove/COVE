#!/usr/bin/env python3
"""
Multi-Turn Context Test - 8-9 turns with diverse user-like queries
Tests if context is maintained across conversation turns
"""
import requests
import json
import time

BASE_URL = "http://127.0.0.1:8000/ai/agent/query"
SESSION_ID = f"multi-turn-test-{int(time.time())}"

# Conversation turns - realistic user queries
TURNS = [
    ("hey", "Greeting"),
    ("looking for something casual for the weekend", "Casual Product Search"),
    ("what colors do you have?", "Context Question - Colors"),
    ("not really feeling these, got anything else?", "Show More Request"),
    ("tell me more about the second one", "Product Question"),
    ("that's cool but show me some pants instead", "Context Switch to Pants"),
    ("got any in black?", "Color Filter on Pants"),
    ("these are nice, I'll take the first one", "Cart Add Request"),
    ("actually wait, show me jackets", "Context Switch to Jackets"),
]

def send_message(message: str, history: list) -> dict:
    """Send a message and return the response"""
    payload = {
        "message": message,
        "history": history,
        "guestSessionId": SESSION_ID,
        "top_k": 6
    }
    try:
        resp = requests.post(BASE_URL, json=payload, timeout=30)
        return resp.json()
    except Exception as e:
        return {"error": str(e)}

def extract_product_types(items: list) -> list:
    """Extract product types from items"""
    return [i.get("type", "?") for i in items[:4]]

def main():
    print(f"🚀 Multi-Turn Context Test")
    print(f"   Session: {SESSION_ID}")
    print(f"   Turns: {len(TURNS)}")
    print("=" * 70)
    
    history = []
    results = []
    
    for i, (query, description) in enumerate(TURNS, 1):
        print(f"\n--- Turn {i}: {description} ---")
        print(f"👤 User: \"{query}\"")
        
        resp = send_message(query, history)
        
        if "error" in resp:
            print(f"❌ Error: {resp['error']}")
            results.append((i, description, "ERROR", resp['error']))
            continue
        
        kind = resp.get("kind", "unknown")
        answer = resp.get("answer", "")[:150]
        items = resp.get("items", [])
        item_count = len(items)
        types = extract_product_types(items)
        
        print(f"🤖 Kind: {kind}, Items: {item_count}")
        if types:
            print(f"   Types: {types}")
        print(f"   Answer: {answer}...")
        
        # Update history
        history.append({"role": "user", "content": query})
        history.append({"role": "assistant", "content": answer})
        
        # Analyze result
        success = True
        notes = []
        
        if i == 1:  # Greeting
            success = kind in ["answer", "greeting", "recommendations"]
            notes.append("Greeting flow")
        elif i == 2:  # Casual product search
            success = item_count > 0
            notes.append(f"Found {item_count} products")
        elif i == 3:  # Context question about colors
            success = kind == "answer" and "color" in answer.lower() or item_count > 0
            notes.append("Color context")
        elif i == 4:  # Show more request
            success = item_count > 0
            notes.append("Show more pagination")
        elif i == 5:  # Product question
            success = kind == "answer" or "second" in answer.lower() or item_count > 0
            notes.append("Product detail question")
        elif i == 6:  # Context switch to pants
            success = item_count > 0 and ("pant" in str(types).lower() or "trouser" in str(types).lower())
            notes.append(f"Context switch: {types}")
        elif i == 7:  # Black pants filter
            success = item_count > 0
            notes.append("Color filter on pants")
        elif i == 8:  # Cart add
            success = kind in ["cart_proposal", "answer", "recommendations"]
            notes.append(f"Cart intent: {kind}")
        elif i == 9:  # Context switch to jackets
            success = item_count > 0 and "jacket" in str(types).lower()
            notes.append(f"Switch to jackets: {types}")
        
        status = "✅ PASS" if success else "⚠️ CHECK"
        print(f"   {status}: {', '.join(notes)}")
        results.append((i, description, status, notes))
        
        time.sleep(0.5)  # Small delay between requests
    
    # Summary
    print("\n" + "=" * 70)
    print("📊 SUMMARY")
    print("=" * 70)
    passed = sum(1 for r in results if "PASS" in r[2])
    print(f"Passed: {passed}/{len(results)}")
    
    for turn, desc, status, notes in results:
        print(f"  Turn {turn}: {status} - {desc}")
    
    print("\n🏁 Test Complete!")

if __name__ == "__main__":
    main()
