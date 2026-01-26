import asyncio
import os
import logging
from app.agents.multi_agent_orchestrator import orchestrator

# Configure logging
logging.basicConfig(level=logging.INFO)
log = logging.getLogger("cove")

async def generate_vortex_lookbook():
    print("\n\n✨ GENERATING LOOK: Vortex Streetwear - Cyberpunk Night Out ✨")
    
    context = {
        "budget_max": 1000,
        "occasion": "Cyberpunk Night Out",
        "style": "Cyberpunk",
        "brand_filter": "Vortex Streetwear",
        "gender": "male"
    }
    
    query = "build a complete aggressive cyberpunk streetwear outfit purely from Vortex Streetwear, budget €1000 for a man"
    
    async for result in orchestrator.execute_workflow("outfit_builder", query, context):
        if isinstance(result, dict) and result.get("type") == "complete":
            outfit = result["result"]
            print(f"\n✅ Vortex Streetwear Outfit Ready (€{outfit['total']}):")
            for item in outfit["outfit_items"]:
                product = item.get('product', {})
                print(f" - {item['category']}: {product.get('title')} (Brand: {product.get('brand')}) (€{product.get('price')})")
            
            # Print Reasoning
            print(f"\n💡 Stylist Reasoning: {outfit.get('reasoning')}")

if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv()
    asyncio.run(generate_vortex_lookbook())
