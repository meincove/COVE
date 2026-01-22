import asyncio
from app.agents.outfit_builder_agent import OutfitBuilderAgent

async def run_debug():
    agent = OutfitBuilderAgent("outfit_builder")
    
    # Simulate a Gym request
    task = {
        "budget_max": 200,
        "gender": "men",
        "style": "active",
        "occasion": "workout at gym",
        "num_outfits": 1
    }
    
    print(f"\n🚀 Running OutfitBuilder Debug for OCCASION='{task['occasion']}'...")
    result = await agent.execute(task, {})
    
    print("\n📦 GENERATED OUTFIT ITEMS:")
    found_sneakers = False
    found_active_top = False
    
    for item in result.data["outfit_items"]:
        print(f"   - [{item['category']}] {item['title']} (€{item['price']})")
        
        lower_title = item['title'].lower()
        
        if item['category'] == 'shoes':
            if any(x in lower_title for x in ['sneaker', 'runner', 'trainer']):
                found_sneakers = True
                print("     ✅ Good Gym Shoes")
            else:
                print("     ⚠️ Potential bad shoes (not sneakers?)")
                
        if item['category'] == 'tops':
            # Loose check, looking for tee or active terms
            if any(x in lower_title for x in ['tee', 'tank', 'active', 'run']):
                found_active_top = True
                print("     ✅ Good Gym Top")

    if found_sneakers and found_active_top:
        print("\n✅ SUCCESS: Gym logic triggered correctly!")
    else:
        print("\n❌ FAILURE: Gym items not prioritized.")

if __name__ == "__main__":
    import logging
    logging.basicConfig(level=logging.INFO)
    asyncio.run(run_debug())
