import asyncio
import os
import sys
import logging
from dotenv import load_dotenv

# Add parent dir to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.agents.outfit_builder_v2 import outfit_builder_v2_handler, execute

# Configure logging
logging.basicConfig(level=logging.INFO)

async def verify_fancy():
    # Simulate user request
    task = {
        "budget_max": 800,
        "gender": None, # Unspecified
        "style": "date night fancy restaurant",
        "num_outfits": 1
    }
    
    context = {"user_id": "test_user"}
    
    print(f"Testing Outfit Builder with: {task}")
    
    result = await execute(task, context)
    
    print("\n\n=== RESULT ===")
    print(f"Success: {result.success}")
    print(f"Reasoning: {result.reasoning}")
    print(f"Confidence: {result.confidence}")
    
    if result.success:
        items = result.data.get("outfit_items", [])
        for item in items:
            print(f"- [{item['category']}] {item['title']} (${item['price']}) (Type: {item['type']})")

        # Check for bad items
        casuals = ["tee", "hoodie", "short"]
        bad_items = [i for i in items if any(c in (i['type'] or "").lower() for c in casuals)]
        if bad_items:
            print("\n❌ FAILURE: Found casual items in fancy outfit!")
            for i in bad_items:
                print(f"  - {i['title']} ({i['type']})")
        else:
            print("\n✅ SUCCESS: No casual items found.")

        # Check if dress was used
        if any(i['category'] == 'dress' for i in items):
            print("✅ SUCCESS: Dress was selected for fancy date night.")
        else:
            print("⚠️ WARNING: No dress selected (might be valid if separates were fancy enough, but expected dress with new logic).")

if __name__ == "__main__":
    load_dotenv()
    asyncio.run(verify_fancy())
