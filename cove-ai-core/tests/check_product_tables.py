import os
import psycopg
from dotenv import load_dotenv

load_dotenv()

def check_tables():
    dsn = os.getenv("PG_DSN") or os.getenv("DATABASE_URL")
    if not dsn:
        print("❌ Error: PG_DSN or DATABASE_URL not set")
        return
    conn = psycopg.connect(dsn)
    try:
        with conn.cursor() as cur:
            # Check ai_core.docs
            print("=" * 60)
            print("Checking ai_core.docs table:")
            print("=" * 60)
            cur.execute("SELECT COUNT(*) FROM ai_core.docs WHERE kind = 'product'")
            docs_count = cur.fetchone()[0]
            print(f"Products in ai_core.docs: {docs_count}")
            
            if docs_count > 0:
                cur.execute("SELECT DISTINCT meta->>'colorName' FROM ai_core.docs WHERE kind = 'product' AND meta->>'colorName' IS NOT NULL LIMIT 10")
                docs_colors = [row[0] for row in cur.fetchall()]
                print(f"Sample colors from ai_core.docs: {docs_colors}")
            
            # Check ai_products
            print("\n" + "=" * 60)
            print("Checking ai_products table:")
            print("=" * 60)
            cur.execute("SELECT COUNT(*) FROM ai_products")
            ai_products_count = cur.fetchone()[0]
            print(f"Products in ai_products: {ai_products_count}")
            
            if ai_products_count > 0:
                cur.execute("SELECT DISTINCT metadata->>'color' FROM ai_products WHERE metadata->>'color' IS NOT NULL LIMIT 10")
                ai_products_colors = [row[0] for row in cur.fetchall()]
                print(f"Sample colors from ai_products: {ai_products_colors}")
                
                # Check structure
                cur.execute("SELECT id, type, metadata FROM ai_products LIMIT 1")
                sample = cur.fetchone()
                print(f"\nSample row from ai_products:")
                print(f"  ID: {sample[0]}")
                print(f"  Type: {sample[1]}")
                print(f"  Metadata keys: {list(sample[2].keys()) if sample[2] else 'None'}")
    finally:
        conn.close()

if __name__ == "__main__":
    check_tables()
