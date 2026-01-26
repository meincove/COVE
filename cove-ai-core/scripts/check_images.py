import sys
import os
import json

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.vector.store import get_conn_sync

def check_images():
    print("Sampling product images...")
    conn = get_conn_sync()
    with conn as c:
        with c.cursor() as cur:
            cur.execute("SELECT title, meta FROM ai_core.docs WHERE kind='product' LIMIT 5")
            rows = cur.fetchall()
            
            for r in rows:
                meta = r[1]
                print(f"Title: {r[0]}")
                print(f"Image 1: {meta.get('imageUrl')}")
                print(f"Image 2: {meta.get('image_url')}")
                print(f"Image 3: {meta.get('image')}")
                print("-" * 20)

if __name__ == "__main__":
    check_images()
