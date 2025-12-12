"""
End-to-end test for Multi-Agent Orchestrator.

Tests complete outfit building workflow with all 3 agents.
"""

import asyncio
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from app.agents import orchestrator


async def test_outfit_workflow():
    """Test complete outfit builder workflow."""
    
    print("🧪 MULTI-AGENT ORCHESTRATOR TEST\n")
    print("=" * 60)
    
    # Test query
    query = "business casual outfit for client meeting"
    budget = 300
    
    print(f"Query: {query}")
    print(f"Budget: €{budget}")
    print()
    
    # Execute workflow
    print("🚀 Executing workflow...")
    print("-" * 60)
    
    result = await orchestrator.execute_workflow(
        workflow_name="outfit_builder",
        query=query,
        context={
            "budget_max": budget,
            "user_id": "test_user_123"
        }
    )
    
    print()
    print("=" * 60)
    print("✅ WORKFLOW COMPLETE")
    print("=" * 60)
    print()
    
    # Print results
    print(f"Success: {result.get('success')}")
    print(f"Confidence: {result.get('confidence', 0):.0%}")
    print(f"Reasoning: {result.get('reasoning')}")
    print()
    
    print("📦 Outfit Items:")
    outfit_items = result.get("outfit_items", [])
    for i, item in enumerate(outfit_items, 1):
        product = item.get("product", {})
        print(f"  {i}. {item.get('category', 'unknown').title()}")
        print(f"     Product: {product.get('title', product.get('name', 'Unknown'))}")
        print(f"     Price: €{product.get('priceNumeric', 0)}")
        if item.get("recommended_size"):
            print(f"     Size: {item['recommended_size']} (confidence: {item.get('size_confidence', 0):.0%})")
        print(f"     Reason: {item.get('reason', 'N/A')}")
    
    print()
    print(f"💰 Total: €{result.get('total', 0):.2f}")
    print(f"   Within Budget: {result.get('within_budget', 'Unknown')}")
    
    if result.get("discount_applied"):
        discount = result["discount_applied"]
        print(f"   Discount: {discount.get('code')} (-€{discount.get('savings', 0):.2f})")
    
    print()
    print("⏱️  Agent Timings:")
    for agent, timing_ms in result.get("agent_timings", {}).items():
        print(f"   {agent}: {timing_ms:.0f}ms")
    
    if result.get("errors"):
        print()
        print("⚠️  Errors:")
        for error in result["errors"]:
            print(f"   - {error}")
    
    print()
    print("=" * 60)
    print(f"📊 Orchestrator Metrics: {orchestrator.get_metrics()}")
    print("=" * 60)


if __name__ == "__main__":
    print("Starting test...\n")
    asyncio.run(test_outfit_workflow())
    print("\n✅ Test complete!")
