import asyncio
import json
import os
import sys
import random
import uuid
from pathlib import Path
from typing import List, Dict, Any
import logging

# Ensure we can import app modules
sys.path.append(str(Path(__file__).parent.parent))

from app.vector.store import get_conn
from app.providers.embedding import embed_query
import litellm

# Configure Logging
logging.basicConfig(level=logging.INFO)
log = logging.getLogger("data_gen")

MANIFEST_PATH = Path(__file__).parent / "brands_manifest.json"

# Image Placeholders
IMAGE_DEFAULTS = {
    "shoes": "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80",
    "boots": "https://images.unsplash.com/photo-1608256246200-53e635b5b65f?w=800&q=80", 
    "heels": "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=800&q=80",
    "sneakers": "https://images.unsplash.com/photo-1552346154-21d32810aba3?w=800&q=80",
    "loafers": "https://images.unsplash.com/photo-1614252369475-531eba835eb1?w=800&q=80",
    "blazer": "https://images.unsplash.com/photo-1591047139829-d91aecb6caea?w=800&q=80",
    "suit": "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&q=80", 
    "shirt": "https://images.unsplash.com/photo-1620799140408-ed5341cd2431?w=800&q=80",
    "dress": "https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=800&q=80",
    "gown": "https://images.unsplash.com/photo-1566174053879-31528523f8ae?w=800&q=80",
    "trousers": "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=800&q=80"
}

def get_placeholder_image(text: str) -> str:
    text_lower = text.lower()
    for key, url in IMAGE_DEFAULTS.items():
        if key in text_lower:
            return url
    return "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=800&q=80" # Generic clothes

async def generate_embedding(text: str) -> List[float]:
    try:
        return await embed_query(text)
    except Exception as e:
        log.error(f"Embedding failed: {e}")
        return [0.0] * 1536 

async def process_brands():
    if not MANIFEST_PATH.exists():
        log.error(f"Manifest not found at {MANIFEST_PATH}")
        return

    with open(MANIFEST_PATH, "r") as f:
        data = json.load(f)

    brands = data.get("brands", [])
    log.info(f"🚀 Starting generation for {len(brands)} brands...")
    
    products_to_insert = []

    for brand in brands:
        brand_name = brand["name"]
        products = brand["products"]
        base_price_min, base_price_max = brand["base_price_range"]
        
        log.info(f"  🏢 Processing Brand: {brand_name}")
        
        for prod_def in products:
            template_title = prod_def["template"]
            template_desc = prod_def["description"]
            colors = prod_def["colors"]
            
            for color in colors:
                title = template_title.replace("{color}", color)
                description = template_desc.replace("{color}", color)
                price = random.uniform(base_price_min, base_price_max)
                slug = f"{brand_name}-{title}".lower().replace(" ", "-").replace("&", "and")
                image_url = get_placeholder_image(title)
                
                # Categorization
                item_type = "product"
                specific_type = "other"
                title_lower = title.lower()
                
                known_types = ["hoodie", "tee", "pants", "shoes", "sneakers", "boots", "jacket", "blazer", "shirt", "dress", "skirt", "heels", "loafers", "suit", "gown", "trousers"]
                for kt in known_types:
                    if kt in title_lower:
                        specific_type = kt
                        break
                
                # Broad Category Logic
                if specific_type in ["shoes", "sneakers", "boots", "heels", "loafers"]:
                    item_type = "shoes"
                elif specific_type in ["blazer", "jacket", "shirt", "suit", "hoodie", "tee"]:
                     item_type = "top"
                elif specific_type in ["pants", "trousers", "skirt"]:
                     item_type = "bottom"
                elif specific_type in ["dress", "gown"]:
                     item_type = "dress"
                
                # Normalize specific type for DB if needed, or keep it rich
                # Gown -> dress
                db_type = specific_type
                if specific_type == "gown": db_type = "dress"
                if specific_type == "trousers": db_type = "pants"
                if "pump" in title_lower: db_type = "heels"

                # Generate Rich Metadata Structure matching `productVariantsFlat_v2.json`
                
                # Mock Fabric and Fit based on type
                fabric_info = {
                    "materialMain": "Leather" if item_type == "shoes" else "Cotton Blend",
                    "materialBlend": "Unknown",
                    "gsm": 0,
                    "stretchLevel": "medium",
                    "thickness": "medium",
                    "warmth": "all-season",
                    "breathability": "medium",
                    "softness": "medium"
                }
                
                if item_type == "shoes":
                     fabric_info = {"materialMain": "Leather", "materialBlend": "Rubber sole", "softness": "low", "stretchLevel": "none"}
                elif "wool" in description.lower():
                     fabric_info.update({"materialMain": "Wool", "warmth": "warm", "softness": "high"})
                elif "silk" in description.lower():
                    fabric_info.update({"materialMain": "Silk", "softness": "high", "breathability": "high"})
                
                # ENHANCEMENT: Append broad category/type to description for Keyword Search (BM25)
                # "Evening Silk Gown" -> "... This dress is perfect for..."
                search_boost = f" {db_type}"
                if item_type != db_type:
                    search_boost += f" {item_type}"
                
                # Check if keywords already in description to avoid spam
                if db_type not in description.lower():
                     description += f" This {db_type} is designed for style and comfort."
                if item_type not in description.lower() and item_type != "product":
                     description += f" A perfect pair of {item_type}."

                metadata = {
                    "variantId": f"{slug}-v1",
                    "groupId": f"GRP-{slug}",
                    "brandId": brand_name.upper().replace(" ", "_"),
                    "merchantId": "COVE_PARTNER",
                    "currency": "EUR",
                    "status": "active",
                    "type": db_type, # crucial for catalog_vocab
                    "price": round(price, 2),
                    "colorName": color.lower(),
                    "name": title,
                    "description": description,
                    "images": [image_url], 
                    "imageUrl": image_url, # Redundant but safe
                    "slug": slug,
                    
                    # Rich Nested Fields
                    "style": {
                        "dressCode": prod_def["styles"][0] if prod_def["styles"] else "casual",
                        "styleTags": prod_def["styles"] + [db_type, color.lower()],
                        "useCases": ["generated", "outfit_builder"],
                        "pattern": "solid"
                    },
                    "fabric": fabric_info,
                    "fitProfile": {
                        "fit": "regular",
                        "length": "regular",
                        "recommendedGender": "unisex"
                    },
                    "care": {
                        "careNotes": "Professional clean recommended."
                    },
                    
                    # Store vectors-specific fields
                    "colors": [{"colorName": color, "variantId": f"{slug}-v1"}], # Still needed for vocab extraction
                    "generated": True
                }
                
                embedding = await generate_embedding(f"{title} {description} {color} {brand_name} {' '.join(prod_def['styles'])}")
                
                product_record = {
                    "id": str(uuid.uuid4()),
                    "kind": "product",
                    "title": title,
                    "text": description,
                    "url": f"/product/{slug}", 
                    "metadata": json.dumps(metadata),
                    "embedding": embedding
                }
                
                products_to_insert.append(product_record)
                print(f"    - Prepared: {title} ({db_type})")

    if not products_to_insert:
        log.warning("No products generated.")
        return

    log.info(f"💾 Inserting {len(products_to_insert)} products into database...")
    
    try:
        with get_conn() as conn:
            with conn.cursor() as cur:
                for prod in products_to_insert:
                    cur.execute("DELETE FROM ai_core.docs WHERE url = %s", (prod["url"],))
                    
                    cur.execute("""
                        INSERT INTO ai_core.docs 
                        (id, kind, title, text, url, meta, embedding, created_at, updated_at)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
                    """, (
                        prod["id"],
                        prod["kind"],
                        prod["title"],
                        prod["text"],
                        prod["url"],
                        prod["metadata"],
                        prod["embedding"]
                    ))
            conn.commit()
        log.info(f"✅ Successfully inserted {len(products_to_insert)} products!")
        
    except Exception as e:
        log.error(f"Database insertion failed: {e}")

if __name__ == "__main__":
    asyncio.run(process_brands())
