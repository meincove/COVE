import logging
import json
import os
from typing import List, Dict, Optional
import litellm
from datetime import datetime

log = logging.getLogger(__name__)

class ConversationManager:
    """
    Manages conversation history and resolves context for follow-up queries.
    Currently uses in-memory storage (dictionaries). 
    In production, this should be replaced by Redis or a database.
    """
    
    def __init__(self):
        # In-memory storage: {user_id: [messages]}
        # Each message: {"role": "user"|"assistant", "content": "...", "timestamp": ...}
        self._history: Dict[str, List[Dict]] = {}
        self._max_history = 10  # Keep last 10 messages
        
    def add_message(self, user_id: str, role: str, content: str):
        """Add a message to the user's history"""
        if user_id not in self._history:
            self._history[user_id] = []
            
        self._history[user_id].append({
            "role": role,
            "content": content,
            "timestamp": datetime.now().isoformat()
        })
        
        # Trim history
        if len(self._history[user_id]) > self._max_history:
            self._history[user_id] = self._history[user_id][-self._max_history:]
            
    def get_history(self, user_id: str) -> List[Dict]:
        """Get conversation history for a user"""
        return self._history.get(user_id, [])
    
    def clear_history(self, user_id: str):
        """Clear history for a user (e.g. usage of 'new chat')"""
        if user_id in self._history:
            del self._history[user_id]

    async def resolve_intent(self, user_id: str, new_query: str) -> Dict:
        """
        Merges new query with conversation history to find true intent.
        
        Example:
        History: "Show me blue blazers"
        New: "Make it cheaper"
        Resolved: "Show me cheaper blue blazers"
        modification_type: "refinement"
        """
        history = self.get_history(user_id)
        
        # If no history, it's a new topic by definition
        if not history:
            return {
                "resolved_query": new_query, 
                "modification_type": "new_topic",
                "reasoning": "No history found"
            }
            
        # Format history for LLM
        history_text = ""
        for msg in history[-4:]: # Use last 4 messages for context window
            history_text += f"{msg['role'].upper()}: {msg['content']}\n"
            
        try:
            # ASK LLM to merge contexts
            # We use a lower temperature for deterministic resolution
            log.info(f"Resolving intent for user {user_id}...")
            
            # Normalize model format (openrouter: → openrouter/)
            model = os.getenv("GEN_MODEL", "openrouter/openai/gpt-4o-mini").replace("openrouter:", "openrouter/")
            response = await litellm.acompletion(
                model=model,
                messages=[
                    {
                        "role": "system", 
                        "content": """You are a Conversation Context Resolver.
Your job is to look at the chat history and the NEW user query, and determine the "Resolved Query".

Rules:
1. If the new query is a follow-up (e.g. "make it blue", "cheaper", "how about pants?"), MERGE it with the previous context.
2. If the new query is a completely new topic (e.g. "reset", "show me shoes" when talking about hats), return it as is.
3. Output JSON only.

Output Schema:
{
    "resolved_query": "The fully merged standalone query",
    "modification_type": "refinement" | "new_topic" | "continuation",
    "reasoning": "Brief explanation of how you merged it"
}

Example 1:
History: 
USER: Show me navy blazers
ASSISTANT: Here are some navy blazers...
New: "Make it cheaper"
Result: {"resolved_query": "Show me cheaper navy blazers", "modification_type": "refinement"}

Example 2:
History:
USER: I need a prom dress
ASSISTANT: ...
New: "I also need shoes for it"
Result: {"resolved_query": "Show me shoes that go with a prom dress", "modification_type": "continuation"}

Example 3:
History: ...
New: "Show me red hoodies"
Result: {"resolved_query": "Show me red hoodies", "modification_type": "new_topic"}
"""
                    },
                    {
                        "role": "user", 
                        "content": f"Chat History:\n{history_text}\n\nNEW USER QUERY: {new_query}\n\nResolve:"
                    }
                ],
                response_format={"type": "json_object"},
                temperature=0.1
            )
            
            content = response.choices[0].message.content
            result = json.loads(content)
            
            log.info(f"Resolved intent: '{new_query}' -> '{result['resolved_query']}' ({result['modification_type']})")
            return result
            
        except Exception as e:
            log.error(f"Context resolution failed: {e}")
            # Fallback to original query
            return {
                "resolved_query": new_query, 
                "modification_type": "error_fallback",
                "reasoning": str(e)
            }

# Global singleton
_conversation_manager = None

def get_conversation_manager() -> ConversationManager:
    global _conversation_manager
    if _conversation_manager is None:
        _conversation_manager = ConversationManager()
    return _conversation_manager
