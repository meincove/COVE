#!/usr/bin/env python3
"""
Test script for category-constrained search.

Usage:
    PYTHONPATH=/Users/ssg/Desktop/COVE/cove-ai-core python3 scripts/test_category_search.py
"""

import asyncio
import logging

logging.basicConfig(level=logging.INFO, format='%(message)s')


async def test_category_search():
    from app.vector.store import search_by_outfit_category
    
    print("🧪 Testing Category-Constrained Search\n")
    print("=" * 60)
    
    # Test each category
    categories = ["tops", "bottoms", "shoes", "outerwear"]
    
    for category in categories:
        print(f"\n📦 Category: {category}")
        print("-" * 40)
        
        results = await search_by_outfit_category(
            outfit_category=category,
            style_query="casual weekend",
            gender="men",
            price_max=200,
            top_k=5
        )
        
        if not results:
            print(f"   ⚠️ No items found in {category}")
        else:
            for item in results:
                print(f"   ✅ {item['title'][:35]:35} | €{item['price'] or 0:6.2f} | {item['type']}")
    
    print("\n" + "=" * 60)
    print("✅ Category search test complete!")


if __name__ == "__main__":
    asyncio.run(test_category_search())
