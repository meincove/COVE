import asyncio
import os
import sys
import logging
from dotenv import load_dotenv

# Add parent dir to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.agents.outfit_builder_v2 import execute

# Configure logging
logging.basicConfig(level=logging.ERROR) # Reduce noise

async def run_scenario(style, gender=None):
    print(f"\n--- Scenario: '{style}' (Gender: {gender}) ---")
    task = {
        "budget_max": 800,
        "gender": gender,
        "style": style,
        "num_outfits": 1
    }
    context = {"user_id": "test_verification"}
    
    result = await execute(task, context)
    
    if not result.success:
        print("❌ Failed to generate outfit")
        return

    items = result.data.get("outfit_items", [])
    categories = [i['category'] for i in items]
    types = [i.get('type', 'unknown') for i in items]
    titles = [i['title'] for i in items]
    
    print(f"Categories: {categories}")
    print(f"Items: {titles}")
    
    # Analysis
    if "dress" in categories:
        print(" -> Mode: Dress")
    else:
        print(" -> Mode: Separates")
        
    casual_types = ["tee", "hoodie", "short", "jogger", "sweatshirt"]
    has_casual = any(any(c in t.lower() for c in casual_types) for t in types)
    
    if has_casual:
        print(" -> Contains Casual items (Tee/Hoodie/Shorts)")
    else:
        print(" -> No Casual items found")

async def verify_occasions():
    # 1. Date Night (Should be Fancy -> Dress/No Casuals)
    await run_scenario("date night fancy restaurant", "women")
    
    # 2. Wedding Guest (Should be Fancy -> Dress/No Casuals)
    await run_scenario("wedding guest", "women")
    
    # 3. Casual Weekend (Should be Casual -> Allow Casuals)
    await run_scenario("casual weekend park walk", "women")
    
    # 4. Business Meeting (Check behavior)
    await run_scenario("business meeting office", "women")

if __name__ == "__main__":
    load_dotenv()
    print("🚀 Starting Occasion Verification...")
    asyncio.run(verify_occasions())
