
import os
import psycopg
import re
from dotenv import load_dotenv

# Load env vars
load_dotenv(os.path.join(os.path.dirname(__file__), '../.env'))

DB_URL = os.getenv("PG_DSN")
if not DB_URL:
    print("❌ PG_DSN not found")
    exit(1)

ASSETS_DIR = os.path.join(os.path.dirname(__file__), '../static/generated_assets')
# Assume backend is running on 8000 locally
BASE_URL = "http://localhost:8000/static/generated_assets"

def link_images():
    if not os.path.exists(ASSETS_DIR):
        print(f"❌ Assets dir not found: {ASSETS_DIR}")
        return

    print(f"📂 Scanning assets in {ASSETS_DIR}...")
    files = os.listdir(ASSETS_DIR)
    
    updates = 0
    
    try:
        with psycopg.connect(DB_URL) as conn:
            with conn.cursor() as cur:
                for f in files:
                    if not f.endswith('.jpg') and not f.endswith('.png'):
                        continue
                        
                    # Filename format: UUID_Professional..._of_PRODUCT_NAME__Style...
                    # or just UUID_PRODUCT_NAME__Style...
                    
                    # Try to regex extract the product name
                    # Look for "_of_(.*?)__Style"
                    match = re.search(r'_of_(.*?)__Style', f)
                    title_fragment = None
                    if match:
                        title_fragment = match.group(1).replace('_', ' ')
                    else:
                        # Fallback: try to match known brand names in filename
                        clean_name = f.replace('_', ' ')
                        if "Aura Minimalist" in clean_name:
                            # Extract words around it?
                            # Let's just try to match fuzzy
                            pass
                    
                    if not title_fragment:
                        continue
                        
                    # Clean up title fragment (sometimes has extra words)
                    # The filename has underscores for spaces
                    
                    # Fuzzy match in DB handling hyphens via %
                    pattern = title_fragment.replace(' ', '%')
                    
                    img_url = f"{BASE_URL}/{f}"
                    
                    cur.execute("""
                        UPDATE ai_core.docs 
                        SET meta = jsonb_set(meta, '{image_url}', to_jsonb(%s::text))
                        WHERE title ILIKE %s
                          AND meta->>'brand' IS NOT NULL
                    """, (img_url, pattern))
                    
                    if cur.rowcount > 0:
                        print(f"   ✅ Linked: '{title_fragment}' -> {cur.rowcount} rows")
                        updates += cur.rowcount
                    # else:
                    #     print(f"   ⚠️  No match for: '{title_fragment}'")

                print(f"\n🎉 Total updates: {updates}")
                conn.commit()
                
    except Exception as e:
        print(f"❌ DB Error: {e}")

if __name__ == "__main__":
    link_images()
