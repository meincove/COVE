"""
pgvector Database Integration for Hybrid Search.
Implements actual vector and keyword search against PostgreSQL.
"""

import os
from typing import List, Dict, Any, Optional
import asyncio
import logging

import asyncpg
from pgvector.asyncpg import register_vector

log = logging.getLogger("cove.vector_db")

# Database connection
DATABASE_URL = os.getenv("DATABASE_URL") or os.getenv("PG_DSN")

if not DATABASE_URL:
    log.warning("DATABASE_URL not set - vector search will use mock data")


class VectorDatabase:
    """
    PostgreSQL + pgvector database integration.
    Handles vector similarity search and keyword search.
    """
    
    def __init__(self, database_url: Optional[str] = None):
        self.database_url = database_url or DATABASE_URL
        self.pool: Optional[asyncpg.Pool] = None
    
    async def connect(self):
        """Initialize connection pool"""
        if not self.database_url:
            log.warning("No database URL - using mock mode")
            return
        
        self.pool = await asyncpg.create_pool(
            self.database_url,
            min_size=2,
            max_size=10,
            command_timeout=10
        )
        
        # Register vector type
        async with self.pool.acquire() as conn:
            await register_vector(conn)
        
        log.info("pgvector database pool initialized")
    
    async def close(self):
        """Close connection pool"""
        if self.pool:
            await self.pool.close()
    
    async def vector_search(
        self,
        query_embedding: List[float],
        filters: Optional[Dict[str, Any]] = None,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Vector similarity search using pgvector.
        Uses cosine distance (<=> operator).
        """
        if not self.pool:
            return self._mock_vector_results()
        
        filters = filters or {}
        
        # Build query with filters
        query = """
        SELECT 
            id, slug, title, type, tier, price, metadata,
            1 - (embedding <=> $1::vector) AS similarity_score
        FROM ai_products
        WHERE 
            ($2::text IS NULL OR type = $2)
            AND ($3::text IS NULL OR tier = $3)
            AND ($4::decimal IS NULL OR price >= $4)
            AND ($5::decimal IS NULL OR price <= $5)
            AND in_stock = TRUE
        ORDER BY embedding <=> $1::vector
        LIMIT $6
        """
        
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(
                query,
                query_embedding,
                filters.get("type"),
                filters.get("tier"),
                filters.get("price_min"),
                filters.get("price_max"),
                limit
            )
        
        results = [dict(row) for row in rows]
        log.debug(f"Vector search returned {len(results)} results")
        
        return results
    
    async def keyword_search(
        self,
        query: str,
        filters: Optional[Dict[str, Any]] = None,
        limit: int = 50
    ) -> List[Dict[str, Any]]:
        """
        Keyword search using PostgreSQL full-text search.
        Uses BM25-like ranking via ts_rank.
        """
        if not self.pool:
            return self._mock_keyword_results()
        
        filters = filters or {}
        
        query_sql = """
        SELECT 
            id, slug, title, type, tier, price, metadata,
            ts_rank_cd(
                setweight(to_tsvector('english', title), 'A') ||
                setweight(to_tsvector('english', COALESCE(description, '')), 'B'),
                plainto_tsquery('english', $1)
            ) AS keyword_score
        FROM ai_products
        WHERE 
            to_tsvector('english', title || ' ' || COALESCE(description, '')) @@ 
            plainto_tsquery('english', $1)
            AND ($2::text IS NULL OR type = $2)
            AND ($3::text IS NULL OR tier = $3)
            AND ($4::decimal IS NULL OR price >= $4)
            AND ($5::decimal IS NULL OR price <= $5)
            AND in_stock = TRUE
        ORDER BY keyword_score DESC
        LIMIT $6
        """
        
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(
                query_sql,
                query,
                filters.get("type"),
                filters.get("tier"),
                filters.get("price_min"),
                filters.get("price_max"),
                limit
            )
        
        results = [dict(row) for row in rows]
        log.debug(f"Keyword search returned {len(results)} results")
        
        return results
    
    def _mock_vector_results(self) -> List[Dict[str, Any]]:
        """Mock vector search results for testing"""
        return [
            {
                "id": "prod_001",
                "slug": "hoodie-designer-fleece-59.99",
                "title": "Cove Designer Hoodie",
                "type": "hoodie",
                "tier": "designer",
                "price": 59.99,
                "metadata": {},
                "similarity_score": 0.87
            },
            {
                "id": "prod_002",
                "slug": "tee-designer-structured-34.99",
                "title": "Cove Designer Tee",
                "type": "tee",
                "tier": "designer",
                "price": 34.99,
                "metadata": {},
                "similarity_score": 0.75
            }
        ]
    
    def _mock_keyword_results(self) -> List[Dict[str, Any]]:
        """Mock keyword search results for testing"""
        return [
            {
                "id": "prod_001",
                "slug": "hoodie-designer-fleece-59.99",
                "title": "Cove Designer Hoodie",
                "type": "hoodie",
                "tier": "designer",
                "price": 59.99,
                "metadata": {},
                "keyword_score": 0.92
            }
        ]


# Global instance
_vector_db: Optional[VectorDatabase] = None

async def get_vector_db() -> VectorDatabase:
    """Get or create global vector database instance"""
    global _vector_db
    if _vector_db is None:
        _vector_db = VectorDatabase()
        await _vector_db.connect()
    return _vector_db
