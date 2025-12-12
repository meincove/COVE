#!/usr/bin/env python3
"""Check for duplicate products in the database"""
import os
import psycopg
from dotenv import load_dotenv

# Load from the cove-ai-core directory
env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
load_dotenv(env_path)

PG_DSN = os.getenv("PG_DSN")

if not PG_DSN:
    print("❌ PG_DSN not found in .env file")
    exit(1)

print("=== CHECKING FOR DUPLICATE PRODUCTS ===\n")

with psycopg.connect(PG_DSN) as conn:
    with conn.cursor() as cur:
        # Count total products
        cur.execute("SELECT COUNT(*) FROM ai_core.docs WHERE kind = 'product'")
        total = cur.fetchone()[0]
        
        # Count unique titles
        cur.execute("SELECT COUNT(DISTINCT title) FROM ai_core.docs WHERE kind = 'product'")
        unique_titles = cur.fetchone()[0]
        
        # Count unique variantIds  
        cur.execute("SELECT COUNT(DISTINCT meta->>'variantId') FROM ai_core.docs WHERE kind = 'product' AND meta->>'variantId' IS NOT NULL")
        unique_variants = cur.fetchone()[0]
        
        print(f"📊 Database Stats:")
        print(f"   Total products: {total}")
        print(f"   Unique titles: {unique_titles}")
        print(f"   Unique variantIds: {unique_variants}")
        print()
        
        # Check for duplicates
        cur.execute("""
            SELECT 
                meta->>'variantId' as variant_id,
                COUNT(*) as count,
                array_agg(id ORDER BY id) as doc_ids,
                array_agg(meta->>'slug' ORDER BY id) as slugs,
                MAX(title) as title
            FROM ai_core.docs
            WHERE kind = 'product'
              AND meta->>'variantId' IS NOT NULL
            GROUP BY meta->>'variantId'
            HAVING COUNT(*) > 1
            ORDER BY count DESC, variant_id
            LIMIT 20
        """)
        
        dupes = cur.fetchall()
        
        if dupes:
            print(f"❌ FOUND {len(dupes)} VARIANT IDS WITH DUPLICATES:\n")
            for i, row in enumerate(dupes[:5], 1):
                variant_id, count, doc_ids, slugs, title = row
                print(f"{i}. {title}")
                print(f"   VariantID: {variant_id}")
                print(f"   Duplicates: {count} entries")
                print(f"   Slugs: {', '.join(slugs)}")
                print()
            
            print(f"\n💥 TOTAL WASTE: {total - unique_variants} duplicate entries")
            print(f"   This is WHY search shows same product multiple times!\n")
            print(f"🔧 FIX NEEDED: Clean duplicates from database OR deduplicate in search layer")
        else:
            print("✅ No duplicate variantIds - database is clean!")
