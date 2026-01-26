
from app.vector.store import get_conn_sync
import json

def find_vortex():
    print("--- 🔍 Searching for REAL Vortex Streetwear Item ---")
    try:
        with get_conn_sync() as conn:
            with conn.cursor() as cur:
                # Use strict JSON operator for brand
                cur.execute("SELECT title, meta FROM ai_core.docs WHERE meta->>'brand' = 'Vortex Streetwear' LIMIT 1")
                row = cur.fetchone()
                if row:
                    print(f"✅ Found Item: {row[0]}")
                    print(f"Meta: {json.dumps(row[1], default=str)[:200]}...")
                else:
                    print("❌ No item found with strict brand 'Vortex Streetwear'")
                    
                # Check fuzzy
                cur.execute("SELECT title, meta->>'brand' FROM ai_core.docs WHERE meta->>'brand' ILIKE '%Vortex%' LIMIT 1")
                row = cur.fetchone()
                if row:
                    print(f"✅ Found Fuzzy Item: {row[0]} (Brand: {row[1]})")

    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    find_vortex()
