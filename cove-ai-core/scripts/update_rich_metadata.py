"""
Update existing products in ai_core.docs with rich metadata from productVariantsFlat_v2.json
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.vector.store import connect

# Load product data
PRODUCTS_FILE = Path(__file__).parent.parent.parent / "backend" / "data" / "productVariantsFlat_v2.json"

def update_product_metadata():
    print("🔄 Updating product metadata with rich details...")
    
    # Load products from JSON
    with open(PRODUCTS_FILE) as f:
        products = json.load(f)
    
    print(f"📦 Loaded {len(products)} products from JSON")
    
    # Connect to database
    conn = connect()
    
    updated = 0
    not_found = 0
    
    try:
        for product in products:
            variant_id = product.get("variantId")
            if not variant_id:
                continue
            
            # Build rich metadata
            meta = {
                "variantId": variant_id,
                "groupId": product.get("groupId"),
                "groupSlug": product.get("groupSlug"),
                "name": product.get("name"),
                "tier": product.get("tier"),
                "type": product.get("type"),
                "material": product.get("material"),
                "gender": product.get("gender"),
                "fit": product.get("fit"),
                "colorName": product.get("colorName"),
                "hex": product.get("hex"),
                "price": product.get("price"),
                "sizes": product.get("sizes"),
                "images": product.get("images"),
                "description": product.get("description"),
                # Rich details
                "fabric": product.get("fabric"),
                "style": product.get("style"),
                "fitProfile": product.get("fitProfile"),
                "care": product.get("care"),
                "styleNotes": product.get("styleNotes"),
                "fitNotes": product.get("fitNotes"),
            }
            
            # Update in database (use variant_id with underscore, not variantId)
            with conn.cursor() as cur:
                cur.execute(
                    """
                    UPDATE ai_core.docs 
                    SET meta = %s::jsonb
                    WHERE kind = 'product' 
                    AND meta->>'variant_id' = %s
                    """,
                    (json.dumps(meta), variant_id)
                )
                
                if cur.rowcount > 0:
                    updated += 1
                else:
                    not_found += 1
            
            if updated % 100 == 0:
                print(f"   Updated {updated} products...")
        
        conn.commit()
        
        print(f"\n✅ Update complete!")
        print(f"   Updated: {updated}")
        print(f"   Not found in DB: {not_found}")
        
    finally:
        conn.close()

if __name__ == "__main__":
    update_product_metadata()
