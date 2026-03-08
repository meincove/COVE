
import asyncio
import os
from dotenv import load_dotenv
from app.vector.store import search_keyword

load_dotenv(os.path.join(os.path.dirname(__file__), '../.env'))

async def extract_bm25():
    print("Testing BM25 search for 'Aura'...")
    results = await search_keyword("Aura", kind="product", top_k=10)
    print(f"Found {len(results)} items.")
    for r in results:
        print(f" - {r['title']} (Score: {r['score']})")
        
    print("\nTesting BM25 search for 'Aura Minimalist products'...")
    results = await search_keyword("Aura Minimalist products", kind="product", top_k=10)
    print(f"Found {len(results)} items.")
    for r in results:
        print(f" - {r['title']} (Score: {r['score']})")

if __name__ == "__main__":
    asyncio.run(extract_bm25())
