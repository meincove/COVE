from app.vector.store import connect

def inspect_categories():
    conn = connect()
    with conn.cursor() as cur:
        # Check Blazers
        print("\n🕵️‍♀️ INSPECTING BLAZERS:")
        cur.execute("""
            SELECT meta->>'outfit_category', meta->>'type', count(*)
            FROM ai_core.docs 
            WHERE kind = 'product' 
              AND (meta->>'title' ILIKE '%blazer%' OR meta->>'type' ILIKE '%blazer%')
            GROUP BY 1, 2
        """)
        for row in cur.fetchall():
            print(f"   Cat: {row[0]}, Type: {row[1]} -> Count: {row[2]}")

        # Check Accessories
        print("\n🕵️‍♀️ INSPECTING ACCESSORIES:")
        cur.execute("""
            SELECT meta->>'outfit_category', meta->>'type', count(*)
            FROM ai_core.docs 
            WHERE kind = 'product' 
              AND meta->>'outfit_category' = 'accessories'
            GROUP BY 1, 2
        """)
        results = cur.fetchall()
        if not results:
             print("   (No explicit 'accessories' category found)")
             
        # Check what categories DO exist
        print("\n📊 ALL OUTFIT CATEGORIES:")
        cur.execute("""
            SELECT meta->>'outfit_category', count(*)
            FROM ai_core.docs 
            WHERE kind = 'product'
            GROUP BY 1
        """)
        for row in cur.fetchall():
            print(f"   {row[0]}: {row[1]}")

        # Check 'other' for accessories
        print("\n🕵️‍♀️ INSPECTING 'other' CATEGORY:")
        cur.execute("""
            SELECT meta->>'type', count(*)
            FROM ai_core.docs 
            WHERE kind = 'product' 
              AND meta->>'outfit_category' = 'other'
            GROUP BY 1
        """)
        for row in cur.fetchall():
            print(f"   Type: {row[0]} -> Count: {row[1]}")

if __name__ == "__main__":
    inspect_categories()
