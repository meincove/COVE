
import os
import psycopg
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '../.env'))

DB_URL = os.getenv("PG_DSN")

def get_text_content():
    if not DB_URL: return
    try:
        with psycopg.connect(DB_URL) as conn:
            with conn.cursor() as cur:
                # Get text of one Aura item
                cur.execute("""
                    SELECT title, text, meta 
                    FROM ai_core.docs 
                    WHERE meta->>'brand' = 'Aura Minimalist' 
                    LIMIT 1
                """)
                row = cur.fetchone()
                if row:
                    print(f"Title: {row[0]}")
                    print(f"Text (Embedded Content): {row[1]}")
                    print(f"Meta: {row[2]}")
                    
                    if "Aura Minimalist" in row[1]:
                        print("✅ Brand name is in the text.")
                    else:
                        print("❌ Brand name is MISSING from the text.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    get_text_content()
