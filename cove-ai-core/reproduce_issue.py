
import asyncio
import os
import sys

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from dotenv import load_dotenv
load_dotenv()

from app.services.search_service import search_products_hybrid

async def main():
    payload = {
        "query": "Show me some hoodies",
        "filters": {"type": "hoodie"},
        "top_k": 20
    }
    
    print(f"Testing search with payload: {payload}")
    result = await search_products_hybrid(payload)
    items = result.get("items", [])
    print(f"Found {len(items)} items")
    for item in items:
        print(f"- {item.get('title')} ({item.get('type')})")

if __name__ == "__main__":
    asyncio.run(main())
