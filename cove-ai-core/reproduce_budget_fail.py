
import asyncio
import os
import sys

# Setup paths
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.agents.outfit_builder_agent import OutfitBuilderAgent
from app.routes.agent import AgentIn

async def test_budget_logic():
    agent = OutfitBuilderAgent(name="outfit_builder")
    
    # Manually define the task dictionary
    # simulating extraction from request
    task = {
        "query": "I want an outfit for date night under 500 euros",
        "history": [],
        "preferences": {},
        # Default extracted values to simulate orchestrator logic
        "budget_max": 500,
        "gender": "female", 
        "style": "date night",
        "occasion": "date night",
        "num_outfits": 1
    }
    
    context = {} # Empty context
    
    # Run the agent
    result = await agent.run(task, context)
    
    print(f"\n✅ Result Generated.")
    
    total_price = 0
    if result.success and "outfit_items" in result.data:
        print("\nItems Selected:")
        for item in result.data["outfit_items"]:
            # item is a dict here, not object
            price = item.get("price", 0)
            name = item.get("title", "Unknown")
            cat = item.get("category", "")
            total_price += price
            print(f"- {name}: €{price} (Category: {cat})")
            
        print(f"\n💰 Total Outfit Cost: €{total_price}")
        
        if total_price > 500:
            print(f"❌ FAILURE: Budget exceeded by €{total_price - 500}")
        else:
            print(f"✅ SUCCESS: Within budget!")
            
    else:
        print("❌ No items returned or failure.")
        print(result.errors)

if __name__ == "__main__":
    asyncio.run(test_budget_logic())
