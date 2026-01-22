import asyncio
import logging
import sys
from app.agents.stylist_agent import StylistAgent

# Setup logging
logging.basicConfig(level=logging.INFO)
log = logging.getLogger("cove.agents.stylist")
log.setLevel(logging.INFO)

async def test_formal_query():
    print("\n--- TESTING FORMAL QUERY ---")
    agent = StylistAgent(name="stylist")
    
    task = {
        "query": "formal outfit for wedding",
        "budget_max": 500,
        "categories": ["top", "bottom", "shoes"]
    }
    
    context = {
        "user_id": "debug_user",
        "gender": "men" 
    }
    
    print(f"Query: {task['query']}")
    result = await agent.execute(task, context)
    
    print("\n--- RESULT ---")
    print(f"Success: {result.success}")
    print(f"Reasoning: {result.reasoning}")
    
    candidates = result.data.get("candidates", {})
    for cat, items in candidates.items():
        print(f"\nCategory: {cat.upper()}")
        if not items:
            print("  (No items found)")
        for item in items[:3]:
            print(f"  - [{item.get('type')}] {item.get('title')} (${item.get('price')})")

if __name__ == "__main__":
    asyncio.run(test_formal_query())
