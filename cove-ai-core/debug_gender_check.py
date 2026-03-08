
import asyncio
import os
import sys

# Setup paths
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.agents.outfit_builder_agent import OutfitBuilderAgent

async def test_gender_logic(target_gender: str):
    agent = OutfitBuilderAgent(name="outfit_builder")
    
    print(f"\n🔍 Testing Gender Logic for: {target_gender}...")
    
    # Task explicitly requesting specific gender
    task = {
        "query": f"I want a {target_gender} outfit for a casual party",
        "history": [],
        "preferences": {},
        "budget_max": 1000,
        "gender": target_gender, 
        "style": "casual",
        "occasion": "party",
        "num_outfits": 1
    }
    
    context = {}
    
    # Run the agent
    result = await agent.run(task, context)
    
    if result.success and "outfit_items" in result.data:
        items = result.data["outfit_items"]
        print(f"✅ Generated {len(items)} items.")
        
        suspicious_items = []
        for item in items:
            title = item.get("title", "").lower()
            cat = item.get("category", "")
            print(f"- {title} ({cat})")
            
            # Simple heuristic checks
            if target_gender == "male":
                if "dress" in title and "shirt" not in title: suspicious_items.append(title)
                if "skirt" in title: suspicious_items.append(title)
                if "blouse" in title: suspicious_items.append(title)
                if "heels" in title: suspicious_items.append(title)
            elif target_gender == "female":
                # Harder to check female as they wear pants/suits too, but maybe check for strictly male terms?
                if "mens" in title: suspicious_items.append(title)
        
        if suspicious_items:
            print(f"❌ FAILURE: Found suspicious items for {target_gender}: {suspicious_items}")
        else:
            print(f"✅ SUCCESS: No obviously wrong-gender items found.")
            
    else:
        print("❌ Agent failed to generate outfit.")
        print(result.errors)

async def main():
    await test_gender_logic("male")
    await test_gender_logic("female")

if __name__ == "__main__":
    asyncio.run(main())
