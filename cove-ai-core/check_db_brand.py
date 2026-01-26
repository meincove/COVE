
import os
import sys
import json
import asyncio
from app.vector.store import get_conn_sync

def check_brands():
    print("--- 🔍 Checking Database for StreetVibe Items ---")
    try:
        with get_conn_sync() as conn:
            with conn.cursor() as cur:
                # 1. Check metadata of StreetVibe items
                cur.execute("SELECT title, meta FROM ai_core.docs WHERE title ILIKE 'StreetVibe%' LIMIT 3")
                rows = cur.fetchall()
                if not rows:
                    print("❌ No items found starting with 'StreetVibe'")
                else:
                    for row in rows:
                        title = row[0]
                        meta = row[1] 
                        # Psycopg returns dict for jsonb
                        print(f"Item: {title}")
                        print(f"Meta Brand: {meta.get('brand')}")
                        print(f"Meta Keys: {list(meta.keys())}")
                        print("-" * 20)

                # 2. Check what brands exist in the DB (vocab source)
                print("\n--- 📚 Distinct Brands in DB ---")
                cur.execute("SELECT DISTINCT lower(meta->>'brand') FROM ai_core.docs WHERE meta->>'brand' IS NOT NULL")
                brands = cur.fetchall()
                print(f"Found {len(brands)} brands: {[b[0] for b in brands]}")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_brands()
