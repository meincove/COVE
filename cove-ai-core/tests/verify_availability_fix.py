
import asyncio
import os
import sys
from unittest.mock import MagicMock

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.agents.product_availability_checker import ProductAvailabilityChecker

async def test_availability():
    checker = ProductAvailabilityChecker()
    
    # Mock search results (similar to what backend returned)
    search_results = [
        {"title": "COVE Hoodie", "type": "hoodie", "color": "black"},
        {"title": "CoreBasics Hoodie", "type": "hoodie", "color": "grey"},
        {"title": "TimelessCo Hoodie", "type": "hoodie", "color": "navy"},
    ]
    
    query = "Show me some hoodies"
    print(f"\n🔍 Testing query: '{query}'")
    
    result = await checker.check_and_recommend(query, search_results)
    
    print(f"\n✅ Result: {result.get('should_show_results')}")
    print(f"📝 Message: {result.get('honesty_message')}")
    print(f"🎯 Explanation: {result.get('alternative_explanation')}")
    
    if result.get('should_show_results') is True:
        print("\n🎉 SUCCESS: Fix confirmed! Checker approved the results.")
    else:
        print("\n❌ FAILURE: Checker still rejected the results.")

if __name__ == "__main__":
    asyncio.run(test_availability())
