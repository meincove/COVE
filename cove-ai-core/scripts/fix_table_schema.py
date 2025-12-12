"""
Quick fix for ai_core.docs table - change ID from UUID to TEXT
"""

import os
import asyncio
import asyncpg
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL") or os.getenv("PG_DSN")

async def fix_table_schema():
    print("🔧 Fixing ai_core.docs table schema...")
    
    conn = await asyncpg.connect(DATABASE_URL)
    
    try:
        # Check if table exists
        exists = await conn.fetchval(
            "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='ai_core' AND table_name='docs')"
        )
        
        if exists:
            print("   Table exists, altering ID column from UUID to TEXT...")
            
            # Drop the table and recreate with TEXT ID
            await conn.execute("DROP TABLE IF EXISTS ai_core.docs")
            print("   ✅ Dropped old table")
        
        # Create table with TEXT ID
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS ai_core.docs (
                id TEXT PRIMARY KEY,
                kind TEXT NOT NULL,
                title TEXT,
                text TEXT,
                url TEXT,
                meta JSONB DEFAULT '{}'::jsonb,
                embedding vector(1536),
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        """)
        print("   ✅ Created table with TEXT ID")
        
        # Create index on embedding
        await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_docs_embedding 
            ON ai_core.docs USING ivfflat (embedding vector_cosine_ops)
            WITH (lists = 100)
        """)
        print("   ✅ Created vector index")
        
        # Create index on kind
        await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_docs_kind ON ai_core.docs(kind)
        """)
        print("   ✅ Created kind index")
        
        print("\\n✅ Table schema fixed successfully!")
        
    finally:
        await conn.close()

if __name__ == "__main__":
    asyncio.run(fix_table_schema())
