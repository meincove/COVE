
import sys
import os
import logging

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.vector.store import get_conn_sync, catalog_vocab

logging.basicConfig(level=logging.INFO)

def check_vocab():
    try:
        with get_conn_sync() as conn:
            vocab = catalog_vocab(conn, ttl_sec=0) # Force refresh
            brands = vocab.get("brands", set())
            print(f"Brands Found: {len(brands)}")
            print(f"Brands: {sorted(list(brands))}")
            
            if "vortex streetwear" in brands or "vortex" in brands:
                print("✅ Vortex found in vocab!")
            else:
                print("❌ Vortex NOT found in vocab!")
                        
    except Exception as e:
        print(f"❌ Vocab Check Failed: {e}")

if __name__ == "__main__":
    check_vocab()
