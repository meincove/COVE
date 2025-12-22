
import os
import psycopg
from dotenv import load_dotenv

load_dotenv()

def dump_vocab():
    dsn = os.getenv("PG_DSN") or os.getenv("DATABASE_URL")
    if not dsn:
        print("❌ Error: PG_DSN or DATABASE_URL not set")
        return
    conn = psycopg.connect(dsn)
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")
            tables = [row[0] for row in cur.fetchall()]
            print(f"Tables: {tables}")
            
            # Try to find a product table
            table_name = "ai_products" # fallback
            for t in tables:
                if "ai_products" in t:
                    table_name = t
                    break
            
            print(f"Using table: {table_name}")
            cur.execute(f"SELECT DISTINCT type FROM {table_name} WHERE type IS NOT NULL AND type != ''")
            types = [row[0] for row in cur.fetchall()]
            print(f"Types in DB: {sorted(types)}")
            
            cur.execute(f"SELECT DISTINCT metadata->>'color' FROM {table_name} WHERE metadata->>'color' IS NOT NULL")
            colors = [row[0] for row in cur.fetchall()]
            print(f"Colors in Metadata: {sorted(colors)}")
    finally:
        conn.close()

if __name__ == "__main__":
    dump_vocab()
