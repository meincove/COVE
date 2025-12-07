#!/usr/bin/env python3
"""
Test script for MCP client routing (Phase 4).

Tests feature flag, routing decisions, and fallback behavior.
"""
import asyncio
import sys
from pathlib import Path

# Add cove-ai-core to path
sys.path.insert(0, str(Path(__file__).parent))

from app.core.mcp_client import get_mcp_client, reload_mcp_config


async def test_routing():
    """Test MCP client routing."""
    print("\n" + "="*60)
    print("WEEK 5 PHASE 4 - MCP CLIENT ROUTING TEST")
    print("="*60)
    
    # Get client
    client = get_mcp_client()
    
    # Check configuration
    print(f"\n📋 Configuration:")
    print(f"   Use MCP: {client.should_use_mcp()}")
    print(f"   Tools configured: {len(client.config.get('tools', {}))}")
    print(f"   Fallback enabled: {client.config.get('features', {}).get('fallback_to_direct', True)}")
    
    # Test tool calls
    print(f"\n🧪 Testing Tool Routing:")
    
    test_cases = [
        ("recommend_products", {
            "query": "black hoodie",
            "filters": {"color": "black", "type": "hoodie"},
            "top_k": 3
        }),
        ("cart_add", {
            "variantId": "test-variant-123",
            "size": "M",
            "quantity": 1,
            "clerkUserId": "test-user"
        }),
    ]
    
    for tool_name, args in test_cases:
        print(f"\n  Testing: {tool_name}")
        try:
            result = await client.call_tool(tool_name, args)
            print(f"    ✅ Success: {type(result).__name__}")
            if isinstance(result, dict):
                print(f"       Keys: {list(result.keys())[:5]}...")
        except Exception as e:
            print(f"    ❌ Failed: {e}")
    
    # Display metrics
    print(f"\n📊 Routing Metrics:")
    metrics = client.get_metrics()
    for key, value in metrics.items():
        print(f"   {key}: {value}")
    
    print("\n" + "="*60)
    print("Phase 4 testing complete!")
    print("="*60 + "\n")


async def test_feature_flag():
    """Test feature flag switching."""
    print("\n🚩 Testing Feature Flag:")
    
    # Test with flag OFF (default)
    reload_mcp_config()
    client = get_mcp_client()
    print(f"\n  Flag OFF:")
    print(f"    should_use_mcp() = {client.should_use_mcp()}")
    
    # Test environment variable override
    import os
    os.environ["USE_MCP_TOOLS"] = "true"
    reload_mcp_config()
    client = get_mcp_client()
    print(f"\n  Flag ON (via env):")
    print(f"    should_use_mcp() = {client.should_use_mcp()}")
    
    # Clean up
    os.environ.pop("USE_MCP_TOOLS", None)


async def main():
    """Run all tests."""
    await test_feature_flag()
    await test_routing()


if __name__ == "__main__":
    asyncio.run(main())
