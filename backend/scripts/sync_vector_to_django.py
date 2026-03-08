
import os
import psycopg
import uuid
import json
from datetime import datetime
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '../.env'))

DB_URL = os.getenv("DATABASE_URL")

def sync_products():
    if not DB_URL:
        print("❌ DATABASE_URL not found")
        return

    try:
        with psycopg.connect(DB_URL) as conn:
            with conn.cursor() as cur:
                print("🔄 Syncing Premium Brands from Vector Store to Django...\n")
                
                # 1. Fetch from Vector Store
                brands = ["Aura Minimalist", "Vortex Streetwear"]
                
                # We fetch all fields needed for ai_products, INCLUDING EMBEDDING
                cur.execute("""
                    SELECT 
                        id, 
                        title, 
                        text as description, 
                        meta->>'slug' as slug,
                        meta->>'type' as type,
                        (meta->>'price')::numeric as price,
                        meta,
                        embedding::text
                    FROM ai_core.docs 
                    WHERE meta->>'brand' = ANY(%s)
                """, (brands,))
                
                rows = cur.fetchall()
                print(f"   Found {len(rows)} items in Vector Store.")
                
                inserted = 0
                updated = 0
                
                for row in rows:
                    vec_id, title, desc, slug, p_type, price, meta, embedding_str = row
                    
                    if not slug:
                        slug = title.lower().replace(' ', '-')
                    
                    # Ensure uniqueness by appending short ID if needed
                    # Or just always append it for these generated items
                    # vec_id is often a UUID or INT.
                    slug_suffix = str(vec_id)[-6:] if vec_id else str(uuid.uuid4())[:6]
                    unique_slug = f"{slug}-{slug_suffix}"
                    
                    # Use provided vector ID if it's a UUID, otherwise gen new one
                    new_id = str(uuid.uuid4())
                    if vec_id and len(str(vec_id)) == 36:
                         new_id = vec_id
                         
                    cur.execute("""
                        INSERT INTO ai_products (
                            id, slug, title, description, type, 
                            price, currency, in_stock, metadata, 
                            embedding,
                            created_at, updated_at
                        ) VALUES (
                            %s, %s, %s, %s, %s, 
                            %s, 'EUR', true, %s,
                            %s::vector,
                            NOW(), NOW()
                        )
                        ON CONFLICT (id) DO UPDATE SET
                            slug = EXCLUDED.slug,
                            title = EXCLUDED.title,
                            description = EXCLUDED.description,
                            type = EXCLUDED.type, 
                            price = EXCLUDED.price,
                            currency = EXCLUDED.currency,
                            in_stock = EXCLUDED.in_stock,
                            metadata = EXCLUDED.metadata,
                            embedding = EXCLUDED.embedding,
                            updated_at = NOW()
                    """, (
                        new_id, unique_slug, title, desc, p_type,
                        price, json.dumps(meta), embedding_str
                    ))
                    
                    if cur.statusmessage.startswith("INSERT"):
                         inserted += 1
                    else:
                         updated += 1
                
                conn.commit()
                print(f"\n✅ Sync Complete:")
                print(f"   - Inserted/Updated: {inserted + updated}")

    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    sync_products()
