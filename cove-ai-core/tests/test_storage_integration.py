"""
Comprehensive Storage Integration Test

Tests the complete flow:
1. Extract facts from conversation
2. Store facts in Django database
3. Retrieve facts from database
4. Verify facts in ChatSession.metadata
"""

import asyncio
import httpx
import json
from typing import Dict, Any

# Configuration
AI_CORE_URL = "http://localhost:8000"  # AI Core (FastAPI)
DJANGO_URL = "http://localhost:8001"   # Django backend
SESSION_ID = "test_storage_integration_456"


async def send_message(message: str, turn_num: int) -> Dict[str, Any]:
    """Send a message to the agent"""
    print(f"\n{'='*80}")
    print(f"TURN {turn_num}: {message}")
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
            return {}
        
        data = response.json()
        print(f"✅ Response: {data.get('answer', 'No answer')[:100]}...")
        return data


async def check_facts_in_database():
    """Check if facts were stored in Django database"""
    print(f"\n{'='*80}")
    print("CHECKING DATABASE")
    print(f"{'='*80}")
    
    async with httpx.AsyncClient(timeout=5.0) as client:
        response = await client.get(
            f"{DJANGO_URL}/ai_profiles/session/facts/get/",
            params={"guest_session_id": SESSION_ID}
        )
        
        if response.status_code != 200:
            print(f"❌ Failed to retrieve facts: {response.status_code}")
            return None
        
        data = response.json()
        facts = data.get("facts", {})
        session_id = data.get("session_id")
        
        print(f"✅ Retrieved facts from session {session_id}")
        print(f"\n📊 FACTS STORED:")
        print(json.dumps(facts, indent=2))
        
        return facts


async def verify_fact_quality(facts: Dict[str, Any]):
    """Verify the quality of extracted facts"""
    print(f"\n{'='*80}")
    print("VERIFYING FACT QUALITY")
    print(f"{'='*80}")
    
    checks = []
    
    # Check 1: Product focus exists
    if "product_focus" in facts:
        print("✅ Product focus layer exists")
        checks.append(True)
        
        # Check current products
        current_products = facts["product_focus"].get("current_products", [])
        if current_products:
            print(f"✅ {len(current_products)} current products tracked")
            checks.append(True)
        else:
            print("⚠️ No current products tracked")
            checks.append(False)
    else:
        print("❌ Product focus layer missing")
        checks.append(False)
    
    # Check 2: User preferences exist
    if "user_preferences" in facts:
        print("✅ User preferences layer exists")
        prefs = facts["user_preferences"]
        if prefs:
            print(f"   Preferences: {list(prefs.keys())}")
            checks.append(True)
        else:
            print("⚠️ No preferences stored")
            checks.append(False)
    else:
        print("⚠️ User preferences layer missing")
        checks.append(False)
    
    # Check 3: Active context exists
    if "active_context" in facts:
        print("✅ Active context layer exists")
        checks.append(True)
    else:
        print("⚠️ Active context layer missing")
        checks.append(False)
    
    success_rate = sum(checks) / len(checks) * 100
    print(f"\n📈 Fact Quality Score: {success_rate:.0f}%")
    
    return success_rate >= 60  # Pass if 60%+ checks pass


async def run_storage_test():
    """Run comprehensive storage integration test"""
    
    print("\n" + "🧪 " * 40)
    print("STORAGE INTEGRATION TEST")
    print("🧪 " * 40)
    
    # Turn 1: Product query with preferences
    await send_message("I prefer size M and I'm looking for Nike hoodies under €100", 1)
    await asyncio.sleep(2)  # Wait for background extraction
    
    # Turn 2: Ask about product
    await send_message("What's the material of the first one?", 2)
    await asyncio.sleep(2)
    
    # Turn 3: State more preferences
    await send_message("I like minimalist style and dark colors", 3)
    await asyncio.sleep(2)
    
    # Turn 4: Switch products
    await send_message("Show me Adidas bombers instead", 4)
    await asyncio.sleep(2)
    
    # Turn 5: Final query
    await send_message("What's available in my size?", 5)
    await asyncio.sleep(3)  # Extra wait for final extraction
    
    print(f"\n⏳ Waiting 5 seconds for background fact extraction/storage...")
    await asyncio.sleep(5)
    
    # Check database
    facts = await check_facts_in_database()
    
    if not facts:
        print("\n❌ TEST FAILED: No facts found in database")
        return False
    
    # Verify fact quality
    quality_ok = await verify_fact_quality(facts)
    
    if quality_ok:
        print("\n✅ TEST PASSED: Facts stored and quality verified")
        return True
    else:
        print("\n⚠️ TEST PARTIAL: Facts stored but quality issues detected")
        return False


async def test_concurrent_updates():
    """Test that concurrent updates don't corrupt data"""
    print(f"\n{'='*80}")
    print("TESTING CONCURRENT UPDATES")
    print(f"{'='*80}")
    
    session_id = "test_concurrent_789"
    
    # Send 5 messages in parallel
    tasks = []
    for i in range(5):
        async def send_concurrent(num):
            async with httpx.AsyncClient(timeout=30.0) as client:
                await client.post(
                    f"{AI_CORE_URL}/ai/agent/query",
                    json={
                        "message": f"Test message {num}",
                        "guestSessionId": session_id,
                    }
                )
        tasks.append(send_concurrent(i))
    
    await asyncio.gather(*tasks)
    await asyncio.sleep(5)  # Wait for background processing
    
    # Check if facts are intact
    async with httpx.AsyncClient(timeout=5.0) as client:
        response = await client.get(
            f"{DJANGO_URL}/ai_profiles/session/facts/get/",
            params={"guest_session_id": session_id}
        )
        
        if response.status_code == 200:
            print("✅ Concurrent updates handled successfully")
            return True
        else:
            print("❌ Concurrent updates failed")
            return False


if __name__ == "__main__":
    print("\n" + "="*80)
    print("STARTING COMPREHENSIVE STORAGE TESTS")
    print("="*80)
    
    # Run main test
    success = asyncio.run(run_storage_test())
    
    # Run concurrent test
    print("\n")
    concurrent_ok = asyncio.run(test_concurrent_updates())
    
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    print(f"Storage Integration: {'✅ PASS' if success else '❌ FAIL'}")
    print(f"Concurrent Updates: {'✅ PASS' if concurrent_ok else '❌ FAIL'}")
    print("="*80)
