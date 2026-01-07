
import os
import sys
import json
from app.vector.store import get_conn

def check_data():
    print("🔍 Checking Product Data via Raw SQL...")
    
    try:
        with get_conn() as conn:
            with conn.cursor() as cur:
                # Fetch meta for 100 products
                cur.execute("SELECT meta FROM ai_core.docs WHERE kind='product' LIMIT 100")
                rows = cur.fetchall()
                
                print(f"Found {len(rows)} sample items.")
                
                combo_counts = {}
                
                for row in rows:
                    if isinstance(row, tuple):
                        meta = row[0]
                    else:
                        meta = row
                        
                    if not isinstance(meta, dict):
                        continue
                        
                    g = meta.get("gender", "N/A").lower()
                    t = meta.get("type", "N/A").lower()
                    
                    key = f"{g} | {t}"
                    combo_counts[key] = combo_counts.get(key, 0) + 1

                print("\n📊 Gender | Type Combinations (Sample 100):")
                for key, count in sorted(combo_counts.items()):
                    print(f"  [{key}]: {count}")

    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    check_data()
