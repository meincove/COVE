import asyncio
import os
import logging
import json
from app.agents.multi_agent_orchestrator import orchestrator

# Configure logging
logging.basicConfig(level=logging.INFO)
log = logging.getLogger("cove")

async def generate_lookbook(brand, occasion, style, query):
    print(f"Generating {brand} look...")
    context = {
        "budget_max": 1000,
        "occasion": occasion,
        "style": style,
        "brand_filter": brand,
        "gender": "male"
    }
    
    async for result in orchestrator.execute_workflow("outfit_builder", query, context, stream=True):
        if isinstance(result, dict):
            # print(f"  [DEBUG] Received event: {result.get('type')}")
            if result.get("type") == "complete":
                data = result.get("result", {})
                items = data.get("outfit_items", [])
                for item in items:
                    print(f"  - [{item.get('category')}] {item.get('title')} (Brand: {item.get('brand')})")
                return data
    return None

async def main():
    lookbooks = []
    
    vortex = await generate_lookbook(
        "Vortex Streetwear", 
        "Cyberpunk Night Out", 
        "Cyberpunk", 
        "build a complete aggressive cyberpunk streetwear outfit purely from Vortex Streetwear, budget €1000 for a man"
    )
    if vortex:
        lookbooks.append({"brand": "Vortex Streetwear", "data": vortex})
        
    aura = await generate_lookbook(
        "Aura Minimalist", 
        "Premium Minimalist Evening", 
        "Minimalist", 
        "build a complete clean premium minimalist outfit purely from Aura Minimalist, budget €1000 for a man"
    )
    if aura:
        lookbooks.append({"brand": "Aura Minimalist", "data": aura})
        
    with open("final_lookbooks.json", "w") as f:
        json.dump(lookbooks, f, indent=2, default=lambda o: str(o))
    print("Lookbooks saved to final_lookbooks.json")

if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv()
    asyncio.run(main())
