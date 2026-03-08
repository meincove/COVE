import sys
import os
import asyncio
import random
import logging
import json
from typing import List, Dict

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.vector.store import get_conn_sync
import sqlite3
from scripts.generate_assets_batch import generate_image, update_product_image

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
log = logging.getLogger("seed_brands")

BRANDS = {
    "Aura Minimalist": {
        "style": "clean, minimal, neutral colors, high-end fabric, soft lighting",
        "categories": ["T-Shirt", "Trousers", "Coat", "Sneakers", "Sweater"],
        "adjectives": ["Essential", "Raw", "Organic", "Pure", "Timeless"]
    },
    "Vortex Streetwear": {
        "style": "bold, futuristic, tech-wear, urban, dark moody lighting, neon accents",
        "categories": ["Hoodie", "Cargo Pants", "Tech Jacket", "High-tops", "Vest"],
        "adjectives": ["Cyber", "Tactical", "Night", "Urban", "Glitch"]
    }
}

IMG_MODEL = "openrouter/black-forest-labs/flux.2-pro"

def create_product(brand: str, category: str, style_guide: str) -> None:
    """Create a single product in DB and generate its image."""
    
    # Generate Title
    adj = random.choice(BRANDS[brand]["adjectives"])
    title = f"{brand} {adj} {category}"
    
    # Generate Prompt
    prompt = (
        f"Professional high-end e-commerce product card photography of {title}. "
        f"Style: {style_guide}. "
        f"Ghost mannequin style, clean studio background, 8k resolution, photorealistic, sharp focus on fabric texture."
    )
    
    log.info(f"🔨 Creating: {title}")
    
    # 1. Insert into Postgres (AI_CORE)
    product_id = ""
    # Create fake embedding for now (or use real one if needed, but for seeding 0s is fast)
    fake_embedding = [0.0] * 1536 
    
    # Generate detailed metadata matching existing schema
    slug = f"{brand.lower().replace(' ', '-')}-{adj.lower()}-{category.lower()}".replace(" ", "-")
    price = float(random.randint(80, 400))
    gender = random.choice(["men", "women", "unisex"])
    
    # Map simplistic categories to schema types
    type_map = {
        "T-Shirt": "tops", "Hoodie": "tops", "Sweater": "tops", "Vest": "tops",
        "Trousers": "bottoms", "Cargo Pants": "bottoms", 
        "Coat": "outerwear", "Tech Jacket": "outerwear",
        "Sneakers": "shoes", "High-tops": "shoes"
    }
    outfit_cat = type_map.get(category, "tops")
    
    meta_payload = {
        "name": title,
        "slug": slug,
        "type": category.lower(),
        "brand": brand,
        "color": "neutral", # Simplification for seeding
        "price": price,
        "style": {"styleTags": [style_guide.split(",")[0].strip(), "premium", "fashion"]},
        "gender": gender,
        "colorName": "neutral",
        "variantId": f"{slug}-v1",
        "description": f"A premium {category} from {brand}. {style_guide}.",
        "outfit_category": outfit_cat
    }

    try:
        with get_conn_sync() as conn:
            with conn.cursor() as cur:
                # Insert doc
                import uuid
                new_id = str(uuid.uuid4())
                cur.execute("""
                    INSERT INTO ai_core.docs (id, text, embedding, kind, title, meta)
                    VALUES (%s, %s, %s, 'product', %s, %s)
                    RETURNING id
                """, (
                    new_id,
                    f"Brand: {brand}. Item: {category}. Style: {style_guide}",
                    fake_embedding,
                    title,
                    json.dumps(meta_payload)
                ))
                product_id = str(cur.fetchone()[0])
                conn.commit()
    except Exception as e:
        log.error(f"❌ DB Insert Failed: {e}")
        return

    # 2. Generate Image
    try:
        log.info(f"🎨 Generating Image for {product_id}...")
        image_url = asyncio.run(generate_image(prompt, IMG_MODEL, product_id))
        
        if image_url and "placehold" not in image_url:
             update_product_image(product_id, image_url)
             log.info(f"✨ Created & Imaged: {title}")
        else:
             log.warning(f"⚠️ Image generation failed/mocked for {title}")

    except Exception as e:
        log.error(f"❌ Image Gen Failed: {e}")

def main():
    import json
    
    log.info("🚀 Starting Premium Brand Seed...")
    
    # Check for OpenRouter Key
    if not os.getenv("OPENROUTER_API_KEY"):
        log.error("❌ OPENROUTER_API_KEY not found! Cannot generate premium images.")
        return

    items_per_brand = 60
    
    for brand, data in BRANDS.items():
        log.info(f"--- Seeding {brand} ---")
        for _ in range(items_per_brand):
            cat = random.choice(data["categories"])
            create_product(brand, cat, data["style"])
            
    log.info("✅ Seeding Complete!")

if __name__ == "__main__":
    main()
