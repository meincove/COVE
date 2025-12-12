#!/usr/bin/env python3
"""
FIXED: Update variant_id in existing embeddings.
Added proper error handling and verbose logging.
"""
import os
import sys
import asyncio
import json

# Add parent to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import asyncpg
import httpx

# Load env manually to avoid dotenv issues
env_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env')
if os.path.exists(env_path):
    with open(env_path) as f:
        for line in f:
            if '=' in line and not line.strip().startswith('#'):
                key, value = line.strip().split('=', 1)
                os.environ[key] = value

DATABASE_URL = os.getenv("DATABASE_URL") or os.getenv("PG_DSN")
BACKEND_URL = "http://localhost:8001/api/products/"

async def update_variant_ids():
    """Update variant_id in existing docs"""
    
    print("\n" + "="*70)
    print("🔧 FIXING: Update variant_id in Existing Embeddings")
    print("="*70 + "\n")
    
    if not DATABASE_URL:
        print("❌ DATABASE_URL/PG_DSN not set in environment")
        sys.exit(1)
    
    print(f"📍 Database: {DATABASE_URL[:50]}...")
    print(f"📍 Backend API: {BACKEND_URL}\n")
    
    # Test backend connectivity first
    try:
        async with httpx.AsyncClient(timeout=5) as test_client:
            resp = await test_client.get(f"{BACKEND_URL}?page_size=1")
            if resp.status_code != 200:
                print(f"❌ Backend API not responding: {resp.status_code}")
                sys.exit(1)
            print(f"✅ Backend API responding\n")
    except Exception as e:
        print(f"❌ Cannot reach backend API: {e}")
        sys.exit(1)
    
    # Connect to database
    print("🔌 Connecting to Neon...")
    try:
        conn = await asyncpg.connect(DATABASE_URL)
        print("✅ Connected to database\n")
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        sys.exit(1)
    
    try:
        # Get all product docs
        docs = await conn.fetch(
            "SELECT id, meta FROM ai_core.docs WHERE kind = 'product' LIMIT 2000"
        )
        
        total = len(docs)
        print(f"📦 Found {total} product embeddings to check\n")
        print("Starting updates...\n")
        
        updated = 0
        skipped = 0
        failed = 0
        
        async with httpx.AsyncClient(timeout=10) as client:
            for i, doc in enumerate(docs, 1):
                try:
                    meta = json.loads(doc['meta']) if isinstance(doc['meta'], str) else dict(doc['meta'])
                    
                    # Already has variant_id?
                    if meta.get('variant_id'):
                        skipped += 1
                        continue
                    
                    # Get slug
                    slug = meta.get('slug') or meta.get('groupSlug')
                    if not slug:
                        failed += 1
                        if i % 100 == 0:
                            print(f"   [{i}/{total}] No slug for doc {doc['id']}")
                        continue
                    
                    # Fetch from backend
                    resp = await client.get(f"{BACKEND_URL}?slug={slug}&page_size=1")
                    if resp.status_code == 200:
                        data = resp.json()
                        results = data.get('results', [])
                        if results:
                            product = results[0]
                            variants = product.get('color_variants', [])
                            if variants:
                                variant_id = variants[0].get('variant_id')
                                if variant_id:
                                    # Update metadata
                                    meta['variant_id'] = variant_id
                                    
                                    # Update in database
                                    await conn.execute(
                                        "UPDATE ai_core.docs SET meta = $1::jsonb WHERE id = $2",
                                        json.dumps(meta),
                                        doc['id']
                                    )
                                    
                                    updated += 1
                                    if updated % 50 == 0:
                                        print(f"   ✅ [{i}/{total}] Updated {updated} docs so far... ({slug})")
                                else:
                                    failed += 1
                            else:
                                failed += 1
                        else:
                            failed += 1
                    else:
                        failed += 1
                        
                except Exception as e:
                    failed += 1
                    if i % 100 == 0:
                        print(f"   ❌ [{i}/{total}] Error: {e}")
        
        print(f"\n{'='*70}")
        print(f"✅ UPDATE COMPLETE!")
        print(f"{'='*70}")
        print(f"   Total docs checked: {total}")
        print(f"   ✅ Updated: {updated}")
        print(f"   ⏭️  Skipped (had variant_id): {skipped}")
        print(f"   ❌ Failed: {failed}")
        print(f"{'='*70}\n")
        
        if updated > 0:
            print("✨ SUCCESS! Embeddings now have variant_id")
        else:
            print("⚠️  No updates made - check if embeddings already have variant_id")
        
    except Exception as e:
        print(f"\n❌ Fatal error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        await conn.close()
        print("\n🔌 Database connection closed\n")


if __name__ == "__main__":
    print("Starting update process...")
    asyncio.run(update_variant_ids())
