"""
Upload to Cloud - Moves locally generated assets to production storage.

Supports Cloudinary (Free tier friendly) or S3.
"""

import os
import sys
import logging
import json
from typing import List, Dict, Any

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from app.vector.store import get_conn_sync

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("cloud_upload")

def upload_to_cloudinary(local_path: str) -> str:
    """Upload to Cloudinary and return secure URL."""
    try:
        import cloudinary
        import cloudinary.uploader
        
        # Configure via environment variable: CLOUDINARY_URL
        # e.g. CLOUDINARY_URL=cloudinary://API_KEY:API_SECRET@CLOUD_NAME
        
        response = cloudinary.uploader.upload(local_path, folder="cove_assets")
        return response["secure_url"]
    except ImportError:
        log.error("❌ 'cloudinary' package not installed. run: pip install cloudinary")
        return None
    except Exception as e:
        log.error(f"❌ Cloudinary upload failed: {e}")
        return None

def run_sync():
    """Find all local assets and upload them."""
    query = "SELECT id, meta FROM ai_core.docs WHERE meta->>'imageUrl' LIKE '/static/%'"
    
    with get_conn_sync() as conn:
        with conn.cursor() as cur:
            cur.execute(query)
            rows = cur.fetchall()
            
            log.info(f"🚀 Found {len(rows)} local assets to sync to cloud...")
            
            for doc_id, meta in rows:
                local_url = meta.get("imageUrl")
                # /static/assets/foo.jpg -> ./static/assets/foo.jpg
                local_path = os.path.join(os.path.dirname(__file__), "..", local_url.lstrip("/"))
                
                if not os.path.exists(local_path):
                    log.warning(f"⚠️ File not found: {local_path}")
                    continue
                
                log.info(f"☁️ Uploading {local_path}...")
                # Default to Cloudinary for now as it's the easiest free option
                cloud_url = upload_to_cloudinary(local_path)
                
                if cloud_url:
                    # Update DB (Sync both imageUrl and image_url keys for robustness)
                    cur.execute(
                        """
                        UPDATE ai_core.docs 
                        SET meta = jsonb_set(
                            jsonb_set(meta, '{imageUrl}', %s::jsonb),
                            '{image_url}', %s::jsonb
                        )
                        WHERE id = %s
                        """,
                        (f'"{cloud_url}"', f'"{cloud_url}"', doc_id)
                    )
                    conn.commit()
                    log.info(f"✅ Synced {doc_id} -> {cloud_url}")
                else:
                    log.warning(f"⏭️ Skipping {doc_id} due to upload failure")

if __name__ == "__main__":
    if not os.getenv("CLOUDINARY_URL"):
        print("❌ Error: CLOUDINARY_URL environment variable not set.")
        print("Get a free account at https://cloudinary.com and set the URL.")
        sys.exit(1)
        
    run_sync()
