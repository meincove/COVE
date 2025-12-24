"""
Comprehensive Product Detail Test

Tests deep product questions and switching between products:
1. Show hoodies
2. Ask deep details about first one (price, material, tier)
3. Ask about second one
4. Switch to different product type
5. Go back and ask about first hoodie again
6. Compare products from different turns
"""

import asyncio
import httpx

SESSION_ID = "deep_product_test"
AI_CORE_URL = "http://localhost:8000"


async def send_and_check(turn: int, message: str, check_for: list = None) -> dict:
    """Send message and check response"""
    print(f"\n{'='*80}")
    print(f"TURN {turn}: {message}")
    print(f"{'='*80}")
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{AI_CORE_URL}/ai/agent/query",
            json={
                "message": message,
                "guestSessionId": SESSION_ID,
                "historyScope": "user"
            }
        )
        
        if response.status_code != 200:
            print(f"❌ ERROR {response.status_code}: {response.text[:200]}")
            return {"success": False, "answer": "", "error": True}
        
        data = response.json()
        answer = data.get('answer', '')
        items = data.get('items', [])
        
        print(f"✅ AI Response:")
        print(f"   {answer[:400]}...")
        
        if items:
            print(f"\n📦 Showed {len(items)} items:")
            for i, item in enumerate(items[:3], 1):
                print(f"   {i}. {item.get('title', 'Unknown')}")
        
        # Check for keywords
        success = True
        if check_for:
            found = [kw for kw in check_for if kw.lower() in answer.lower()]
            missing = [kw for kw in check_for if kw.lower() not in answer.lower()]
            
            if found:
                print(f"\n✅ Found keywords: {', '.join(found)}")
            if missing:
                print(f"⚠️  Missing keywords: {', '.join(missing)}")
            
            success = len(found) >= len(check_for) / 2  # At least half found
        
        return {
            "success": success,
            "answer": answer,
            "items": items,
            "error": False
        }


async def run_deep_test():
    """Run comprehensive deep product test"""
    print("\n" + "🔬 " * 40)
    print("DEEP PRODUCT DETAIL & SWITCHING TEST")
    print("🔬 " * 40)
    
    results = []
    
    # TURN 1: Show hoodies
    print("\n" + "="*80)
    print("PHASE 1: Initial Product Display")
    print("="*80)
    r1 = await send_and_check(1, "show me hoodies")
    await asyncio.sleep(3)  # Wait for fact extraction
    
    # TURN 2: Ask deep details about FIRST hoodie
    print("\n" + "="*80)
    print("PHASE 2: Deep Questions About First Product")
    print("="*80)
    r2 = await send_and_check(2, "what can you tell me about the first one?", ["hoodie"])
    results.append(("Turn 2: Details about first hoodie", r2["success"] and not r2["error"]))
    await asyncio.sleep(1)
    
    # TURN 3: Ask about price of first one
    r3 = await send_and_check(3, "what's the price of that hoodie?", ["price"])
    results.append(("Turn 3: Price question", r3["success"] and not r3["error"]))
    await asyncio.sleep(1)
    
    # TURN 4: Ask about material/tier
    r4 = await send_and_check(4, "what tier is it? is it premium or casual?", ["tier", "casual", "premium"])
    results.append(("Turn 4: Tier question", r4["success"] and not r4["error"]))
    await asyncio.sleep(1)
    
    # TURN 5: Switch to SECOND hoodie
    print("\n" + "="*80)
    print("PHASE 3: Switching to Second Product")
    print("="*80)
    r5 = await send_and_check(5, "what about the second hoodie you showed?", ["hoodie"])
    results.append(("Turn 5: Second hoodie reference", r5["success"] and not r5["error"]))
    await asyncio.sleep(1)
    
    # TURN 6: Ask details about second one
    r6 = await send_and_check(6, "tell me about that one's price and tier", ["price", "tier"])
    results.append(("Turn 6: Second hoodie details", r6["success"] and not r6["error"]))
    await asyncio.sleep(1)
    
    # TURN 7: Show different product type
    print("\n" + "="*80)
    print("PHASE 4: Context Switch - Different Product Type")
    print("="*80)
    r7 = await send_and_check(7, "show me tees")
    await asyncio.sleep(2)
    
    # TURN 8: Ask about tees
    r8 = await send_and_check(8, "what's the price of the first tee?", ["tee", "price"])
    results.append(("Turn 8: First tee price", r8["success"] and not r8["error"]))
    await asyncio.sleep(1)
    
    # TURN 9: Go back to FIRST HOODIE (from turn 1!)
    print("\n" + "="*80)
    print("PHASE 5: Long-Term Memory - Reference Turn 1")
    print("="*80)
    r9 = await send_and_check(9, "go back to that first hoodie from the beginning", ["hoodie"])
    results.append(("Turn 9: Go back to first hoodie", r9["success"] and not r9["error"]))
    await asyncio.sleep(1)
    
    # TURN 10: Ask if it remembers the details
    r10 = await send_and_check(10, "what was its tier again?", ["tier", "casual", "premium"])
    results.append(("Turn 10: Remember tier from turn 4", r10["success"] and not r10["error"]))
    await asyncio.sleep(1)
    
    # TURN 11: Compare first and second hoodie
    print("\n" + "="*80)
    print("PHASE 6: Multi-Product Comparison")
    print("="*80)
    r11 = await send_and_check(11, "compare the first and second hoodies you showed me", ["hoodie", "first", "second"])
    results.append(("Turn 11: Compare two hoodies", r11["success"] and not r11["error"]))
    await asyncio.sleep(1)
    
    # TURN 12: Final complex question
    r12 = await send_and_check(12, "which one would you recommend: the first hoodie or the tee?", ["hoodie", "tee", "recommend"])
    results.append(("Turn 12: Recommendation across product types", r12["success"] and not r12["error"]))
    
    # Results
    print("\n" + "="*80)
    print("TEST RESULTS")
    print("="*80)
    
    for test_name, success in results:
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name}")
    
    success_count = sum(1 for _, success in results if success)
    total = len(results)
    success_rate = (success_count / total * 100) if total > 0 else 0
    
    print(f"\n📊 Success Rate: {success_count}/{total} ({success_rate:.0f}%)")
    
    if success_rate >= 80:
        print("\n✅ EXCELLENT: Context management working great!")
        return True
    elif success_rate >= 60:
        print("\n⚠️  GOOD: Most features working, some improvements needed")
        return False
    else:
        print("\n❌ NEEDS WORK: Significant context issues")
        return False


if __name__ == "__main__":
    success = asyncio.run(run_deep_test())
    exit(0 if success else 1)
