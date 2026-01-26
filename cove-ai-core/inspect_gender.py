
import asyncio
import os
import sys

# Setup paths
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.vector.store import get_conn

def check_product_genders():
    titles = [
        "Tailored Black Wool Blazer",
        "Classic Tan Leather Loafers",
        "Pleated Black Trousers"
    ]
    
    with get_conn() as conn:
        with conn.cursor() as cur:
            for title in titles:
                cur.execute(
                    """
                    SELECT title, meta->>'gender' as gender, meta->>'type' as type
                    FROM ai_core.docs
                    WHERE kind = 'product' AND title = %s
                    LIMIT 1
                    """,
                    (title,)
                )
                row = cur.fetchone()
                if row:
                    print(f"✅ Product: '{row[0]}'")
                    print(f"   Gender: {row[1]}")
                    print(f"   Type:   {row[2]}")
                else:
                    print(f"❌ Product not found: '{title}'")

if __name__ == "__main__":
    check_product_genders()
