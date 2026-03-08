import os
import psycopg
from dotenv import load_dotenv

load_dotenv("/Users/ssg/Desktop/COVE/cove-ai-core/.env")

PG_DSN = os.getenv("PG_DSN")

def check_products():
    with psycopg.connect(PG_DSN) as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT title, meta->>'type' as type, meta->>'brand' as brand 
                FROM ai_core.docs 
                WHERE kind = 'product' AND lower(meta->>'brand') = 'vortex streetwear'
                ORDER BY title;
            """)
            rows = cur.fetchall()
            print(f"Found {len(rows)} products for Vortex Streetwear:")
            for row in rows:
                print(f"- {row[0]} (Type: {row[1]}, Brand: {row[2]})")

            cur.execute("""
                SELECT title, meta->>'type' as type, meta->>'brand' as brand 
                FROM ai_core.docs 
                WHERE kind = 'product' AND lower(meta->>'brand') = 'aura minimalist'
                ORDER BY title;
            """)
            rows = cur.fetchall()
            print(f"\nFound {len(rows)} products for Aura Minimalist:")
            for row in rows:
                print(f"- {row[0]} (Type: {row[1]}, Brand: {row[2]})")

if __name__ == "__main__":
    check_products()
