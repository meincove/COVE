# app/cove_mcp/dev_client.py
"""
Minimal MCP dev client for Cove Commerce.

- Starts the local MCP server via stdio:
    python -m app.cove_mcp.commerce_server

- Lists available tools.
- Calls the `recommend_products` tool with a sample payload.

This is *dev-only* — for debugging your MCP server and tools layer.
"""

from __future__ import annotations

import asyncio
import json
import sys
from typing import Any, Dict

from mcp.client.stdio import StdioServerParameters, stdio_client
from mcp.client.session import ClientSession


async def _call_recommend_products(session: ClientSession) -> None:
    """
    Call the recommend_products MCP tool with a simple, realistic payload.

    This assumes your MCP server exposes a tool named 'recommend_products'
    that matches the cove_ai_tools.recommendations.recommend_products
    input contract:

        {
          "query": str,
          "filters": { ... },
          "top_k": int
        }

    If your tool name differs, just change TOOL_NAME below.
    """
    TOOL_NAME = "recommend_products"

    # This payload mirrors what agent.py already sends into the recs layer.
    args: Dict[str, Any] = {
        "query": "black hoodie M",  # interpreted by your recs engine
        "filters": {
            "type": "hoodie",
            "color": "black",
            "size": "M",
            "price_max": 30.0,
        },
        "top_k": 4,
    }

    print(f"\n▶ Calling MCP tool: {TOOL_NAME}")
    print("  arguments:", json.dumps(args, indent=2))

    result = await session.call_tool(TOOL_NAME, args)

    # `result.output` is a list of content blocks. We expect JSON.
    print("\n◼ Tool call raw result:")
    try:
        as_dict = result.model_dump()
        print(json.dumps(as_dict, indent=2, default=str))
    except Exception:
        print(result)


async def main() -> None:
    """
    Connect to the local Cove MCP server over stdio, list tools, and
    optionally call `recommend_products`.
    """
    # This matches how you start the server manually:
    #   python -m app.cove_mcp.commerce_server
    server_params = StdioServerParameters(
        command=sys.executable,
        args=["-m", "app.cove_mcp.commerce_server"],
    )

    # Create stdio transport and client session
    async with stdio_client(server_params) as (read, write):
        async with ClientSession(read, write) as session:
            # 1) Initialize the MCP session (handshake, capabilities, etc.)
            await session.initialize()
            print("✅ Connected to Cove MCP server via stdio.\n")

            # 2) List tools
            tools_result = await session.list_tools()
            tool_names = [tool.name for tool in tools_result.tools]

            print("Available MCP tools:")
            for tool in tools_result.tools:
                print(f"  - {tool.name} :: {tool.description!r}")

            # 3) If we have a recommend_products tool, call it once
            if "recommend_products" in tool_names:
                await _call_recommend_products(session)
            else:
                print(
                    "\n⚠ No 'recommend_products' tool found. "
                    "Check your commerce_server.py tool names."
                )


if __name__ == "__main__":
    asyncio.run(main())
