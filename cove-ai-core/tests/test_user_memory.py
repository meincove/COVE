#!/usr/bin/env python3
"""
Test UserMemory RAG service
Verifies memory storage and semantic recall
"""

import asyncio
import sys
import os
sys.path.insert(0, '/Users/ssg/Desktop/COVE/cove-ai-core')

# Load environment variables BEFORE importing service
from dotenv import load_dotenv
load_dotenv('/Users/ssg/Desktop/COVE/cove-ai-core/.env')

from app.services.user_memory import UserMemoryService


async def test_user_memory():
    """Test memory storage and recall"""
    
    print("=" * 80)
    print("TESTING USER MEMORY RAG SERVICE")
    print("=" * 80)
    print()
    
    # Initialize service
    print("🔌 Initializing UserMemoryService...")
    service = UserMemoryService()
    await service.initialize()
    print("✅ Service initialized\n")
    
    test_user = "test_user_123"
    
    # Test 1: Store memories
    print("📝 TEST 1: Storing user memories")
    print("-" * 40)
    
    memories_to_store = [
        {
            "content": "I hate hoodies, they make me look sloppy",
            "type": "dislike"
        },
        {
            "content": "I prefer navy and dark blue colors",
            "type": "color_preference"
        },
        {
            "content": "I love slim fit clothing",
            "type": "fit_preference"
        },
        {
            "content": "I need professional outfits for work meetings",
            "type": "occasion"
        },
        {
            "content": "Avoid bright colors and patterns",
            "type": "style"
        }
    ]
    
    stored_ids = []
    for mem in memories_to_store:
        try:
            memory_id = await service.store_memory(
                user_id=test_user,
                content=mem["content"],
                memory_type=mem["type"]
            )
            stored_ids.append(memory_id)
            print(f"  ✅ Stored: {mem['content'][:60]}...")
        except Exception as e:
            print(f"  ❌ Failed to store: {e}")
    
    print(f"\n✅ Stored {len(stored_ids)} memories\n")
    
    # Test 2: Semantic recall
    print("🔍 TEST 2: Semantic recall")
    print("-" * 40)
    
    test_queries = [
        "building casual outfit for weekend",
        "need professional look for office",
        "what colors does user prefer",
        "shopping for sweatshirt"
    ]
    
    for query in test_queries:
        print(f"\nQuery: '{query}'")
        try:
            recalled = await service.recall_memories(
                user_id=test_user,
                query=query,
                top_k=3,
                min_confidence=0.6
            )
            
            if recalled:
                print(f"  Recalled {len(recalled)} memories:")
                for mem in recalled:
                    print(f"    📌 [{mem['similarity']:.2f}] {mem['content'][:70]}...")
            else:
                print("  No relevant memories found")
                
        except Exception as e:
            print(f"  ❌ Recall failed: {e}")
    
    print()
    
    # Test 3: Get all preferences
    print("📊 TEST 3: Get all user preferences")
    print("-" * 40)
    
    try:
        prefs = await service.get_user_preferences(test_user)
        print(f"  Dislikes: {len(prefs['dislikes'])}")
        for item in prefs['dislikes']:
            print(f"    - {item}")
        
        print(f"  Likes: {len(prefs['likes'])}")
        for item in prefs['likes']:
            print(f"    - {item}")
        
        print(f"  Colors: {len(prefs['colors'])}")
        for item in prefs['colors']:
            print(f"    - {item}")
            
    except Exception as e:
        print(f"  ❌ Failed: {e}")
    
    # Cleanup
    await service.close()
    
    print()
    print("=" * 80)
    print("✅ ALL TESTS COMPLETE")
    print("=" * 80)


if __name__ == "__main__":
    asyncio.run(test_user_memory())
