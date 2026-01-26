
import os
import psycopg
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '../.env'))

DB_URL = os.getenv("DATABASE_URL")

def debug_titles():
    if not DB_URL: return
    with psycopg.connect(DB_URL) as conn:
        with conn.cursor() as cur:
            # Check Aura via Slug
            print("--- Aura Samples (via slug) ---")
            cur.execute("SELECT title, slug FROM ai_products WHERE slug LIKE 'aura-minimalist%' LIMIT 5")
            for r in cur.fetchall():
                print(r)
                
            print("\n--- Vortex Samples (via slug) ---")
            cur.execute("SELECT title, slug FROM ai_products WHERE slug LIKE 'vortex-streetwear%' LIMIT 5")
            for r in cur.fetchall():
                print(r)
                
            print("\n--- Global Count via Slug ---")
            cur.execute("SELECT count(*) FROM ai_products WHERE slug LIKE 'aura-minimalist%'")
            print(f"Aura slugs: {cur.fetchone()[0]}")
            
            cur.execute("SELECT count(*) FROM ai_products WHERE slug LIKE 'vortex-streetwear%'")
            print(f"Vortex slugs: {cur.fetchone()[0]}")

if __name__ == "__main__":
    debug_titles()
