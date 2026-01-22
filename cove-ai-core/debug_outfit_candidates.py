import asyncio
import logging
from app.agents.outfit_builder_agent import OutfitBuilderAgent

# Setup logging
logging.basicConfig(level=logging.ERROR) # Quiet the logs a bit

async def debug_stream(event):
    event_type = event.get("event_type")
    
    if event_type == "category_candidates":
        category = event.get("category")
        candidates = event.get("candidates", [])
        print(f"\n🔎 FOUND CANDIDATES FOR [{category}]: {len(candidates)} items")
        for idx, item in enumerate(candidates[:5]): # Show top 5
            print(f"   {idx+1}. {item.get('title')} (Price: {item.get('price')}, Slug: {item.get('slug')})")
        if len(candidates) > 5:
            print(f"   ... and {len(candidates) - 5} more")

    elif event_type == "item_selected":
        category = event.get("category")
        item = event.get("selected_item")
        oid = event.get("outfit_id")
        print(f"   ✅ Selected for {oid} [{category}]: {item.get('title')}")

async def run_debug():
    print("🚀 Starting Deep Probe of OutfitBuilder Agent...\n")
    agent = OutfitBuilderAgent("debug_builder")
    
    task = {
        "budget_max": 500,
        "gender": "male",
        "style": "formal date night", # Changed to formal
        "num_outfits": 3
    }
    
    # We are NOT passing pre_filtered_candidates to force it to use Vector Search 
    # and show us what it finds.
    
    await agent.execute(
        task=task,
        context={},
        stream_callback=debug_stream
    )
    print("\n🏁 Debug Complete")

if __name__ == "__main__":
    asyncio.run(run_debug())
