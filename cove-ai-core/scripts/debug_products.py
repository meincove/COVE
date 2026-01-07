import asyncio
import os
import sys
from dotenv import load_dotenv

# Add parent dir to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.vector.store import connect

async def check_product_images():
    conn = connect()
    cur = conn.cursor()
    
    target_names = [
        "SimpleStack Tee", 
        "Classic Tan Leather Loafers",
        "Evening Silk Gown"
    ]
    
    print("\n🔍 --- Checking Specific Products in ai_core.docs ---")
    
    for name in target_names:
        print(f"\nSearching for '{name}':")
        # Use simple ILIKE on title
        cur.execute("""
            SELECT id, title, meta->>'price', meta->>'outfit_category', meta->>'type', meta->>'gender', meta->>'image'
            FROM ai_core.docs
            WHERE kind = 'product' AND title ILIKE %s
            LIMIT 5
        """, (f"%{name}%",))
        
        rows = cur.fetchall()
        if not rows:
            print("  No results found.")
        for row in rows:
            print(f"  ID: {row[0]}")
            print(f"  Title: {row[1]}")
            print(f"  Price (meta): {row[2]} (Type: {type(row[2])})")
            print(f"  Category: {row[3]}")
            print(f"  Type: {row[4]}")
            print(f"  Gender: {row[5]}")
            print(f"  Image: {row[6]}")
            # Check if price is convertible to float
            try:
                p = float(row[2]) if row[2] else 0.0
                print(f"  Parsed Price: {p}")
            except:
                print(f"  Failed to parse price: {row[2]}")

    print("\n📊 --- Category Counts ---")
    cur.execute("""
        SELECT meta->>'outfit_category', count(*)
        FROM ai_core.docs
        WHERE kind = 'product'
        GROUP BY 1
        ORDER BY 2 DESC
    """)
    for cat, count in cur.fetchall():
        print(f"  {cat}: {count}")

    print("\n📊 --- Distinct Types in 'tops' ---")
    cur.execute("""
        SELECT meta->>'type', count(*)
        FROM ai_core.docs
        WHERE kind = 'product' AND meta->>'outfit_category' = 'tops'
        GROUP BY 1
        ORDER BY 2 DESC
        LIMIT 10
    """)
    for t, count in cur.fetchall():
        print(f"  {t}: {count}")

    conn.close()

if __name__ == "__main__":
    load_dotenv()
    asyncio.run(check_product_images())
