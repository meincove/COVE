#!/usr/bin/env python3
"""
Migration Script: Add outfit_category to all products

This script adds the `outfit_category` field to product metadata,
enabling category-constrained vector search for the outfit builder.

Usage:
    python scripts/migrate_outfit_categories.py

Categories:
    - tops: tee, shirt, blouse, sweater, hoodie, sweatshirt
    - bottoms: pants, jeans, shorts, joggers, trousers, skirt
    - shoes: sneakers, boots, loafers, heels, sandals
    - outerwear: jacket, blazer, coat
    - accessories: bag, hat, scarf, belt
    - dress: dress (special case - counts as full outfit)
"""

import json
import logging
from pathlib import Path
import psycopg
from psycopg.rows import dict_row

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
log = logging.getLogger(__name__)

# Category normalization mapping
# Maps specific product types -> outfit categories
OUTFIT_CATEGORY_MAP = {
    # Tops
    "tee": "tops",
    "shirt": "tops", 
    "blouse": "tops",
    "sweater": "tops",
    "hoodie": "tops",
    "sweatshirt": "tops",
    "top": "tops",
    "polo": "tops",
    "tank": "tops",
    "cardigan": "tops",
    
    # Bottoms
    "pants": "bottoms",
    "jeans": "bottoms",
    "shorts": "bottoms",
    "joggers": "bottoms",
    "trousers": "bottoms",
    "skirt": "bottoms",
    "chinos": "bottoms",
    "leggings": "bottoms",
    
    # Shoes
    "sneakers": "shoes",
    "boots": "shoes",
    "loafers": "shoes",
    "heels": "shoes",
    "sandals": "shoes",
    "shoes": "shoes",
    "flats": "shoes",
    "oxfords": "shoes",
    "mules": "shoes",
    
    # Outerwear
    "jacket": "outerwear",
    "blazer": "outerwear",
    "coat": "outerwear",
    "parka": "outerwear",
    "vest": "outerwear",
    
    # Accessories
    "bag": "accessories",
    "hat": "accessories",
    "scarf": "accessories",
    "belt": "accessories",
    "watch": "accessories",
    "jewelry": "accessories",
    "sunglasses": "accessories",
    "tie": "accessories",
    
    # Special
    "dress": "dress",
    "jumpsuit": "dress",
    "romper": "dress",
}


def normalize_outfit_category(product_type: str) -> str:
    """
    Map a specific product type to its outfit category.
    
    Args:
        product_type: The product's type field (e.g., "sneakers", "hoodie")
        
    Returns:
        Outfit category (e.g., "shoes", "tops")
    """
    if not product_type:
        return "other"
    
    type_lower = product_type.lower().strip()
    
    # Direct match
    if type_lower in OUTFIT_CATEGORY_MAP:
        return OUTFIT_CATEGORY_MAP[type_lower]
    
    # Fuzzy match - check if any key is contained in the type
    for key, category in OUTFIT_CATEGORY_MAP.items():
        if key in type_lower or type_lower in key:
            return category
    
    return "other"


def migrate_products(dry_run: bool = True):
    """
    Add outfit_category to all products in the database.
    
    Args:
        dry_run: If True, only show what would be changed without making changes
    """
    from app.core.config import PG_DSN
    import os
    
    dsn = PG_DSN or os.getenv("DATABASE_URL")
    if not dsn:
        raise RuntimeError("PG_DSN or DATABASE_URL must be set")
    
    log.info(f"🚀 Starting outfit_category migration (dry_run={dry_run})")
    
    with psycopg.connect(dsn, row_factory=dict_row) as conn:
        # Get all products
        with conn.cursor() as cur:
            cur.execute("""
                SELECT id, title, meta 
                FROM ai_core.docs 
                WHERE kind = 'product'
            """)
            products = cur.fetchall()
        
        log.info(f"📦 Found {len(products)} products to process")
        
        stats = {
            "tops": 0,
            "bottoms": 0,
            "shoes": 0,
            "outerwear": 0,
            "accessories": 0,
            "dress": 0,
            "other": 0,
            "already_set": 0,
        }
        
        updates = []
        
        for product in products:
            meta = product["meta"] or {}
            
            # Skip if already has outfit_category
            if meta.get("outfit_category"):
                stats["already_set"] += 1
                continue
            
            # Get product type and normalize
            product_type = meta.get("type", "")
            outfit_category = normalize_outfit_category(product_type)
            
            stats[outfit_category] = stats.get(outfit_category, 0) + 1
            
            # Prepare update
            new_meta = {**meta, "outfit_category": outfit_category}
            updates.append((json.dumps(new_meta), product["id"]))
            
            if len(updates) <= 5:
                log.info(f"  📝 {product['title'][:40]}: {product_type} → {outfit_category}")
        
        log.info(f"\n📊 Category Distribution:")
        for cat, count in sorted(stats.items(), key=lambda x: -x[1]):
            log.info(f"   {cat}: {count}")
        
        if dry_run:
            log.info(f"\n🔍 DRY RUN: Would update {len(updates)} products")
            return stats
        
        # Execute updates
        log.info(f"\n🔄 Updating {len(updates)} products...")
        
        with conn.cursor() as cur:
            cur.executemany("""
                UPDATE ai_core.docs 
                SET meta = %s::jsonb
                WHERE id = %s
            """, updates)
        
        conn.commit()
        log.info(f"✅ Successfully updated {len(updates)} products with outfit_category")
        
        return stats


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Add outfit_category to products")
    parser.add_argument("--execute", action="store_true", help="Actually perform the migration (default is dry run)")
    args = parser.parse_args()
    
    migrate_products(dry_run=not args.execute)
