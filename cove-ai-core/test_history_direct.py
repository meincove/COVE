#!/usr/bin/env python3
"""
Direct test of history logging functionality.
This bypasses the agent endpoint to test history logging directly.
"""

import asyncio
import sys
sys.path.insert(0, '/Users/ssg/Desktop/COVE/cove-ai-core')

from app.history_logger import log_history_turn

async def test_history_logging():
    print("🧪 Testing History Logging Directly")
    print("=" * 50)
    
    # Test 1: Log a conversation turn
    print("\n1. Logging conversation turn...")
    try:
        await log_history_turn(
            user_message="Test: Tell me about hoodies",
            assistant_message="Test: We have several hoodies available",
            user_kind="discover",
            assistant_kind="answer",
            guest_session_id="direct-test-123",
            clerk_user_id="",
            email="",
            user_meta={"test": True},
            assistant_meta={"test": True},
        )
        print("✅ History logging completed without errors")
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    # Test 2: Verify it was saved
    print("\n2. Verifying history was saved...")
    import httpx
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "http://127.0.0.1:8001/ai_profiles/history/",
                params={"guestSessionId": "direct-test-123", "limit": 10}
            )
            data = resp.json()
            items = data.get("items", [])
            
            if len(items) >= 2:
                print(f"✅ Found {len(items)} events in history")
                print("\nSaved events:")
                for item in items:
                    print(f"  - {item['role']}: {item['content'][:50]}...")
                return True
            else:
                print(f"❌ Expected at least 2 events, found {len(items)}")
                return False
    except Exception as e:
        print(f"❌ Error checking history: {e}")
        return False

if __name__ == "__main__":
    result = asyncio.run(test_history_logging())
    sys.exit(0 if result else 1)
