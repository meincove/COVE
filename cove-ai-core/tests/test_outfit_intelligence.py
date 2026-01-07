#!/usr/bin/env python3
"""
Deep Outfit Intelligence Test
"""

import asyncio
import httpx
import json
import psycopg
from app.core.config import PG_DSN

BASE_URL = "http://localhost:8000"

async def test_anchor(client, slug, title):
    print(f"\n🔎 Testing Anchor: {title} ({slug})")
    print("-" * 40)
    
    resp = await client.post(
        f"{BASE_URL}/ai/recs/complete-look",
        json={
            "anchor_slug": slug,
            "budget": 600
        }
    )
    
    if resp.status_code != 200:
        print(f"❌ Error: {resp.status_code}")
        print(resp.text)
        return

    data = resp.json()
    if not data.get("success"):
        print(f"❌ Outfit Builder Failed: {data.get('errors')}")
        return
        
    outfit_data = data.get("data", {})
    outfit_items = outfit_data.get("outfit_items", [])
    
    print(f"👗 Generated Outfit ({len(outfit_items)} items):")
    
    for item in outfit_items:
        prod = item.get("product", {})
        reason = item.get("reason", "")
        # Highlight semantic reasons
        if "visual vibe" in reason or "aesthetic" in reason:
            reason = f"✨ \033[92m{reason}\033[0m" # Green text
        print(f"   - [{item.get('category').upper()}] {prod.get('title')} (€{prod.get('price')})")
        print(f"     Reason: {reason}")

async def main():
    print("🚀 STRESS TESTING OUTFIT INTELLIGENCE")
    print("="*60)
    
    # Get 3 random items: 1 Dress, 1 Top, 1 Shoe
    queries = [
        "SELECT meta->>'slug', title FROM ai_core.docs WHERE kind='product' AND title ILIKE '%dress%' LIMIT 1",
        "SELECT meta->>'slug', title FROM ai_core.docs WHERE kind='product' AND (title ILIKE '%shirt%' OR title ILIKE '%top%') LIMIT 1",
        "SELECT meta->>'slug', title FROM ai_core.docs WHERE kind='product' AND title ILIKE '%shoe%' LIMIT 1"
    ]
    
    anchors = []
    with psycopg.connect(PG_DSN) as conn:
        with conn.cursor() as cur:
            for q in queries:
                cur.execute(q)
                row = cur.fetchone()
                if row: anchors.append(row)

    async with httpx.AsyncClient(timeout=60.0) as client:
        for slug, title in anchors:
            await test_anchor(client, slug, title)

if __name__ == "__main__":
    asyncio.run(main())
