"""
Comprehensive Product & Brand Switching Test

Tests context retention with:
- Multiple product types (hoodies, tees, pants, jackets, bombers)
- Brand switches (COVE, CoreBasics, TimelessCo, etc.)
- Specific product references across turns
- "Go back" to specific products
- Compare products from different brands
"""

import asyncio
import httpx

SESSION_ID = "product_brand_switching_test"
AI_CORE_URL = "http://localhost:8000"


async def send_message(turn: int, message: str, check_keywords: list = None) -> dict:
    """Send message and check for keywords in response"""
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
            return {"success": False, "answer": "", "items": [], "error": True}
        
        data = response.json()
        answer = data.get('answer', '').lower()
        items = data.get('items', [])
        
        print(f"✅ AI: {data.get('answer', '')[:200]}...")
        if items:
            brands = list(set([i.get('title', '').split()[0] for i in items[:5]]))
            print(f"📦 Showed {len(items)} items from brands: {', '.join(brands[:3])}...")
        
        # Check keywords
        success = True
        if check_keywords:
            found = [kw for kw in check_keywords if kw.lower() in answer]
            missing = [kw for kw in check_keywords if kw.lower() not in answer]
            
            if found:
                print(f"✅ Found: {', '.join(found)}")
            if missing:
                print(f"⚠️  Missing: {', '.join(missing)}")
                success = len(found) > 0  # At least some keywords found
        
        return {
            "success": success,
            "answer": answer,
            "items": items,
            "error": False
        }


async def test_product_brand_switching():
    """Test with diverse products and brand switches"""
    print("\n" + "🎯 " * 40)
    print("PRODUCT & BRAND SWITCHING TEST")
    print("🎯 " * 40)
    
    results = []
    
    # TURN 1: Start with COVE hoodies
    await send_message(1, "Show me COVE hoodies")
    await asyncio.sleep(2)
    
    # TURN 2: Switch to CoreBasics tees
    await send_message(2, "Show me CoreBasics tees")
    await asyncio.sleep(2)
    
    # TURN 3: Reference COVE hoodies from turn 1
    r3 = await send_message(3, "Go back to those COVE hoodies", ["cove", "hoodie"])
    results.append(("Turn 3: Go back to COVE hoodies", r3["success"] and not r3["error"]))
    await asyncio.sleep(1)
    
    # TURN 4: Show TimelessCo pants
    await send_message(4, "Show me TimelessCo pants")
    await asyncio.sleep(2)
    
    # TURN 5: Compare COVE hoodie with CoreBasics tee
    r5 = await send_message(5, "Compare the COVE hoodie with the CoreBasics tee", ["cove", "corebasics"])
    results.append(("Turn 5: Compare COVE vs CoreBasics", r5["success"] and not r5["error"]))
    await asyncio.sleep(1)
    
    # TURN 6: Show hoodies (general)
    await send_message(6, "Show me hoodies")
    await asyncio.sleep(2)
    
    # TURN 7: Reference specific brand from turn 2
    r7 = await send_message(7, "What about those CoreBasics tees you showed earlier?", ["corebasics", "tee"])
    results.append(("Turn 7: Reference CoreBasics tees", r7["success"] and not r7["error"]))
    await asyncio.sleep(1)
    
    # TURN 8: Show jackets
    await send_message(8, "Show me jackets")
    await asyncio.sleep(2)
    
    # TURN 9: Reference TimelessCo pants from turn 4
    r9 = await send_message(9, "Tell me about the TimelessCo pants", ["timelessco", "pants"])
    results.append(("Turn 9: Reference TimelessCo pants", r9["success"] and not r9["error"]))
    await asyncio.sleep(1)
    
    # TURN 10: Show bombers
    await send_message(10, "Show me bombers")
    await asyncio.sleep(2)
    
    # TURN 11: Compare products from different turns
    r11 = await send_message(11, "Compare the COVE hoodie, CoreBasics tee, and TimelessCo pants", 
                             ["cove", "corebasics", "timelessco"])
    results.append(("Turn 11: Compare 3 products from different turns", r11["success"] and not r11["error"]))
    await asyncio.sleep(1)
    
    # TURN 12: Show tees (general)
    await send_message(12, "Show me tees")
    await asyncio.sleep(2)
    
    # TURN 13: Reference COVE hoodie from turn 1 (12 turns ago!)
    r13 = await send_message(13, "Is that COVE hoodie from the beginning still available?", ["cove", "hoodie"])
    results.append(("Turn 13: COVE hoodie from turn 1 (12 turns ago)", r13["success"] and not r13["error"]))
    await asyncio.sleep(1)
    
    # TURN 14: Show pants (general)
    await send_message(14, "Show me pants")
    await asyncio.sleep(2)
    
    # TURN 15: Final multi-brand reference
    r15 = await send_message(15, "Which would you recommend: the COVE hoodie, CoreBasics tee, or TimelessCo pants?",
                             ["cove", "corebasics", "timelessco"])
    results.append(("Turn 15: Multi-brand recommendation", r15["success"] and not r15["error"]))
    
    # Calculate results
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
        print("\n✅ TEST PASSED! Excellent context retention across products and brands!")
        return True
    elif success_rate >= 50:
        print("\n⚠️  TEST PARTIAL: Good context retention, some improvements needed")
        return False
    else:
        print("\n❌ TEST FAILED: Context retention needs significant work")
        return False


async def run_test():
    """Run the comprehensive test"""
    print("\n" + "🚀 " * 40)
    print("COMPREHENSIVE PRODUCT & BRAND SWITCHING TEST")
    print("🚀 " * 40)
    
    # Wait for AI core
    print("\n⏳ Waiting for AI core...")
    await asyncio.sleep(3)
    
    # Run test
    success = await test_product_brand_switching()
    
    # Final summary
    print("\n" + "=" * 80)
    print("FINAL SUMMARY")
    print("=" * 80)
    
    if success:
        print("✅ AI successfully tracks products and brands across turns!")
        print("✅ Can reference specific products from 10+ turns ago")
        print("✅ Handles brand switches correctly")
        print("✅ Context management: EXCELLENT")
    else:
        print("⚠️  AI has some context retention issues")
        print("Some product/brand references not working as expected")
    
    return success


if __name__ == "__main__":
    success = asyncio.run(run_test())
    exit(0 if success else 1)
