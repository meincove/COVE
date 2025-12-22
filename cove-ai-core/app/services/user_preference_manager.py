"""
UserPreferenceManager - Week 2 Day 3
Combines preference extraction with storage

Workflow:
1. User says "I hate hoodies"
2. Extract preferences using LLM
3. Store in UserMemory (semantic vector)
4. Update UserProfile (structured JSON)
"""

from app.agents.preference_extractor import PreferenceExtractor
from app.services.user_memory import get_memory_service
from typing import Dict, Optional
import logging

log = logging.getLogger(__name__)


class UserPreferenceManager:
    """
    Manage user preferences: extract, store, and recall.
    
    Combines:
    - PreferenceExtractor (LLM parsing)
    - UserMemory (RAG vector storage)
    - UserProfile (structured storage - future)
    """
    
    def __init__(self):
        self.extractor = PreferenceExtractor()
    
    async def process_statement(
        self,
        user_id: str,
        statement: str,
        auto_store: bool = True
    ) -> Dict:
        """
        Process a user statement: extract preferences and optionally store.
        
        Args:
            user_id: User identifier
            statement: User's natural language statement
            auto_store: Automatically store in memory (default: True)
        
        Returns:
            {
                "extracted": {...},  # Extracted preferences
                "stored": True/False,  # Was it stored?
                "memory_id": 123  # Memory ID if stored
            }
        
        Example:
            >>> manager = UserPreferenceManager()
            >>> result = await manager.process_statement(
            ...     user_id="user_123",
            ...     statement="I hate hoodies"
            ... )
            >>> # Extracts preferences AND stores in memory
        """
        try:
            # Extract preferences using LLM
            preferences = await self.extractor.extract(statement)
            
            result = {
                "extracted": preferences,
                "stored": False,
                "memory_id": None
            }
            
            # Store in memory if requested and confidence is high enough
            if auto_store and preferences.get("confidence", 0) >= 0.6:  # Tuned for "The Hater" scenario
                memory_service = await get_memory_service()
                
                # Determine memory type based on content
                if preferences["dislikes"]:
                    memory_type = "dislike"
                elif preferences["likes"]:
                    memory_type = "preference"
                elif preferences["colors"]:
                    memory_type = "color"
                elif preferences["styles"]:
                    memory_type = "style"
                else:
                    memory_type = "general"
                
                memory_id = await memory_service.store_memory(
                    user_id=user_id,
                    content=statement,
                    memory_type=memory_type,
                    confidence=preferences["confidence"]
                )
                
                result["stored"] = True
                result["memory_id"] = memory_id
                
                log.info(f"Stored preference for {user_id}: {statement[:50]}...")
            
            return result
            
        except Exception as e:
            log.error(f"Failed to process statement: {e}")
            return {
                "extracted": {},
                "stored": False,
                "memory_id": None,
                "error": str(e)
            }
    
    async def get_user_preferences_summary(self, user_id: str) -> Dict:
        """
        Get a summary of all stored preferences for a user.
        
        Returns:
            {
                "dislikes": ["hoodie", "bright_colors"],
                "likes": ["blazer", "slim_fit"],
                "colors": ["navy", "black"],
                "styles": ["minimalist", "professional"]
            }
        """
        try:
            memory_service = await get_memory_service()
            prefs = await memory_service.get_user_preferences(user_id)
            return prefs
            
        except Exception as e:
            log.error(f"Failed to get preferences summary: {e}")
            return {
                "dislikes": [],
                "likes": [],
                "colors": [],
                "styles": []
            }
    
    async def recall_for_context(
        self,
        user_id: str,
        context: str,
        top_k: int = 5
    ) -> list:
        """
        Recall relevant preferences for a given context.
        
        Example:
            >>> memories = await manager.recall_for_context(
            ...     user_id="user_123",
            ...     context="building casual outfit for weekend"
            ... )
            >>> # Returns: [{"content": "I hate hoodies", "similarity": 0.85}]
        """
        try:
            memory_service = await get_memory_service()
            memories = await memory_service.recall_memories(
                user_id=user_id,
                query=context,
                top_k=top_k,
                min_confidence=0.6
            )
            return memories
            
        except Exception as e:
            log.error(f"Failed to recall preferences: {e}")
            return []


# Global instance
_preference_manager = None

async def get_preference_manager() -> UserPreferenceManager:
    """Get or create global preference manager"""
    global _preference_manager
    if _preference_manager is None:
        _preference_manager = UserPreferenceManager()
    return _preference_manager
