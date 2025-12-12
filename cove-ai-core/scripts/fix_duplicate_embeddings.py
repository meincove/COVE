#!/usr/bin/env python3
"""
CRITICAL FIX: Remove duplicate product embeddings from database

Problem: Products were embedded twice, causing:
- 3862 products instead of 1933
- Same product appearing multiple times in search results
- Wasted embedding storage

Solution: Keep only ONE embedding per slug (the first one, which has lowest ID)
"""
import os
import psycopg
from dotenv import load_dotenv

# Load from the cove-ai-core directory
env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
load_dotenv(env_path)

PG_DSN = os.getenv("PG_DSN")

print("=" * 60)
print("CRITICAL FIX: REMOVING DUPLICATE PRODUCT EMBEDDINGS")
print("=" * 60)
print()

with psycopg.connect(PG_DSN) as conn:
    with conn.cursor() as cur:
        # Count before
        cur.execute("SELECT COUNT(*) FROM ai_core.docs WHERE kind = 'product'")
        before_count = cur.fetchone()[0]
        print(f"📊 BEFORE: {before_count} product entries")
        
        # Find duplicates
        cur.execute("""
            SELECT meta->>'slug' as slug, COUNT(*) as count
            FROM ai_core.docs
            WHERE kind = 'product'
            GROUP BY meta->>'slug'
            HAVING COUNT(*) > 1
        """)
        dupes = cur.fetchall()
        print(f"🔍 Found {len(dupes)} slugs with duplicates")
        print()
        
        if not dupes:
            print("✅ No duplicates found - database is clean!")
            exit(0)
        
        print("⚠️  WARNING: This will DELETE duplicate embeddings!")
        print(f"   Expected to remove: ~{before_count - len(set([d[0] for d in dupes]))} entries")
        print()
       
        response = input("Continue? (yes/no): ")
        if response.lower() != 'yes':
            print("❌ Aborted")
            exit(0)
        
        print("\n🔧 Deleting duplicates (keeping first entry for each slug)...")
        
        # For each slug with duplicates, keep only the one with the smallest ID
        cur.execute("""
            DELETE FROM ai_core.docs
            WHERE kind = 'product'
              AND id IN (
                SELECT id
                FROM (
                  SELECT 
                    id,
                    ROW_NUMBER() OVER (
                     PARTITION BY meta->>'slug' 
                      ORDER BY id
                    ) as rn
                  FROM ai_core.docs
                  WHERE kind = 'product'
                ) t
                WHERE rn > 1
              )
        """)
        
        deleted = cur.rowcount
        conn.commit()
        
        # Count after
        cur.execute("SELECT COUNT(*) FROM ai_core.docs WHERE kind = 'product'")
        after_count = cur.fetchone()[0]
        
        print()
        print("=" * 60)
        print("✅ CLEANUP COMPLETE!")
        print("=" * 60)
        print(f"   Before: {before_count} products")
        print(f"   Deleted: {deleted} duplicates")
        print(f"   After: {after_count} products")
        print()
        print("🎉 Search should now return unique products only!")
        print()
