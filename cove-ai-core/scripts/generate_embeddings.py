"""
Embedding Generation Pipeline for Product Catalog.
Generates and stores vector embeddings for all products in Neon database.
"""

import os
import sys
import asyncio
from pathlib import Path
from typing import List, Dict, Any
import json

import asyncpg
from dotenv import load_dotenv
from pgvector.asyncpg import register_vector
from openai import AsyncOpenAI

# Load environment
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL") or os.getenv("PG_DSN")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
EMBEDDING_MODEL = "openai/text-embedding-3-small"  # OpenRouter model name
BATCH_SIZE = 50

# OpenAI client pointing to OpenRouter
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


async def generate_product_embedding(product: Dict[str, Any]) -> List[float]:
    """
    Generate embedding for a product.
    Combines title, description, type, and tier for semantic search.
    """
    # Create rich text representation
    parts = [
        product.get("title", ""),
        product.get("description", ""),
        f"Type: {product.get('type', '')}",
        f"Tier: {product.get('tier', '')}"
    ]
    
    text = " ".join(p for p in parts if p)
    return await generate_embedding(text)


async def load_products_from_json() -> List[Dict[str, Any]]:
    """Load products from JSON file (fallback if DB empty)"""
    data_path = Path(__file__).parent.parent / "data" / "products.json"
    
    if data_path.exists():
        with open(data_path) as f:
            data = json.load(f)
            return data.get("products", [])
    
    print("⚠️  No products.json found, using sample data...")
    return [
        {
            "id": "prod_hoodie_designer",
            "slug": "hoodie-designer-fleece-59.99",
            "title": "Cove Designer Hoodie",
            "description": "Premium fleece hoodie with modern silhouette and exceptional comfort",
            "type": "hoodie",
            "tier": "designer",
            "price": 59.99,
            "currency": "EUR",
            "in_stock": True
        },
        {
            "id": "prod_tee_designer",
            "slug": "tee-designer-structured-34.99",
            "title": "Cove Designer Structured Tee",
            "description": "Structured cotton tee with refined details and perfect fit",
            "type": "tee",
            "tier": "designer",
            "price": 34.99,
            "currency": "EUR",
            "in_stock": True
        }
    ]


async def insert_product_with_embedding(
    conn: asyncpg.Connection,
    product: Dict[str, Any],
    embedding: List[float]
):
    """Insert or update product with its embedding"""
    # Register vector type if not already registered
    await register_vector(conn)
    
    await conn.execute(
        """
        INSERT INTO ai_products (
            id, slug, title, description, type, tier, price, currency, in_stock, embedding, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb)
        ON CONFLICT (id) DO UPDATE SET
            title = EXCLUDED.title,
            description = EXCLUDED.description,
            type = EXCLUDED.type,
            tier = EXCLUDED.tier,
            price = EXCLUDED.price,
            embedding = EXCLUDED.embedding,
            updated_at = NOW()
        """,
        product.get("id"),
        product.get("slug"),
        product.get("title"),
        product.get("description", ""),
        product.get("type"),
        product.get("tier"),
        product.get("price"),
        product.get("currency", "EUR"),
        product.get("in_stock", True),
        embedding,  # pgvector will handle the list -> vector conversion
        json.dumps(product.get("metadata", {}))
    )


async def generate_embeddings_for_products():
    """Main pipeline to generate and store embeddings"""
    
    print("\n" + "="*60)
    print("🔢 Product Embedding Generation Pipeline")
    print("="*60 + "\n")
    
    if not DATABASE_URL:
        print("❌ DATABASE_URL not set")
        sys.exit(1)
    
    # Load products
    print("📦 Loading products...")
    products = await load_products_from_json()
    print(f"   Found {len(products)} products\n")
    
    # Connect to Neon
    print("🔌 Connecting to Neon database...")
    conn = await asyncpg.connect(DATABASE_URL)
    
    try:
        # Register vector type
        await conn.execute("CREATE EXTENSION IF NOT EXISTS vector")
        
        # Process products in batches
        total = len(products)
        success_count = 0
        
        print(f"🚀 Generating embeddings (model: {EMBEDDING_MODEL})...\n")
        
        for i, product in enumerate(products, 1):
            try:
                # Generate embedding
                embedding = await generate_product_embedding(product)
                
                # Insert to database
                await insert_product_with_embedding(conn, product, embedding)
                
                success_count += 1
                print(f"   [{i}/{total}] ✅ {product.get('title')}")
                
                # Small delay to avoid rate limits
                if i % BATCH_SIZE == 0:
                    await asyncio.sleep(1)
                    
            except Exception as e:
                print(f"   [{i}/{total}] ❌ {product.get('title')}: {e}")
        
        # Verify
        count = await conn.fetchval("SELECT COUNT(*) FROM ai_products WHERE embedding IS NOT NULL")
        
        print(f"\n{'='*60}")
        print(f"✅ Embedding generation complete!")
        print(f"   Processed: {success_count}/{total}")
        print(f"   In database: {count} products with embeddings")
        print(f"{'='*60}\n")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(generate_embeddings_for_products())
