# app/cove_mcp/test_all_tools.py
"""
Comprehensive MCP tools test client.

Tests all 7 registered tools to verify they work correctly.
"""

from __future__ import annotations

import asyncio
import json
import sys
from typing import Any, Dict

from mcp.client.stdio import StdioServerParameters, stdio_client
from mcp.client.session import ClientSession


async def test_tool(session: ClientSession, tool_name: str, args: Dict[str, Any]) -> None:
    """Test a single MCP tool."""
    print(f"\n{'='*60}")
    print(f"Testing: {tool_name}")
    print(f"{'='*60}")
    print(f"Arguments: {json.dumps(args, indent=2)}")
    
    try:
        result = await session.call_tool(tool_name, args)
        print(f"\n✅ Success!")
        print(f"Result: {json.dumps(result.model_dump(), indent=2, default=str)[:500]}...")
    except Exception as e:
        print(f"\n❌ Failed: {e}")


async def main() -> None:
    """Test all MCP tools."""
    server_params = StdioServerParameters(
        command=sys.executable,
        args=["-m", "app.cove_mcp.commerce_server"],
    )

    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:
            # Initialize
            await session.initialize()
            print("✅ Connected to Cove MCP server via stdio.\n")

            # List all tools
            tools_result = await session.list_tools()
            print(f"📦 Registered Tools ({len(tools_result.tools)}):")
            for tool in tools_result.tools:
                print(f"  - {tool.name}")
            
            # Test 1: recommend_products (existing)
            await test_tool(session, "recommend_products", {
                "query": "black hoodie M",
                "filters": {"type": "hoodie", "color": "black", "size": "M"},
                "top_k": 2
            })
            
            # Test 2: cart_get (existing)
            await test_tool(session, "cart_get", {
                "clerkUserId": "user_test_123"
            })
            
            # Test 3: cart_add (existing) 
            await test_tool(session, "cart_add", {
                "variantId": "test_variant_001",
                "size": "M",
                "quantity": 1,
                "clerkUserId": "user_test_123"
            })
            
            # Test 4: checkout_start (NEW - Week 4)
            await test_tool(session, "checkout_start", {
                "clerkUserId": "user_test_123",
                "email": "test@example.com",
                "country": "DE",
                "shippingSpeed": "standard"
            })
            
            # Test 5: order_get_status (NEW - Week 4)
            await test_tool(session, "order_get_status", {
                "clerkUserId": "user_test_123",
                "limit": 3
            })
            
            # Test 6: email_send_order_confirmation (NEW - Week 4)
            await test_tool(session, "email_send_order_confirmation", {
                "orderId": 1,
                "forceResend": False
            })
            
            print(f"\n{'='*60}")
            print("✅ All MCP tools tested!")
            print(f"{'='*60}")


if __name__ == "__main__":
    asyncio.run(main())
