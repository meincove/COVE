#!/usr/bin/env python3
"""
End-to-End Test: Complete Preference Learning Flow
Tests extraction → storage → recall
"""

import asyncio
import sys
import os
sys.path.insert(0, '/Users/ssg/Desktop/COVE/cove-ai-core')

from dotenv import load_dotenv
load_dotenv('/Users/ssg/Desktop/COVE/cove-ai-core/.env')

from app.services.user_preference_manager import get_preference_manager


async def test_complete_flow():
    """Test the entire preference learning flow"""
    
    print("=" * 80)
    print("E2E TEST: PREFERENCE LEARNING FLOW")
    print("=" * 80)
    print()
    
    manager = await get_preference_manager()
    test_user = "test_user_e2e"
    
    # Step 1: Process user statements
    print("📝 STEP 1: Processing user statements")
    print("-" * 40)
    
    statements = [
        "I hate hoodies, they look too casual for me",
        "I love navy and black colors",
        "I prefer slim fit blazers",
        "Avoid bright colors and loud patterns"
    ]
    
    for statement in statements:
        result = await manager.process_statement(
            user_id=test_user,
            statement=statement
        )
        
        status = "✅" if result["stored"] else "❌"
        print(f"{status} '{statement[:50]}...'")
        if result.get("extracted"):
            prefs = result["extracted"]
            if prefs.get("dislikes"):
                print(f"   Dislikes: {prefs['dislikes']}")
            if prefs.get("likes"):
                print(f"   Likes: {prefs['likes']}")
            if prefs.get("colors"):
                print(f"   Colors: {prefs['colors']}")
    
    print()
    
    # Step 2: Get preferences summary
    print("📊 STEP 2: Get preferences summary")
    print("-" * 40)
    
    summary = await manager.get_user_preferences_summary(test_user)
    print(f"Dislikes: {summary['dislikes']}")
    print(f"Likes: {summary['likes']}")
    print(f"Colors: {summary['colors']}")
    print(f"Styles: {summary['styles']}")
    print()
    
    # Step 3: Recall for context
    print("🔍 STEP 3: Recall relevant preferences for contexts")
    print("-" * 40)
    
    contexts = [
        "building casual outfit for weekend",
        "need professional outfit for meeting",
        "shopping for jacket"
    ]
    
    for context in contexts:
        print(f"\nContext: '{context}'")
        memories = await manager.recall_for_context(
            user_id=test_user,
            context=context,
            top_k=3
        )
        
        if memories:
            print(f"  Recalled {len(memories)} memories:")
            for mem in memories:
                print(f"    - [{mem['similarity']:.2f}] {mem['content'][:60]}...")
        else:
            print("  No relevant memories found (might need lower threshold)")
    
    print()
    print("=" * 80)
    print("✅ E2E TEST COMPLETE")
    print("=" * 80)


if __name__ == "__main__":
    asyncio.run(test_complete_flow())
