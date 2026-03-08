from app.vector.store import connect

def fix_shoe_gender():
    conn = connect()
    with conn.cursor() as cur:
        # 1. Fix HEELS/PUMPS -> WOMEN
        # 1. Fix HEELS/PUMPS -> WOMEN
        print("👠 Updating Heels & Pumps to 'women'...")
        # FORCE UPDATE SPECIFIC SLUGS
        slugs = [
             "solemates-elegant-nude-pumps",
             "solemates-elegant-red-pumps", # Guessing this exists too
             "shoe-metallic-silver-heels" # Already done but ensuring
        ]
        cur.execute("""
            UPDATE ai_core.docs 
            SET meta = jsonb_set(meta, '{gender}', '"women"') 
            WHERE kind = 'product' 
              AND meta->>'slug' = ANY(%s)
        """, (slugs,))
        print(f"   Updated {cur.rowcount} rows.")

        # 2. Fix BOOTS (untagged) -> MEN (or Unisex)
        print("🥾 Updating Untagged Boots to 'unisex'...")
        cur.execute("""
            UPDATE ai_core.docs 
            SET meta = jsonb_set(meta, '{gender}', '"unisex"') 
            WHERE kind = 'product' 
              AND meta->>'slug' = 'solemates-chelsea-boots-in-chocolate-suede'
        """)
        print(f"   Updated {cur.rowcount} rows.")
        print("🥾 Updating Untagged Boots to 'unisex'...")
        cur.execute("""
            UPDATE ai_core.docs 
            SET meta = jsonb_set(meta, '{gender}', '"unisex"') 
            WHERE kind = 'product' 
              AND meta->>'slug' = 'solemates-chelsea-boots-in-chocolate-suede'
        """)
        print(f"   Updated {cur.rowcount} rows.")
        
    print("✅ Data Fix Complete")

if __name__ == "__main__":
    fix_shoe_gender()
