import asyncio
import os
import asyncpg
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL") or os.getenv("PG_DSN")

async def count():
    if not DATABASE_URL:
        print("DATABASE_URL not set")
        return
        
    try:
        conn = await asyncpg.connect(DATABASE_URL)
        # Check if table exists
        try:
            count = await conn.fetchval("SELECT COUNT(*) FROM ai_products")
            print(f"ai_products count: {count}")
        except Exception as e:
            # Fallback to ai_core.docs if schema changed
            try:
                count = await conn.fetchval("SELECT COUNT(*) FROM ai_core.docs WHERE kind = 'product'")
                print(f"ai_core.docs (products) count: {count}")
            except Exception as e2:
                print(f"Error querying tables: {e}, {e2}")
        
        await conn.close()
    except Exception as e:
        print(f"Connection error: {e}")

if __name__ == "__main__":
    asyncio.run(count())
