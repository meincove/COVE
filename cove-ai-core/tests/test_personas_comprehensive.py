#!/usr/bin/env python3
"""
Comprehensive Persona Test Suite
Simulates 3 distinct user archetypes to stress-test preference learning.

Scenarios:
1. "The Hater" - Ensures strict dislike filtering
2. "The Picky Owner" - Checks color/style prioritization
3. "The Flip-Flopper" - Tests conflicting memory resolution
"""

import asyncio
import sys
import uuid
import logging

# Setup logging
logging.basicConfig(level=logging.WARN)
logger = logging.getLogger("persona_test")
logger.setLevel(logging.INFO)

sys.path.insert(0, '/Users/ssg/Desktop/COVE/cove-ai-core')

from dotenv import load_dotenv
load_dotenv('/Users/ssg/Desktop/COVE/cove-ai-core/.env')

from app.agents.stylist_agent import StylistAgent
from app.services.user_preference_manager import get_preference_manager

async def run_scenario(name, user_id, setup_statements, task_query, expected_check, expectation_desc):
    print(f"\nExample Persona: {name}")
    print("=" * 60)
    
    manager = await get_preference_manager()
    stylist = StylistAgent(name="StylistAgent")
    
    # 1. Setup Preferences
    print("🧠 Learning Preferences...")
    for stmt in setup_statements:
        await manager.process_statement(user_id, stmt)
        print(f"   User said: '{stmt}'")
        
    # Short wait for DB consistency
    await asyncio.sleep(0.5)
    
    # 2. Execute Task
    print(f"\n🛒 Asking Stylist: '{task_query}'")
    context = {"user_id": user_id, "guest_session_id": str(uuid.uuid4())}
    task = {"query": task_query, "budget_max": 500}
    
    result = await stylist.execute(task, context)
    
    if not result.success:
        print("❌ Stylist failed to execute")
        return
        
    # 3. Analyze Results
    outfit = result.data.get("outfit_items", [])
    print(f"   Stylist returned {len(outfit)} items.")
    
    # Check expectation
    passed = expected_check(outfit)
    
    status = "✅ PASS" if passed else "❌ FAIL"
    print(f"{status}: {expectation_desc}")
    
    # Debug info if failed
    if not passed:
        print("   Items returned:")
        for container in outfit:
            prod = container.get('product', {})
            print(f"   - {prod.get('title')} (Type: {prod.get('type')}, Color: {prod.get('color')})")

async def test_personas():
    print("STARTING COMPREHENSIVE PREFERENCE TESTS")
    print(" Thresholds can be tuned in app/services/user_preference_manager.py")
    
    # --- SCENARIO 1: THE HATER ---
    # Goal: STRICTLY respect dislikes
    user_hater = f"user_hater_{uuid.uuid4().hex[:6]}"
    
    def check_hater(items):
        # Fail if ANY hoodie is found
        for container in items:
            prod = container.get('product', {})
            if 'hoodie' in prod.get('type', '').lower():
                return False
            if 'hoodie' in prod.get('title', '').lower():
                return False
        return len(items) > 0 # Should still return something!

    await run_scenario(
        name="The Hater (Dislike Filtering)",
        user_id=user_hater,
        setup_statements=[
            "I absolutely hate hoodies. I never want to see one.",
            "I also dislike bright colors."
        ],
        task_query="Show me something comfortable for home.",
        expected_check=check_hater,
        expectation_desc="Result must contain ZERO hoodies"
    )

    # --- SCENARIO 2: THE PICKY CLIENT ---
    # Goal: Prioritize specific attributes (Color)
    user_picky = f"user_picky_{uuid.uuid4().hex[:6]}"
    
    def check_picky(items):
        # Pass if AT LEAST ONE item is navy/blue
        navy_count = 0
        for container in items:
            prod = container.get('product', {})
            title = prod.get('title', '').lower()
            color = prod.get('color', '').lower() if prod.get('color') else ""
            if 'navy' in title or 'navy' in color or 'blue' in title or 'blue' in color:
                navy_count += 1
        print(f"   (Found {navy_count} navy/blue items)")
        return navy_count >= 1

    await run_scenario(
        name="The Picky Client (Color Priority)",
        user_id=user_picky,
        setup_statements=[
            "I only wear navy and dark blue colors.",
            "I like formal styles."
        ],
        task_query="I need a blazer for work.",
        expected_check=check_picky,
        expectation_desc="Result should prioritize Navy/Blue items"
    )

    # --- SCENARIO 3: THE FLIP-FLOPPER ---
    # Goal: Test memory conflict resolution (Week 3 feature check)
    user_flipper = f"user_flipper_{uuid.uuid4().hex[:6]}"
    
    def check_flipper(items):
        # We want MUTED colors, not BRIGHT ones
        # This test passes if it DOESN'T show bright variants ONLY
        # It's a "soft" pass test because we haven't built strict time-based resolution yet
        bright_count = 0
        muted_count = 0
        for container in items:
            prod = container.get('product', {})
            text = (prod.get('title', '') + str(prod.get('color', ''))).lower()
            if any(x in text for x in ['neon', 'bright', 'yellow', 'lime']):
                bright_count += 1
            if any(x in text for x in ['grey', 'beige', 'olive', 'navy', 'black']):
                muted_count += 1
        
        print(f"   (Found {bright_count} bright, {muted_count} muted items)")
        return muted_count >= bright_count

    await run_scenario(
        name="The Flip-Flopper (Memory Conflict)",
        user_id=user_flipper,
        setup_statements=[
            "I love bright neon colors!",
            "Actually, I changed my mind. I hate bright colors now. I want muted tones."
        ],
        task_query="Find me an outfit.",
        expected_check=check_flipper,
        expectation_desc="Should favor Muted over Bright (Recency check)"
    )

if __name__ == "__main__":
    asyncio.run(test_personas())
