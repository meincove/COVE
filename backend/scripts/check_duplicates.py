
import os
import psycopg
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '../.env'))

DB_URL = os.getenv("DATABASE_URL")

def check_duplicates():
    if not DB_URL: return
    with psycopg.connect(DB_URL) as conn:
        with conn.cursor() as cur:
            # Check unique titles for Aura
            cur.execute("""
                SELECT count(DISTINCT title), count(*)
                FROM ai_core.docs 
                WHERE meta->>'brand' = 'Aura Minimalist'
            """)
            unique, total = cur.fetchone()
            print(f"Aura: {unique} unique titles out of {total} total items")
            
            # Check unique titles for Vortex
            cur.execute("""
                SELECT count(DISTINCT title), count(*)
                FROM ai_core.docs 
                WHERE meta->>'brand' = 'Vortex Streetwear'
            """)
            unique, total = cur.fetchone()
            print(f"Vortex: {unique} unique titles out of {total} total items")

if __name__ == "__main__":
    check_duplicates()
