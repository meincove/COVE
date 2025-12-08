"""
Generate embeddings for ALL real products from productVariantsFlat.json.
This embeds the complete catalog, not just mock data.
"""

import os
import sys
import asyncio
import json
from pathlib import Path
from typing import List, Dict, Any

sys.path.insert(0, str(Path(__file__).parent.parent))

import asyncpg
from dotenv import load_dotenv
from openai import AsyncOpenAI
from pgvector.asyncpg import register_vector

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL") or os.getenv("PG_DSN")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
EMBEDDING_MODEL = "openai/text-embedding-3-small"
PRODUCTS_FILE = Path(__file__).parent.parent.parent / "backend" / "data" / "productVariantsFlat.json"

client = AsyncOpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=OPENROUTER_API_KEY
)


async def generate_embedding(text: str) -> List[float]:
    """Generate embedding via OpenRouter"""
    response = await client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=[text]
    )
    return response.data[0].embedding


def load_all_products_from_json() -> List[Dict[str, Any]]:
    """Load ALL products from productVariantsFlat.json"""
    with open(PRODUCTS_FILE) as f:
        variant_products = json.load(f)
    
    products = []
    for idx, product in enumerate(variant_products):
        # Use variantId from JSON (e.g., "CCH001")
        variant_id = product.get("variantId", f"variant_{idx}")
        
        products.append({
            "id": variant_id,  # Unique variant ID
            "slug": product.get("groupSlug", ""),
            "title": product.get("name", "Unknown Product"),
            "description": product.get("description", f"{product.get('name', 'Product')} - {product.get('type', 'item')}"),
            "type": product.get("type", "unknown"),
            "tier": product.get("tier", "originals"),
            "price": float(product.get("price", 0)),
            "currency": product.get("currency", "EUR"),
            "in_stock": product.get("status") == "active",
            "size": product.get("sizes"),  # Size availability
            "color": product.get("colorName")
        })
    
    return products


async def embed_all_products():
    """Generate embeddings for ALL real products"""
    
    print("\n" + "="*70)
    print("🔢 EMBEDDING ALL PRODUCTS FROM productVariantsFlat.json")
    print("="*70 + "\n")
    
    # Load products
    print("📦 Loading products from productVariantsFlat.json...")
    products = load_all_products_from_json()
    print(f"   ✅ Found {len(products)} product variants\n")
    
    if not products:
        print("❌ No products found!")
        return
    
    # Show product breakdown
    types = {}
    tiers = {}
    for p in products:
        types[p['type']] = types.get(p['type'], 0) + 1
        tiers[p['tier']] = tiers.get(p['tier'], 0) + 1
    
    print("📊 Product breakdown:")
    print(f"   Types:")
    for type_name, count in sorted(types.items()):
        print(f"     - {type_name}: {count} variants")
    print(f"   Tiers:")
    for tier_name, count in sorted(tiers.items()):
        print(f"     - {tier_name}: {count} variants")
    print()
    
    # Connect to Neon
    print("🔌 Connecting to Neon database...")
    conn = await asyncpg.connect(DATABASE_URL)
    await register_vector(conn)
    
    try:
        # Clear existing embeddings (fresh start)
        print("🗑️  Clearing old embeddings...")
        await conn.execute("DELETE FROM ai_products")
        print(f"   Cleared table\n")
        
        # Generate embeddings
        print(f"🚀 Generating embeddings for {len(products)} products...\n")
        
        success = 0
        failed = []
        
        for i, product in enumerate(products, 1):
            try:
                # Generate embedding text
                text_parts = [
                    product['title'],
                    product['description'],
                    product['type'],
                    product['tier']
                ]
                if product.get('color'):
                    text_parts.append(product['color'])
                if product.get('size'):
                    text_parts.append(f"size {product['size']}")
                
                text = " ".join(text_parts)
                
                # Generate embedding
                embedding = await generate_embedding(text)
                
                # Insert to database
                await conn.execute(
                    """
                    INSERT INTO ai_products (
                        id, slug, title, description, type, tier, price, currency, in_stock, embedding, metadata
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb)
                    ON CONFLICT (id) DO UPDATE SET
                        title = EXCLUDED.title,
                        description = EXCLUDED.description,
                        embedding = EXCLUDED.embedding,
                        updated_at = NOW()
                    """,
                    str(product['id']),
                    product['slug'],
                    product['title'],
                    product['description'],
                    product['type'],
                    product['tier'],
                    product['price'],
                    product['currency'],
                    product['in_stock'],
                    embedding,
                    json.dumps({
                        "color": product.get('color'),
                        "size": product.get('size')
                    })
                )
                
                success += 1
                
                # Progress update every 10 items
                if i % 10 == 0 or i == len(products):
                    print(f"   [{i}/{len(products)}] ✅ {success} products embedded...")
                
                # Rate limit protection
                if i % 10 == 0:
                    await asyncio.sleep(0.5)
                    
            except Exception as e:
                failed.append((product['title'], str(e)))
                print(f"   [{i}/{len(products)}] ❌ {product['title']}: {e}")
        
        # Verify
        count = await conn.fetchval("SELECT COUNT(*) FROM ai_products WHERE embedding IS NOT NULL")
        types_in_db = await conn.fetch("SELECT type, COUNT(*) as count FROM ai_products GROUP BY type ORDER BY count DESC")
        
        print(f"\n{'='*70}")
        print(f"✅ EMBEDDING COMPLETE!")
        print(f"{'='*70}")
        print(f"\n📊 Results:")
        print(f"   Success: {success}/{len(products)}")
        print(f"   Failed: {len(failed)}")
        print(f"   In Neon DB: {count} products with embeddings\n")
        
        print(f"📦 Products in Neon by type:")
        for row in types_in_db:
            print(f"   - {row['type']}: {row['count']} products")
        
        if failed:
            print(f"\n⚠️  Failed products:")
            for title, error in failed[:5]:
                print(f"   - {title}: {error}")
        
        print(f"\n{'='*70}\n")
        
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(embed_all_products())
