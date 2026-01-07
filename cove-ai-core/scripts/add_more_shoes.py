import asyncio
import os
import sys
import uuid
import random
import json
from dotenv import load_dotenv

# Add app to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.vector.store import get_conn_sync
from app.providers.embedding import embed_query

# Configure products
NEW_SHOES = [
    {"title": "Urban Runner White Sneakers", "type": "sneakers", "price": 120.00, "color": "white", "style": "casual"},
    {"title": "Classic Black Leather Boots", "type": "boots", "price": 180.00, "color": "black", "style": "casual chic"},
    {"title": "Elegant Nude Pumps", "type": "heels", "price": 150.00, "color": "nude", "style": "formal fancy"},
    {"title": "Suede Ankle Boots Brown", "type": "boots", "price": 165.00, "color": "brown", "style": "boho"},
    {"title": "High-Top Canvas Sneakers", "type": "sneakers", "price": 85.00, "color": "navy", "style": "streetwear"},
    {"title": "Strappy Gold Sandals", "type": "heels", "price": 130.00, "color": "gold", "style": "party fancy"},
    {"title": "Minimalist Leather Loafers", "type": "loafers", "price": 140.00, "color": "black", "style": "business casual"},
    {"title": "Running Performance Shoes", "type": "sneakers", "price": 160.00, "color": "grey", "style": "sporty"},
    {"title": "Velvet Evening Flats", "type": "shoes", "price": 95.00, "color": "burgundy", "style": "formal comfort"},
    {"title": "Chunky Platform Boots", "type": "boots", "price": 200.00, "color": "black", "style": "edgy"},
    {"title": "Classic Penny Loafers", "type": "loafers", "price": 155.00, "color": "brown", "style": "preppy"},
    {"title": "Elegant Red Pumps", "type": "heels", "price": 145.00, "color": "red", "style": "statement fancy"},
    {"title": "Canvas Slip-Ons", "type": "sneakers", "price": 60.00, "color": "beige", "style": "relaxed"},
    {"title": "Leather Chelsea Boots", "type": "boots", "price": 190.00, "color": "tan", "style": "classic"},
    {"title": "Metallic Silver Heels", "type": "heels", "price": 135.00, "color": "silver", "style": "party fancy"}
]

# Image mapping
IMAGES = {
    "sneakers": "https://images.unsplash.com/photo-1552346154-21d32810aba3?w=800&q=80",
    "boots": "https://images.unsplash.com/photo-1608256246200-53e635b5b65f?w=800&q=80",
    "heels": "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=800&q=80",
    "loafers": "https://images.unsplash.com/photo-1614252369475-531eba835eb1?w=800&q=80",
    "shoes": "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&q=80"
}

async def add_shoes():
    print(f"👟 Adding {len(NEW_SHOES)} new shoes...")
    
    products_to_insert = []
    
    for shoe in NEW_SHOES:
        title = shoe["title"]
        shoe_type = shoe["type"]
        price = shoe["price"]
        color = shoe["color"]
        style = shoe["style"]
        
        slug = f"shoe-{title.lower().replace(' ', '-')}"
        image_url = IMAGES.get(shoe_type, IMAGES["shoes"])
        
        description = f"A perfect pair of {shoe_type} in {color}. Great for {style} looks. Featuring high quality materials and comfort fit."
        
        # Meta structure
        metadata = {
            "slug": slug,
            "name": title,
            "type": shoe_type,
            "outfit_category": "shoes", # CRITICAL for outfit builder
            "price": price,
            "color": color,
            "colorName": color,
            "imageUrl": image_url,
            "description": description,
            "gender": "unisex", # simplify
            "brand": "Cove Footwear",
            "variantId": f"{slug}-v1",
            "style": {"styleTags": [style, shoe_type, "footwear"]}
        }
        
        # Determine embedding text
        text_to_embed = f"{title} {description} {color} {style} {shoe_type}"
        embedding = await embed_query(text_to_embed)
        
        record = {
            "id": str(uuid.uuid4()),
            "kind": "product",
            "title": title,
            "text": description,
            "url": f"/product/{slug}",
            "meta": json.dumps(metadata),
            "embedding": embedding
        }
        products_to_insert.append(record)
        print(f"  + Prepared: {title}")

    # Insert into DB
    with get_conn_sync() as conn:
        with conn.cursor() as cur:
            for p in products_to_insert:
                # Delete if exists (by slug check logic, or url)
                cur.execute("DELETE FROM ai_core.docs WHERE url = %s", (p["url"],))
                
                cur.execute("""
                    INSERT INTO ai_core.docs 
                    (id, kind, title, text, url, meta, embedding, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
                """, (
                    p["id"], p["kind"], p["title"], p["text"], p["url"], p["meta"], p["embedding"]
                ))
        conn.commit()

    print("✅ Done inserting shoes!")

if __name__ == "__main__":
    load_dotenv()
    asyncio.run(add_shoes())
