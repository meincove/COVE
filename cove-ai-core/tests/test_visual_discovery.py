#!/usr/bin/env python3
"""
Visual Discovery "See Similar" Test
"""

import asyncio
import httpx
import json
import psycopg
from app.core.config import PG_DSN

BASE_URL = "http://localhost:8000"

def get_random_slug():
    with psycopg.connect(PG_DSN) as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT meta->>'slug' FROM ai_core.docs WHERE kind='product' AND embedding IS NOT NULL LIMIT 1")
            row = cur.fetchone()
            return row[0] if row else None

async def main():
    print("🚀 TESTING VISUAL DISCOVERY")
    print("="*60)
    
    slug = get_random_slug()
    if not slug:
        print("❌ No products with embeddings found in DB.")
        return

    print(f"📌 Anchor Product Slug: {slug}")
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        resp = await client.post(
            f"{BASE_URL}/ai/recs/similar",
            json={
                "slug": slug,
                "top_k": 5
            }
        )
        
        if resp.status_code != 200:
            print(f"❌ Error: {resp.status_code}")
            print(resp.text)
            return

        data = resp.json()
        items = data.get("items", [])
        
        print(f"\n📦 Found {len(items)} Similar Items:")
        for item in items:
            print(f"   - [{item.get('score'):.3f}] {item.get('title')} ({item.get('slug')})")

if __name__ == "__main__":
    asyncio.run(main())
