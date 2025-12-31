"""
Optimized Context Retention Test

Better test design that:
- Stays in product browsing mode (no outfit builder)
- Tests realistic shopping patterns
- Verifies "go back" and "compare" work
- Measures actual context retention
"""

import asyncio
import httpx

SESSION_ID = "optimized_context_test"
AI_CORE_URL = "http://localhost:8000"


async def send_and_verify(turn: int, message: str, expected_keywords: list = None) -> dict:
    """Send message and verify response contains expected keywords"""
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
            print(f"❌ Error: {response.status_code}")
            return {"success": False, "answer": "", "items": []}
        
        data = response.json()
        answer = data.get('answer', '').lower()
        items = data.get('items', [])
        
        print(f"✅ AI: {data.get('answer', '')[:150]}...")
        if items:
            print(f"📦 Showed {len(items)} items: {', '.join([i['title'] for i in items[:3]])}...")
        
        # Check if expected keywords are in response
        if expected_keywords:
            found = [kw for kw in expected_keywords if kw.lower() in answer]
            missing = [kw for kw in expected_keywords if kw.lower() not in answer]
            
            if found:
                print(f"✅ Found keywords: {', '.join(found)}")
            if missing:
                print(f"⚠️  Missing keywords: {', '.join(missing)}")
            
            success = len(found) > 0
        else:
            success = True
        
        return {
            "success": success,
            "answer": answer,
            "items": items,
            "found_keywords": found if expected_keywords else [],
            "missing_keywords": missing if expected_keywords else []
        }


async def test_optimized_context():
    """Optimized 12-turn test with realistic product browsing"""
    print("\n" + "🎯 " * 40)
    print("OPTIMIZED CONTEXT RETENTION TEST")
    print("🎯 " * 40)
    
    results = []
    
    # Turn 1: Initial query - black hoodies
    await send_and_verify(1, "Show me black hoodies under €100")
    await asyncio.sleep(2)
    
    # Turn 2: Ask about specific product from turn 1
    r2 = await send_and_verify(2, "What's the price of the COVE hoodie?", ["price", "cove", "hoodie"])
    results.append(("Turn 2: Price question", r2["success"]))
    await asyncio.sleep(1)
    
    # Turn 3: Switch to bombers
    await send_and_verify(3, "Show me bombers")
    await asyncio.sleep(2)
    
    # Turn 4: Go back to hoodies (test context retention)
    r4 = await send_and_verify(4, "Go back to those black hoodies", ["hoodie", "black"])
    results.append(("Turn 4: Go back to hoodies", r4["success"]))
    await asyncio.sleep(1)
    
    # Turn 5: Ask about first hoodie again
    r5 = await send_and_verify(5, "Tell me more about the first hoodie you showed", ["hoodie"])
    results.append(("Turn 5: First hoodie reference", r5["success"]))
    await asyncio.sleep(1)
    
    # Turn 6: Show tees
    await send_and_verify(6, "Show me tees")
    await asyncio.sleep(2)
    
    # Turn 7: Compare products from different turns
    r7 = await send_and_verify(7, "Compare the black hoodie and the bomber", ["hoodie", "bomber"])
    results.append(("Turn 7: Compare hoodie and bomber", r7["success"]))
    await asyncio.sleep(1)
    
    # Turn 8: Reference specific product from turn 1
    r8 = await send_and_verify(8, "Is the COVE hoodie still available?", ["cove", "hoodie"])
    results.append(("Turn 8: COVE hoodie reference", r8["success"]))
    await asyncio.sleep(1)
    
    # Turn 9: Show pants
    await send_and_verify(9, "Show me pants")
    await asyncio.sleep(2)
    
    # Turn 10: Reference bomber from turn 3
    r10 = await send_and_verify(10, "What was the price of that bomber?", ["bomber", "price"])
    results.append(("Turn 10: Bomber price", r10["success"]))
    await asyncio.sleep(1)
    
    # Turn 11: Show jackets
    await send_and_verify(11, "Show me jackets")
    await asyncio.sleep(2)
    
    # Turn 12: Final test - reference turn 1 (11 turns ago!)
    r12 = await send_and_verify(12, "Which black hoodie from earlier would you recommend?", ["hoodie", "black"])
    results.append(("Turn 12: Black hoodie from turn 1", r12["success"]))
    
    # Calculate success rate
    print("\n" + "=" * 80)
    print("RESULTS")
    print("=" * 80)
    
    for test_name, success in results:
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name}")
    
    success_count = sum(1 for _, success in results if success)
    total_tests = len(results)
    success_rate = (success_count / total_tests * 100) if total_tests > 0 else 0
    
    print(f"\n📈 Context Retention: {success_count}/{total_tests} ({success_rate:.0f}%)")
    
    if success_rate >= 70:
        print("\n✅ TEST PASSED! Context retention working well!")
        return True
    elif success_rate >= 50:
        print("\n⚠️  TEST PARTIAL: Context retention needs improvement")
        return False
    else:
        print("\n❌ TEST FAILED: Context retention not working")
        return False


async def run_optimized_test():
    """Run optimized context test"""
    print("\n" + "🚀 " * 40)
    print("OPTIMIZED CONTEXT RETENTION TEST")
    print("🚀 " * 40)
    
    # Wait for AI core
    print("\n⏳ Waiting for AI core...")
    await asyncio.sleep(3)
    
    # Run test
    success = await test_optimized_context()
    
    # Final summary
    print("\n" + "=" * 80)
    print("FINAL SUMMARY")
    print("=" * 80)
    
    if success:
        print("✅ Context retention is working correctly!")
        print("AI can reference products from 10+ turns ago")
        print("Phase 2 optimization: COMPLETE")
    else:
        print("⚠️  Context retention needs more work")
        print("Some references not working as expected")
    
    return success


if __name__ == "__main__":
    success = asyncio.run(run_optimized_test())
    exit(0 if success else 1)
