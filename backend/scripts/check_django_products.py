
import os
import psycopg
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '../.env'))

DB_URL = os.getenv("DATABASE_URL")

def check_django_products():
    if not DB_URL:
        print("❌ DATABASE_URL not found")
        return

    try:
        with psycopg.connect(DB_URL) as conn:
            with conn.cursor() as cur:
                # Check tables first
                cur.execute("""
                    SELECT count(*) FROM information_schema.tables 
                    WHERE table_name = 'ai_products'
                """)
                if cur.fetchone()[0] == 0:
                    print("⚠️  'ai_products' table does not exist.")
                    return

                # Check for brands in ai_products
                print("🔍 Checking 'ai_products' for new brands...")
                brands = ["Aura Minimalist", "Vortex Streetwear"]
                
                # Check columns
                cur.execute("""
                    SELECT column_name FROM information_schema.columns 
                    WHERE table_name = 'ai_products'
                """)
                cols = [r[0] for r in cur.fetchall()]
                # print(f"   Columns: {cols}")
                
                has_brand = 'brand' in cols
                
                for brand in brands:
                    if has_brand:
                        cur.execute("SELECT count(*) FROM ai_products WHERE brand = %s AND embedding IS NOT NULL", (brand,))
                    else:
                        cur.execute("SELECT count(*) FROM ai_products WHERE title ILIKE %s AND embedding IS NOT NULL", (f"%{brand}%",))
                        
                    count = cur.fetchone()[0]
                    print(f"   - {brand}: {count} items with embeddings")

    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    check_django_products()
