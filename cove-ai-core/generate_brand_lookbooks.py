import asyncio
import os
import logging
import json
from app.agents.multi_agent_orchestrator import orchestrator

# Configure logging
logging.basicConfig(level=logging.INFO)
log = logging.getLogger("cove")

async def generate_lookbooks():
    looks = [
        {
            "brand": "Vortex Streetwear",
            "occasion": "Cyberpunk Urban Explorer",
            "style": "Cyberpunk Streetwear",
            "budget": 1000,
            "gender": "male",
            "query": "build an aggressive cyberpunk streetwear outfit purely from Vortex Streetwear, budget €1000 for a man"
        },
        {
            "brand": "Aura Minimalist",
            "occasion": "Premium Minimalist Evening",
            "style": "Minimalist Luxury",
            "budget": 1000,
            "gender": "male",
            "query": "build a clean premium minimalist outfit purely from Aura Minimalist, budget €1000 for a man"
        }
    ]
    
    results = []

    for look in looks:
        print(f"\n\n✨ GENERATING LOOK: {look['brand']} - {look['occasion']} ✨")
        
        context = {
            "budget_max": look["budget"],
            "occasion": look["occasion"],
            "style": look["style"],
            "brand_filter": look["brand"],
            "gender": look["gender"]
        }
        
        async for result in orchestrator.execute_workflow("outfit_builder", look["query"], context):
            if isinstance(result, dict) and result.get("type") == "complete":
                outfit = result["result"]
                results.append({
                    "brand": look["brand"],
                    "outfit": outfit
                })
                
                print(f"\n✅ {look['brand']} Outfit Ready (€{outfit['total']}):")
                for item in outfit["outfit_items"]:
                    print(f" - {item['category']}: {item['title']} (Brand: {item.get('brand')}) (€{item['price']})")
            elif hasattr(result, "type") and result.type == "complete":
                # Handle possible object instead of dict if orchestrator behavior varies
                outfit = result.result
                results.append({
                    "brand": look["brand"],
                    "outfit": outfit
                })
                print(f"\n✅ {look['brand']} Outfit Ready (€{outfit['total']}):")
    
    # Save results to a file for review
    with open("brand_lookbooks.json", "w") as f:
        # Simplistic serialization for the test
        json.dump(results, f, indent=2, default=lambda o: str(o))

if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv()
    asyncio.run(generate_lookbooks())
