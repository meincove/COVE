"""
Setup pgvector on Neon database.
Runs setup_pgvector.sql on production Neon DB.
"""

import os
import sys
import asyncio
from pathlib import Path

import asyncpg
from dotenv import load_dotenv

# Load environment
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL") or os.getenv("PG_DSN")

if not DATABASE_URL:
    print("❌ DATABASE_URL or PG_DSN not set in .env")
    sys.exit(1)


async def setup_pgvector():
    """Run pgvector setup on Neon database"""
    
    print("\n" + "="*60)
    print("🔧 Setting up pgvector on Neon Database")
    print("="*60 + "\n")
    
    # Read SQL file
    sql_path = Path(__file__).parent / "setup_pgvector.sql"
    with open(sql_path) as f:
        sql = f.read()
    
    print(f"📄 Loaded SQL from {sql_path.name}")
    
    # Connect to Neon
    print(f"🔌 Connecting to Neon...")
    conn = await asyncpg.connect(DATABASE_URL)
    
    try:
        # Check if pgvector is already installed
        result = await conn.fetchval(
            "SELECT extname FROM pg_extension WHERE extname = 'vector'"
        )
        
        if result:
            print("✅ pgvector extension already installed")
        else:
            print("📦 Installing pgvector extension...")
        
        # Execute setup SQL
        print("\n🚀 Running setup SQL...")
        await conn.execute(sql)
        
        # Verify tables
        table_exists = await conn.fetchval(
            "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'ai_products')"
        )
        
        if table_exists:
            print("✅ ai_products table created")
            
            # Check indexes
            indexes = await conn.fetch(
                """
                SELECT indexname FROM pg_indexes 
                WHERE tablename = 'ai_products'
                """
            )
            
            print(f"✅ Created {len(indexes)} indexes:")
            for idx in indexes:
                print(f"   - {idx['indexname']}")
        
        print("\n🎉 pgvector setup complete on Neon!")
        print("\n" + "="*60)
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(setup_pgvector())
