import asyncio
from app.agents.outfit_builder_agent import OutfitBuilderAgent

async def run_debug():
    agent = OutfitBuilderAgent("outfit_builder")
    
    # Simulate the task from the user query
    task = {
        "budget_max": 1000,
        "gender": "men", # Trying to hint men to avoid heels (though query text matters more for subagent)
        "style": "formal",
        "occasion": "wedding", # This caused the issue
        "num_outfits": 1
    }
    
    print(f"\n🚀 Running OutfitBuilder Debug for OCCASION='{task['occasion']}'...")
    result = await agent.execute(task, {})
    
    print("\n📦 GENERATED OUTFIT ITEMS:")
    found_outerwear = False
    found_bad_bottom = False
    
    for item in result.data["outfit_items"]:
        print(f"   - [{item['category']}] {item['title']} (€{item['price']})")
        if item['category'] == 'outerwear':
            found_outerwear = True
        if item['category'] == 'bottoms':
             lower_title = item['title'].lower()
             if "short" in lower_title:
                 found_bad_bottom = True
                 print(f"     ⚠️ BAD BOTTOM DETECTED: {item['title']}")
             elif any(p in lower_title for p in ["pant", "trouser", "slack", "chinc"]):
                 print(f"     ✅ GOOD BOTTOM: {item['title']}")
        if item['category'] == 'tops':
             lower_title = item['title'].lower()
             if any(bad in lower_title for bad in ["tee", "t-shirt", "hoodie", "sweat"]):
                 print(f"     ⚠️ BAD TOP DETECTED: {item['title']}")
                 found_outerwear = False # Fail the test if top is bad
             elif any(good in lower_title for good in ["shirt", "button", "oxford", "formal"]):
                 print(f"     ✅ GOOD TOP: {item['title']}")
            
    if found_outerwear and not found_bad_bottom:
        print("\n✅ SUCCESS: Outerwear found, Bottoms are formal, Tops check passed!")
    else:
        print("\n❌ FAILURE: Missing outerwear, found shorts, or found casual tops.")

if __name__ == "__main__":
    import logging
    logging.basicConfig(level=logging.INFO)
    asyncio.run(run_debug())
