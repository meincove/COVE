"""
Intent Classifier MCP Server
Exposes intent classification as MCP tool
"""

from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent
import json
from typing import Any
from .classifier import get_classifier


# Initialize MCP server
app = Server("intent-classifier")

# Initialize classifier
classifier = get_classifier()


@app.list_tools()
async def list_tools() -> list[Tool]:
    """List available MCP tools"""
    return [
        Tool(
            name="classify_intent",
            description="Classify user query into e-commerce intent using LLM + embeddings",
            inputSchema={
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "User's query text to classify"
                    },
                    "context": {
                        "type": "object",
                        "description": "Optional context (user_id, conversation history, etc.)",
                        "properties": {
                            "user_id": {"type": "string"},
                            "session_id": {" type": "string"},
                            "previous_intent": {"type": "string"}
                        }
                    }
                },
                "required": ["query"]
            }
        ),
        Tool(
            name="get_intent_config",
            description="Get current intent classification configuration",
            inputSchema={
                "type": "object",
                "properties": {}
            }
        )
    ]


@app.call_tool()
async def call_tool(name: str, arguments: Any) -> list[TextContent]:
    """Handle tool calls"""
    
    if name == "classify_intent":
        query = arguments.get("query")
        context = arguments.get("context", {})
        
        # Classify intent
        result = classifier.classify(query, context)
        
        return [TextContent(
            type="text",
            text=json.dumps(result, indent=2)
        )]
    
    elif name == "get_intent_config":
        # Return current configuration
        config = {
            "intents": list(classifier.intents.keys()),
            "settings": classifier.settings,
            "output_format": classifier.output_format
        }
        
        return [TextContent(
            type="text",
            text=json.dumps(config, indent=2)
        )]
    
    else:
        raise ValueError(f"Unknown tool: {name}")


async def main():
    """Run MCP server"""
    async with stdio_server() as (read_stream, write_stream):
        await app.run(
            read_stream,
            write_stream,
            app.create_initialization_options()
        )


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
