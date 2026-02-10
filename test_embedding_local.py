import asyncio
import os
import sys

# Ensure app is in path
sys.path.append(os.getcwd())

# Mock DB connection if needed, but let's try to run relevant parts
from app.vector.store import search_by_outfit_category
from app.vector.store import async_embed_query

async def test_repro():
    print("🚀 Starting local repro...")
    
    # 1. Test embed_query directly
    print("Testing async_embed_query directly...")
    try:
        coro = async_embed_query("casual weekend")
        print(f"async_embed_query returned: {coro} (type: {type(coro)})")
        if coro is None:
            print("❌ CRITICAL: async_embed_query returned None!")
        else:
            res = await coro
            print(f"✅ async_embed_query result: {len(res)} floats")
    except Exception as e:
        print(f"❌ async_embed_query failed: {e}")

    # 2. Test search_by_outfit_category
    print("\nTesting search_by_outfit_category...")
    try:
        # This might fail if DB isn't reachable, but we want to see if it fails BEFORE DB
        # i.e. at the await point
        result = await search_by_outfit_category(
            outfit_category="tops", 
            style_query="casual weekend",
            price_max=100
        )
        print(f"✅ search_by_outfit_category result: {len(result)} items")
    except Exception as e:
        print(f"❌ search_by_outfit_category failed: {e}")

if __name__ == "__main__":
    asyncio.run(test_repro())
