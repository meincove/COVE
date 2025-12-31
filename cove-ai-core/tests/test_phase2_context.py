"""
Phase 2 Test: Verify Expanded Context Window

Tests that AI can remember context from 10+ turns ago with new limits:
- MAX_HISTORY_MESSAGES: 15 (was 8)
- HISTORY_SUMMARY_THRESHOLD: 30 (was 16)
"""

import asyncio
import httpx
from typing import List, Dict, Any

SESSION_ID = "phase2_context_test"
AI_CORE_URL = "http://localhost:8000"


async def send_message(turn: int, message: str) -> str:
    """Send message and return AI response"""
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
            return ""
        
        data = response.json()
        answer = data.get('answer', '')
        items = data.get('items', [])
        
        print(f"✅ AI: {answer[:200]}...")
        if items:
            print(f"📦 Showed {len(items)} items")
        
        return answer


async def test_10_turn_context():
    """Test 10-turn conversation with context retention"""
    print("\n" + "🧪 " * 40)
    print("TEST 1: 10-TURN CONTEXT RETENTION")
    print("🧪 " * 40)
    
    # Turn 1: Initial query
    await send_message(1, "Show me black hoodies under €100")
    await asyncio.sleep(1)
    
    # Turn 2: Follow-up question
    await send_message(2, "What's the material of the first one?")
    await asyncio.sleep(1)
    
    # Turn 3: Switch context
    await send_message(3, "Actually, show me bombers instead")
    await asyncio.sleep(1)
    
    # Turn 4: Reference turn 1 (should remember)
    answer4 = await send_message(4, "Go back to those black hoodies you showed")
    await asyncio.sleep(1)
    
    # Turn 5: Specific question about turn 1
    await send_message(5, "What was the price of the COVE hoodie?")
    await asyncio.sleep(1)
    
    # Turn 6: New product type
    await send_message(6, "Show me tees")
    await asyncio.sleep(1)
    
    # Turn 7: Build outfit
    await send_message(7, "Can you build an outfit with the black hoodie from earlier?")
    await asyncio.sleep(1)
    
    # Turn 8: Reference turn 3
    answer8 = await send_message(8, "What about that bomber you showed?")
    await asyncio.sleep(1)
    
    # Turn 9: Compare items from different turns
    await send_message(9, "Compare the hoodie and bomber")
    await asyncio.sleep(1)
    
    # Turn 10: Final question referencing turn 1
    answer10 = await send_message(10, "Which black hoodie would you recommend for everyday wear?")
    
    # Verify context retention
    print("\n" + "=" * 80)
    print("VERIFICATION")
    print("=" * 80)
    
    checks = []
    
    # Check 1: Turn 4 should reference hoodies from turn 1
    if "hoodie" in answer4.lower():
        print("✅ Turn 4: Referenced hoodies from turn 1")
        checks.append(True)
    else:
        print("❌ Turn 4: Did not reference hoodies from turn 1")
        checks.append(False)
    
    # Check 2: Turn 8 should reference bomber from turn 3
    if "bomber" in answer8.lower():
        print("✅ Turn 8: Referenced bomber from turn 3")
        checks.append(True)
    else:
        print("❌ Turn 8: Did not reference bomber from turn 3")
        checks.append(False)
    
    # Check 3: Turn 10 should reference black hoodies from turn 1
    if "hoodie" in answer10.lower() or "black" in answer10.lower():
        print("✅ Turn 10: Referenced black hoodies from turn 1")
        checks.append(True)
    else:
        print("❌ Turn 10: Did not reference black hoodies from turn 1")
        checks.append(False)
    
    success_rate = sum(checks) / len(checks) * 100
    print(f"\n📈 Context Retention: {success_rate:.0f}%")
    
    return success_rate >= 66  # At least 2/3 checks pass


async def test_20_turn_conversation():
    """Test 20-turn conversation with summary generation"""
    print("\n" + "🧪 " * 40)
    print("TEST 2: 20-TURN CONVERSATION WITH SUMMARY")
    print("🧪 " * 40)
    
    session_id = "phase2_long_test"
    
    # Turns 1-10: Build up history
    for i in range(1, 11):
        message = [
            "Show me hoodies",
            "What colors?",
            "Show me bombers",
            "What's the price?",
            "Show me tees",
            "What sizes?",
            "Show me pants",
            "What materials?",
            "Show me jackets",
            "What's available?"
        ][i-1]
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            await client.post(
                f"{AI_CORE_URL}/ai/agent/query",
                json={"message": message, "guestSessionId": session_id, "historyScope": "user"}
            )
        await asyncio.sleep(0.5)
    
    print(f"✅ Completed turns 1-10")
    
    # Turns 11-20: Continue conversation
    for i in range(11, 21):
        message = [
            "Show me sweaters",
            "What's the fit?",
            "Show me shorts",
            "What's the length?",
            "Show me accessories",
            "What's included?",
            "Show me blazers",
            "What's the style?",
            "Show me dresses",
            "What's the occasion?"
        ][i-11]
        
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{AI_CORE_URL}/ai/agent/query",
                json={"message": message, "guestSessionId": session_id, "historyScope": "user"}
            )
        await asyncio.sleep(0.5)
    
    print(f"✅ Completed turns 11-20")
    
    # Turn 21: Reference early conversation
    print(f"\n{'='*80}")
    print(f"TURN 21: What hoodies did you show me at the start?")
    print(f"{'='*80}")
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{AI_CORE_URL}/ai/agent/query",
            json={
                "message": "What hoodies did you show me at the start?",
                "guestSessionId": session_id,
                "historyScope": "user"
            }
        )
    
    answer = response.json().get('answer', '')
    print(f"✅ AI: {answer[:200]}...")
    
    # Verify AI can still reference turn 1
    if "hoodie" in answer.lower():
        print("\n✅ AI remembered hoodies from turn 1 (20 turns ago!)")
        return True
    else:
        print("\n❌ AI did not remember hoodies from turn 1")
        return False


async def run_phase2_tests():
    """Run all Phase 2 tests"""
    print("\n" + "🚀 " * 40)
    print("PHASE 2: EXPANDED CONTEXT WINDOW TESTS")
    print("🚀 " * 40)
    
    # Wait for AI core to start
    print("\n⏳ Waiting for AI core to start...")
    await asyncio.sleep(5)
    
    # Test 1: 10-turn context retention
    test1_pass = await test_10_turn_context()
    
    await asyncio.sleep(2)
    
    # Test 2: 20-turn conversation
    test2_pass = await test_20_turn_conversation()
    
    # Final results
    print("\n" + "=" * 80)
    print("FINAL RESULTS")
    print("=" * 80)
    
    print(f"Test 1 (10-turn context): {'✅ PASS' if test1_pass else '❌ FAIL'}")
    print(f"Test 2 (20-turn memory): {'✅ PASS' if test2_pass else '❌ FAIL'}")
    
    if test1_pass and test2_pass:
        print("\n✅ PHASE 2 TESTS PASSED!")
        print("Context window expansion working correctly!")
        return True
    else:
        print("\n⚠️  PHASE 2 TESTS PARTIAL SUCCESS")
        print("Some context retention issues detected")
        return False


if __name__ == "__main__":
    success = asyncio.run(run_phase2_tests())
    exit(0 if success else 1)
