"""
UserMemory Service - Week 2 Day 2
RAG-based semantic memory for user preferences

Stores user statements as vector embeddings and recalls them semantically:
- User: "I hate hoodies" → Stored as embedding
- Later: Building casual outfit → Recalls "I hate hoodies" → Filters out hoodies
"""

import asyncpg
import openai
from typing import List, Dict, Optional
import logging
import os

log = logging.getLogger(__name__)


class UserMemoryService:
    """
    Store and retrieve user memories using RAG (Retrieval-Augmented Generation).
    
    Uses:
    - OpenAI embeddings for semantic understanding
    - pgvector for similarity search
    - Confidence scoring for relevance
    """
    
    def __init__(self):
        self.db_url = os.getenv("DATABASE_URL") or os.getenv("PG_DSN")
        # Support both OpenRouter (openrouter:model) and direct providers (openai/model)
        self.embedding_model = os.getenv("EMBED_MODEL", "openrouter:openai/text-embedding-3-small")
        self.pool: Optional[asyncpg.Pool] = None
    
    async def initialize(self):
        """Initialize database connection pool"""
        if not self.pool:
            self.pool = await asyncpg.create_pool(self.db_url, min_size=2, max_size=10)
            log.info("UserMemoryService initialized")
    
    async def close(self):
        """Close database connections"""
        if self.pool:
            await self.pool.close()
    
    async def store_memory(
        self,
        user_id: str,
        content: str,
        memory_type: str = "preference",
        confidence: float = 1.0
    ) -> int:
        """
        Store a user statement as a semantic memory.
        
        Args:
            user_id: Clerk user ID or guest session ID
            content: The statement to remember ("I hate hoodies")
            memory_type: Type of memory (preference, dislike, style, etc.)
            confidence: Confidence score 0-1
        
        Returns:
            memory_id: ID of the stored memory
        
        Example:
            >>> await memory_service.store_memory(
            ...     user_id="user_123",
            ...     content="I prefer slim fit clothing",
            ...     memory_type="preference"
            ... )
        """
        try:
            # Generate embedding - support both OpenRouter and direct providers
            if self.embedding_model.startswith("openrouter:"):
                # Direct HTTP call to OpenRouter (LiteLLM doesn't support embeddings via OpenRouter)
                import httpx
                
                model_name = self.embedding_model.replace("openrouter:", "")
                openrouter_key = os.getenv("OPENROUTER_API_KEY")
                
                async with httpx.AsyncClient() as client:
                    response = await client.post(
                        "https://openrouter.ai/api/v1/embeddings",
                        headers={
                            "Authorization": f"Bearer {openrouter_key}",
                            "Content-Type": "application/json"
                        },
                        json={
                            "model": model_name,
                            "input": content
                        },
                        timeout=30.0
                    )
                    response.raise_for_status()
                    data = response.json()
                    embedding = data['data'][0]['embedding']
            else:
                # Use LiteLLM for direct providers (openai/, cohere/, etc.)
                import litellm
                response = await litellm.aembedding(
                    model=self.embedding_model,
                    input=[content]
                )
                embedding = response.data[0]['embedding']
            
            # Store in database (convert list to pgvector format)
            embedding_str = str(embedding)  # pgvector wants '[0.1, 0.2, ...]' string format
            
            async with self.pool.acquire() as conn:
                memory_id = await conn.fetchval(
                    """
                    INSERT INTO user_memories 
                        (user_id, content, embedding, memory_type, confidence)
                    VALUES ($1, $2, $3::vector, $4, $5)
                    RETURNING id
                    """,
                    user_id,
                    content,
                   embedding_str,
                    memory_type,
                    confidence
                )
            
            log.info(f"Stored memory {memory_id} for user {user_id}: {content[:50]}...")
            return memory_id
            
        except Exception as e:
            log.error(f"Failed to store memory: {e}")
            raise
    
    async def recall_memories(
        self,
        user_id: str,
        query: str,
        top_k: int = 5,
        min_confidence: float = 0.6  # Tuned for "The Picky Client"
    ) -> List[Dict]:
        """
        Recall relevant memories using semantic search.
        
        Args:
            user_id: User to recall for
            query: Current context ("building casual outfit")
            top_k: Number of memories to recall
            min_confidence: Minimum similarity score
        
        Returns:
            List of memories with similarity scores
        
        Example:
            >>> memories = await memory_service.recall_memories(
            ...     user_id="user_123",
            ...     query="building casual outfit for weekend"
            ... )
            >>> # Returns: [{"content": "I hate hoodies", "similarity": 0.85, ...}]
        """
        try:
            # Generate query embedding - support both OpenRouter and direct providers
            if self.embedding_model.startswith("openrouter:"):
                # Direct HTTP call to OpenRouter
                import httpx
                
                model_name = self.embedding_model.replace("openrouter:", "")
                openrouter_key = os.getenv("OPENROUTER_API_KEY")
                
                async with httpx.AsyncClient() as client:
                    response = await client.post(
                        "https://openrouter.ai/api/v1/embeddings",
                        headers={
                            "Authorization": f"Bearer {openrouter_key}",
                            "Content-Type": "application/json"
                        },
                        json={
                            "model": model_name,
                            "input": query
                        },
                        timeout=30.0
                    )
                    response.raise_for_status()
                    data = response.json()
                    query_embedding = data['data'][0]['embedding']
            else:
                # Use LiteLLM for direct providers
                import litellm
                response = await litellm.aembedding(
                    model=self.embedding_model,
                    input=[query]
                )
                query_embedding = response.data[0]['embedding']
            
            # Semantic search with pgvector (convert to string format)
            query_embedding_str = str(query_embedding)
            
            async with self.pool.acquire() as conn:
                rows = await conn.fetch(
                    """
                    SELECT 
                        id,
                        content,
                        memory_type,
                        confidence,
                        created_at,
                        1 - (embedding <=> $1::vector) as similarity
                    FROM user_memories
                    WHERE user_id = $2
                    ORDER BY embedding <=> $1::vector
                    LIMIT $3
                    """,
                    query_embedding_str,
                    user_id,
                    top_k
                )
            
            # Filter by confidence and format
            memories = []
            for row in rows:
                similarity = float(row['similarity'])
                if similarity >= min_confidence:
                    memories.append({
                        'id': row['id'],
                        'content': row['content'],
                        'type': row['memory_type'],
                        'confidence': row['confidence'],
                        'similarity': similarity,
                        'created_at': row['created_at']
                    })
            
            log.info(f"Recalled {len(memories)}/{len(rows)} memories for user {user_id}")
            return memories
            
        except Exception as e:
            log.error(f"Failed to recall memories: {e}")
            return []
    
    async def get_user_preferences(self, user_id: str) -> Dict:
        """
        Get all preferences for a user (convenience method).
        
        Returns dislikes, style preferences, colors, etc.
        """
        try:
            async with self.pool.acquire() as conn:
                rows = await conn.fetch(
                    """
                    SELECT content, memory_type, confidence
                    FROM user_memories
                    WHERE user_id = $1
                    ORDER BY created_at DESC
                    """,
                    user_id
                )
            
            # Organize by type
            preferences = {
                'dislikes': [],
                'likes': [],
                'styles': [],
                'colors': [],
                'other': []
            }
            
            for row in rows:
                content = row['content']
                memory_type = row['memory_type']
                
                if 'hate' in content.lower() or 'dislike' in content.lower():
                    preferences['dislikes'].append(content)
                elif 'love' in content.lower() or 'prefer' in content.lower():
                    preferences['likes'].append(content)
                elif memory_type == 'style':
                    preferences['styles'].append(content)
                elif memory_type == 'color':
                    preferences['colors'].append(content)
                else:
                    preferences['other'].append(content)
            
            return preferences
            
        except Exception as e:
            log.error(f"Failed to get preferences: {e}")
            return {'dislikes': [], 'likes': [], 'styles': [], 'colors': [], 'other': []}


# Global instance
_memory_service = None

async def get_memory_service() -> UserMemoryService:
    """Get or create global memory service instance"""
    global _memory_service
    if _memory_service is None:
        _memory_service = UserMemoryService()
        await _memory_service.initialize()
    return _memory_service
