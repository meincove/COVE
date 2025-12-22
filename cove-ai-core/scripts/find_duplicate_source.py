#!/usr/bin/env python3
"""Find where the duplicates came from"""
import os
import psycopg
from dotenv import load_dotenv

# Load from the cove-ai-core directory
env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
load_dotenv(env_path)

PG_DSN = os.getenv("PG_DSN")

print("=== FINDING DUPLICATE SOURCE ===\n")

with psycopg.connect(PG_DSN) as conn:
    with conn.cursor() as cur:
        # Group by slug to find duplicates
        cur.execute("""
            SELECT 
                meta->>'slug' as slug,
                COUNT(*) as count,
                array_agg(DISTINCT title) as titles
            FROM ai_core.docs
            WHERE kind = 'product'
              AND meta->>'slug' IS NOT NULL
            GROUP BY meta->>'slug'
            HAVING COUNT(*) > 1
            ORDER BY count DESC
            LIMIT 10
        """)
        
        dupes = cur.fetchall()
        
        if dupes:
            print(f"❌ FOUND {len(dupes)} SLUGS WITH MULTIPLE ENTRIES:\n")
            for slug, count, titles in dupes[:5]:
                print(f"Slug: {slug}")
                print(f"  Count: {count} entries")
                print(f"  Titles: {titles}")
                print()
            
            # This is the problem - same slug embedded multiple times!
            print("\n💥 ROOT CAUSE: Same products embedded multiple times!")
            print("   Each product variant created a separate embedding")
            print("   Should be: 1 embedding per product")
            print("   Actually: Multiple embeddings for same product\n")
        else:
            print("✅ No duplicate slugs found")
