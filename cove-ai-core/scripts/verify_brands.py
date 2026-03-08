
import os
import psycopg
import json
from dotenv import load_dotenv

# Load env vars from .env file in cove-ai-core
load_dotenv(os.path.join(os.path.dirname(__file__), '../.env'))

DB_URL = os.getenv("PG_DSN")

if not DB_URL:
    print("❌ PG_DSN not found in .env")
    exit(1)

def check_brands():
    try:
        with psycopg.connect(DB_URL) as conn:
            with conn.cursor() as cur:
                
                brands = ["Aura Minimalist", "Vortex Streetwear"]
                
                print(f"🔍 Checking for brands: {', '.join(brands)}...\n")
                
                for brand in brands:
                    # Check count
                    cur.execute("""
                        SELECT count(*) 
                        FROM ai_core.docs 
                        WHERE meta->>'brand' = %s
                    """, (brand,))
                    count = cur.fetchone()[0]
                    
                    print(f"🏷️  Brand: {brand}")
                    print(f"   - Count: {count} items")
                    
                    if count > 0:
                        # Check images
                        cur.execute("""
                            SELECT title, meta->>'image_url' as img , meta->>'type' as type
                            FROM ai_core.docs 
                            WHERE meta->>'brand' = %s
                            LIMIT 3
                        """, (brand,))
                        rows = cur.fetchall()
                        print(f"   - Sample Items:")
                        for r in rows:
                            print(f"     • {r[0]} ({r[2]})")
                            print(f"       Image: {r[1]}")
                    else:
                        print("   ❌ No items found! Need to ingest products.")
                    print("-" * 40)
        
    except Exception as e:
        print(f"❌ Error connecting to DB: {e}")

if __name__ == "__main__":
    check_brands()
