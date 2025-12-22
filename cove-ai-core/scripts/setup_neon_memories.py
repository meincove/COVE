#!/usr/bin/env python3
"""
Setup Neon database for User Memories (Week 2)
Enables pgvector extension and creates user_memories table
"""

import asyncpg
import asyncio
import os
from dotenv import load_dotenv

load_dotenv()

async def setup_neon_database():
    """Setup pgvector and create user_memories table"""
    
    database_url = os.getenv("DATABASE_URL") or os.getenv("PG_DSN")
    
    if not database_url:
        print("❌ DATABASE_URL not found in environment")
        return False
    
    try:
        print("🔌 Connecting to Neon database...")
        conn = await asyncpg.connect(database_url)
        
        # 1. Enable pgvector extension
        print("📦 Enabling pgvector extension...")
        await conn.execute("CREATE EXTENSION IF NOT EXISTS vector")
        print("✅ pgvector extension enabled")
        
        # 2. Create user_memories table
        print("📊 Creating user_memories table...")
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS user_memories (
                id SERIAL PRIMARY KEY,
                user_id VARCHAR(255) NOT NULL,
                content TEXT NOT NULL,
                embedding vector(1536),
                memory_type VARCHAR(50) DEFAULT 'preference',
                confidence FLOAT DEFAULT 1.0,
                created_at TIMESTAMP DEFAULT NOW()
            )
        """)
        print("✅ user_memories table created")
        
        # 3. Create indexes
        print("🔍 Creating indexes...")
        
        # User ID index
        await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_user_memories_user_id 
            ON user_memories(user_id)
        """)
        
        # Memory type index
        await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_user_memories_type 
            ON user_memories(memory_type)
        """)
        
        # Vector similarity index (IVFFlat for speed)
        await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_user_memories_embedding 
            ON user_memories 
            USING ivfflat (embedding vector_cosine_ops)
            WITH (lists = 100)
        """)
        
        print("✅ All indexes created")
        
        # 4. Verify setup
        count = await conn.fetchval("SELECT COUNT(*) FROM user_memories")
        print(f"📈 user_memories table ready (current rows: {count})")
        
        await conn.close()
        print("\n✅ Neon database setup complete!")
        return True
        
    except Exception as e:
        print(f"\n❌ Setup failed: {e}")
        return False


if __name__ == "__main__":
    success = asyncio.run(setup_neon_database())
    exit(0 if success else 1)
