#!/usr/bin/env python3
"""Check what's actually IN the products"""
import os
import psycopg
from dotenv import load_dotenv
import json

# Load from the cove-ai-core directory
env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
load_dotenv(env_path)

PG_DSN = os.getenv("PG_DSN")

print("=== SAMPLE PRODUCTS IN DATABASE ===\n")

with psycopg.connect(PG_DSN) as conn:
    with conn.cursor() as cur:
        # Get a few hoodie products
        cur.execute("""
            SELECT 
                id,
                title,
                meta
            FROM ai_core.docs
            WHERE kind = 'product'
              AND title ILIKE '%hoodie%'
            LIMIT 5
        """)
        
        products = cur.fetchall()
        
        for i, (id, title, meta) in enumerate(products, 1):
            print(f"{i}. {title}")
            print(f"   ID: {id}")
            print(f"   Meta keys: {list(meta.keys())}")
            print(f"   Slug: {meta.get('slug', 'NO SLUG')}")
            print(f"   VariantID: {meta.get('variantId', 'NO VARIANT ID')}")
            print()
        
        # Check if there ARE unique slugs
        cur.execute("""
            SELECT COUNT(DISTINCT meta->>'slug')
            FROM ai_core.docs
            WHERE kind = 'product'
        """)
        
        unique_slugs = cur.fetchone()[0]
        print(f"📊 Unique slugs in DB: {unique_slugs}")
        print(f"📊 Total products: {len(products)} sampled")
