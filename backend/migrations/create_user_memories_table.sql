"""
SQL migration to create user_memories table with pgvector.
Week 2: User Preference Learning - RAG-based semantic memory

This table stores user statements as vector embeddings for semantic recall:
- "I hate hoodies" → stored as vector
- Later query: "build casual outfit" → recalls the hoodie preference
- Uses pgvector for similarity search
"""

CREATE TABLE IF NOT EXISTS ai_core.user_memories (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    embedding vector(1536),  -- OpenAI embedding dimension
    memory_type VARCHAR(50) DEFAULT 'preference',
    confidence FLOAT DEFAULT 1.0,
    created_at TIMESTAMP DEFAULT NOW(),
    
    -- Indexes for fast lookup
    CONSTRAINT user_memories_user_id_idx 
        FOREIGN KEY (user_id) REFERENCES user_profiles(user_id) ON DELETE CASCADE
);

-- Index for user lookup
CREATE INDEX IF NOT EXISTS idx_user_memories_user_id 
    ON ai_core.user_memories(user_id);

-- Index for memory type filtering
CREATE INDEX IF NOT EXISTS idx_user_memories_type 
    ON ai_core.user_memories(memory_type);

-- Vector similarity search index (IVFFlat for faster similarity search)
-- Note: Requires pgvector extension to be enabled
CREATE INDEX IF NOT EXISTS idx_user_memories_embedding 
    ON ai_core.user_memories 
    USING ivfflat (embedding vector_cosine_ops)
    WITH (lists = 100);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON ai_core.user_memories TO cove_app;
GRANT USAGE, SELECT ON SEQUENCE ai_core.user_memories_id_seq TO cove_app;

-- Verify table
SELECT 
    'user_memories table created' as status,
    COUNT(*) as row_count 
FROM ai_core.user_memories;
