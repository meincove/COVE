
import asyncio
import os
import sys
import logging

# Setup logging
logging.basicConfig(level=logging.ERROR)

from app.agents.stylist_agent import StylistAgent

async def debug_image_urls():
    print("\n\n🖼️ DEBUGGING IMAGE URLS: Vortex Streetwear\n")
    agent = StylistAgent("stylist")
    
    async def mock_callback(event):
        if event.get("event_type") == "category_candidates":
            cat = event.get("category")
            candidates = event.get("candidates", [])
            print(f"\n📂 {cat.upper()} ({len(candidates)} items)")
            for c in candidates:
                title = c.get("title")
                img = c.get("imageUrl")
                print(f"  - {title}")
                print(f"    Current URL: '{img}'")
                
                # Check meta for better alternatives
                meta = c.get("meta", {})
                meta_img = meta.get("imageUrl") or meta.get("image")
                meta_images = meta.get("images", [])
                
                if meta_img and "cloudinary" in str(meta_img):
                     print(f"    💎 Found Cloudinary in meta: {meta_img}")
                
                if meta_images:
                     print(f"    📸 Meta Images: {meta_images}")

    brands_to_check = ["Vortex Streetwear", "Aura Minimalist"]
    
    for brand in brands_to_check:
        print(f"\n\n🔎 CHECKING BRAND: {brand.upper()} ----------------------------------------")
        task = {
            "query": f"{brand} outfit",
            "budget_max": 2000,
            "categories": ["tops", "bottoms", "shoes"]
        }
        
        # Run
        await agent.execute(task, {"user_id": "debug_img", "gender": "men"}, stream_callback=mock_callback)
        print(f"✅ Finished checking {brand}")

if __name__ == "__main__":
    sys.path.append(os.getcwd())
    asyncio.run(debug_image_urls())
