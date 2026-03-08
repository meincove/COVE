
import asyncio
from app.vector.store import search_by_outfit_category
from app.main import app # Just to bootstrap env if needed

async def main():
    print("🔍 Debugging Image Paths...")
    results = await search_by_outfit_category(
        outfit_category="tops", 
        style_query="signature white dress shirt", 
        gender="Men",
        top_k=1
    )
    
    if not results:
        print("❌ Item not found!")
    else:
        item = results[0]
        print(f"✅ Found: {item.get('title')}")
        print(f"   Images: {item.get('images')}")
        print(f"   Raw Meta: {item}")

if __name__ == "__main__":
    asyncio.run(main())
