
import asyncio
import os
import sys

# Setup paths
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.agents.stylist_agent import StylistAgent

async def test_specific_query():
    stylist = StylistAgent("stylist")
    
    # User's specific query
    query = "I want an outfit for date night for 500 euros formal style"
    
    task = {
        "query": query,
        "budget_max": 500
    }
    
    context = {
        "user_id": "test_user_ambiguous",
        "gender": None, 
        "original_query": query
    }
    
    print(f"\n🔍 Testing Query: '{query}'")
    result = await stylist.execute(task, context)
    
    if result.success and result.data.get("needs_confirmation"):
        print("✅ SUCCESS: Agent requested confirmation.")
        print(f"   Question: {result.data.get('question')}")
    else:
        print("❌ FAILURE: Agent did NOT request confirmation.")
        print(f"   Detected Gender: {result.data.get('intent', {}).get('gender')}")
        print(f"   Reasoning: {result.reasoning}")

if __name__ == "__main__":
    asyncio.run(test_specific_query())
