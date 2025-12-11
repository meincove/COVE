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
    Generate embedding for a product using brand-aware text.
    Uses backend_loader transformation for consistency.
    """
    sys.path.insert(0, str(Path(__file__).parent.parent))
    from app.vector.backend_loader import transform_for_embedding
    
    text = transform_for_embedding(product)
    return await generate_embedding(text)


async def load_products_from_api() -> List[Dict[str, Any]]:
    """Load products from backend API"""
    # Add parent directory to path to import from app/
    sys.path.insert(0, str(Path(__file__).parent.parent))
    
    from app.vector.backend_loader import fetch_all_products
    
    print("   Fetching from backend API...")
    products = await fetch_all_products()
    print(f"   ✅ Retrieved {len(products)} products from API")
    
    return products


async def insert_product_with_embedding(
    conn: asyncpg.Connection,
    product: Dict[str, Any],
    embedding: List[float]
):
    """Insert or update product with its embedding in ai_core.docs"""
    sys.path.insert(0, str(Path(__file__).parent.parent))
    from app.vector.backend_loader import get_product_metadata, transform_for_embedding
    
    # Register vector type if not already registered
    await register_vector(conn)
    
    # Get metadata and text  
    metadata = get_product_metadata(product)
    text = transform_for_embedding(product)
    
    # Use product variant_id as primary ID
    doc_id = metadata.get("variant_id") or metadata.get("product_id")
    title = metadata.get("name")
    url = metadata.get("url")
    
    await conn.execute(
        """
        INSERT INTO ai_core.docs (
            id, kind, title, text, url, meta, embedding
        ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)
        ON CONFLICT (id) DO UPDATE SET
            title = EXCLUDED.title,
            text = EXCLUDED.text,
            url = EXCLUDED.url,
            meta = EXCLUDED.meta,
            embedding = EXCLUDED.embedding
        """,
        doc_id,
        "product",  # kind
        title,
        text,
        url,
        json.dumps(metadata),
        embedding
    )


async def generate_embeddings_for_products():
    """Main pipeline to generate and store embeddings from backend API"""  
    
    print("\n" + "="*60)
    print("🔢 Product Embedding Generation Pipeline (Backend API)")
    print("="*60 + "\n")
    
    if not DATABASE_URL:
        print("❌ DATABASE_URL not set")
        sys.exit(1)
    
    # Load products from backend API
    print("📦 Loading products from backend API...")
    products = await load_products_from_api()
    
    # Show brand distribution
    brands = {}
    for p in products:
        brand = p.get("brand_id", "Unknown")
        brands[brand] = brands.get(brand, 0) + 1
    
    print(f"   Found {len(products)} products across {len(brands)} brands:")
    for brand, count in sorted(brands.items()):
        print(f"     - {brand}: {count} products")
    print()
    
    # Connect to Neon
    print("🔌 Connecting to Neon database...")
    conn = await asyncpg.connect(DATABASE_URL)
    
    try:
        # Ensure schema and extension exist
        await conn.execute("CREATE EXTENSION IF NOT EXISTS vector")
        await conn.execute("CREATE SCHEMA IF NOT EXISTS ai_core")
        
        # Process products
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
                
                # Progress indicator (every 50 products)
                if i % 50 == 0 or i == total:
                    print(f"   [{i}/{total}] {product.get('brand_id')} - {product.get('name')}")
                
                # Small delay to avoid rate limits
                if i % BATCH_SIZE == 0:
                    await asyncio.sleep(1)
                    
            except Exception as e:
                print(f"   [{i}/{total}] ❌ {product.get('name')}: {e}")
        
        # Verify
        count = await conn.fetchval(
            "SELECT COUNT(*) FROM ai_core.docs WHERE kind = 'product' AND embedding IS NOT NULL"
        )
        
        print(f"\n{'='*60}")
        print(f"✅ Embedding generation complete!")
        print(f"   Processed: {success_count}/{total}")
        print(f"   In database: {count} product embeddings")
        print(f"   Brands: {len(brands)}")
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
