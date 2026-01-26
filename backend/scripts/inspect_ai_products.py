
import os
import psycopg
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '../.env'))

DB_URL = os.getenv("DATABASE_URL")

def inspect_schema():
    if not DB_URL:
        print("❌ DATABASE_URL not found")
        return

    try:
        with psycopg.connect(DB_URL) as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT column_name, data_type, is_nullable
                    FROM information_schema.columns 
                    WHERE table_name = 'ai_products'
                    ORDER BY ordinal_position
                """)
                rows = cur.fetchall()
                print("Table: ai_products")
                print(f"{'Column':<20} {'Type':<15} {'Nullable'}")
                print("-" * 50)
                for r in rows:
                    print(f"{r[0]:<20} {r[1]:<15} {r[2]}")

    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    inspect_schema()
