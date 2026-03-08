
import sys
import os
import logging

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.vector.store import get_conn_sync

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("verify_vortex")

def check_brand():
    try:
        with get_conn_sync() as conn:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT count(*), meta->>'brand' 
                    FROM ai_core.docs 
                    WHERE kind = 'product' 
                    AND (meta->>'brand' ILIKE '%Vortex%' OR meta->>'brand' ILIKE '%Streetwear%')
                    GROUP BY meta->>'brand'
                """)
                rows = cur.fetchall()
                
                if not rows:
                    log.warning("❌ No products found for 'Vortex' or 'Streetwear'")
                else:
                    for count, brand in rows:
                        log.info(f"✅ Found {count} items for brand: {brand}")
                        
    except Exception as e:
        log.error(f"❌ DB Check Failed: {e}")

if __name__ == "__main__":
    check_brand()
