import asyncio
from dotenv import load_dotenv
import os
import sys
import json

# Add app to path
sys.path.append(os.getcwd())

load_dotenv()

from app.mcp_agents.intent_classifier.classifier import get_classifier

async def test():
    clf = get_classifier()
    
    test_cases = [
        {
            "q": "what colors do you have?",
            "expected": {"facet_query": "color"}
        },
        {
            "q": "I am 180cm and 75kg looking for a jacket",
            "expected": {"height_cm": 180, "weight_kg": 75, "type": "jacket"}
        },
        {
            "q": "show me oversized hoodies",
            "expected": {"fit": "oversized", "type": "hoodie"}
        },
        {
            "q": "womens medium dress",
            "expected": {"gender": "female", "size": "M", "type": "dress"} # LLM might output "medium" or "M"
        },
        {
            "q": "cheapest under 50",
            "expected": {"sort": "price_asc", "price_max": 50}
        },
        {
            "q": "add the second one to cart",
            "expected": {"target_index": 1}
        }
    ]
    
    print("🚀 Starting Universal Extraction Test...\n")
    
    for case in test_cases:
        q = case["q"]
        print(f"--- Testing: '{q}' ---")
        try:
            res = await clf.classify(q, {})
            entities = res.get('entities', {})
            print(f"Entities: {json.dumps(entities, indent=2)}")
            
            for k, v in case["expected"].items():
                if k == "size": # loose check for size normalization
                     got = entities.get(k)
                     if got in ["M", "Medium", "medium"]:
                         print(f"✅ {k}: OK ({got})")
                     else:
                         print(f"❌ {k}: Expected {v}, got {got}")
                     continue
                
                if str(entities.get(k)).lower() == str(v).lower():
                    print(f"✅ {k}: OK")
                else:
                    print(f"❌ {k}: Expected {v}, got {entities.get(k)}")
                    
        except Exception as e:
            print(f"❌ Exception: {e}")

if __name__ == "__main__":
    asyncio.run(test())
