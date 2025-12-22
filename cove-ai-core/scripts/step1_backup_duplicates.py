#!/usr/bin/env python3
"""
STEP 1: Create backup of IDs that will be deleted
This allows restore if something goes wrong
"""
import os
import psycopg
from dotenv import load_dotenv
import json

env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
load_dotenv(env_path)
PG_DSN = os.getenv("PG_DSN")

print("=" * 60)
print("STEP 1: CREATING BACKUP OF DUPLICATE IDs")
print("=" * 60)
print()

with psycopg.connect(PG_DSN) as conn:
    with conn.cursor() as cur:
        # Get list of IDs that will be deleted
        cur.execute("""
            SELECT id, meta->>'slug' as slug, title
            FROM (
              SELECT 
                id,
                meta,
                title,
                ROW_NUMBER() OVER (
                  PARTITION BY meta->>'slug' 
                  ORDER BY id
                ) as rn
              FROM ai_core.docs
              WHERE kind = 'product'
            ) t
            WHERE rn > 1
            ORDER BY slug, id
        """)
        
        to_delete = cur.fetchall()
        
        print(f"📋 Found {len(to_delete)} entries marked for deletion")
        print()
        
        if len(to_delete) > 0:
            print("Sample of what will be deleted:")
            for i, (id, slug, title) in enumerate(to_delete[:10], 1):
                print(f"  {i}. {title} (slug: {slug}, id: {id})")
            
            if len(to_delete) > 10:
                print(f"  ... and {len(to_delete) - 10} more")
            print()
            
            # Save to file
            backup_file = os.path.join(
                os.path.dirname(__file__),
                'backup_deleted_ids.json'
            )
            
            backup_data = {
                'deleted_count': len(to_delete),
                'deleted_ids': [{'id': id, 'slug': slug, 'title': title} for id, slug, title in to_delete]
            }
            
            with open(backup_file, 'w') as f:
                json.dump(backup_data, f, indent=2)
            
            print(f"✅ Backup saved to: {backup_file}")
            print()
        else:
            print("✅ No duplicates found!")

print("=" * 60)
print("READY FOR STEP 2: Run the deletion")
print("=" * 60)
