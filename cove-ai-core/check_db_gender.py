
import os
import psycopg
from app.core.config import PG_DSN

DB_DSN = PG_DSN or os.getenv("DATABASE_URL")

def check_genders():
    try:
        conn = psycopg.connect(DB_DSN)
        with conn.cursor() as cur:
            cur.execute("SELECT DISTINCT meta->>'gender' FROM ai_core.docs WHERE kind = 'product'")
            rows = cur.fetchall()
            print("Distinct Genders in DB:", [r[0] for r in rows])
            
            # Also check specific pants gender
            cur.execute("SELECT title, meta->>'gender' FROM ai_core.docs WHERE kind = 'product' AND meta->>'type' = 'pants' LIMIT 5")
            rows = cur.fetchall()
            print("\nSample Pants Genders:", rows)
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    check_genders()
