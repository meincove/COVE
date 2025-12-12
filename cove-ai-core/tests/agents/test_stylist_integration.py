"""
Test Stylist Agent with real product search.

Basic integration test to verify agent works end-to-end.
"""

import asyncio
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from app.agents.stylist_agent import StylistAgent


async def test_stylist_integration():
    """Test stylist agent with real product search."""
    
    print("🧪 Testing Stylist Agent Integration\n")
    
    agent = StylistAgent("test_stylist")
    
    # Test case: Business casual outfit
    print("Test 1: Business casual for meeting (€300 budget)")
    print("-" * 50)
    
    result = await agent.run(
        task={
            "query": "business casual for client meeting",
            "budget_max": 300,
            "categories": ["top", "bottom"]
        },
        context={
            "user_id": None,
            "guest_session_id": "test_session_123"
        }
    )
    
    print(f"✓ Success: {result.success}")
    print(f"✓ Confidence: {result.confidence:.0%}")
    print(f"✓ Reasoning: {result.reasoning}")
    print(f"✓ Occasion: {result.data.get('occasion')}")
    print(f"✓ Style: {result.data.get('style')}")
    print(f"✓ Total: €{result.data.get('total', 0):.2f}")
    print(f"✓ Within Budget: {result.data.get('within_budget')}")
    print(f"✓ Items Found: {len(result.data.get('outfit_items', []))}")
    print(f"✓ Tools Used: {', '.join(result.tools_used)}")
    
    if result.errors:
        print(f"⚠️  Errors: {', '.join(result.errors)}")
    
    # Show items
    print("\nOutfit Items:")
    for item in result.data.get("outfit_items", []):
        product = item.get("product", {})
        print(f"  - {item.get('category')}: {product.get('title', 'Unknown')}")
        print(f"    Price: €{product.get('priceNumeric', 0)}")
        print(f"    Reason: {item.get('reason')}")
    
    print("\n" + "=" * 50)
    print(f"✅ Test Complete!")
    print(f"   Agent executed in {result.execution_time_ms:.0f}ms")
    
    return result


if __name__ == "__main__":
    result = asyncio.run(test_stylist_integration())
