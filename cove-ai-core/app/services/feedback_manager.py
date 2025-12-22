import logging
import json
from typing import Dict, Optional, List
from app.services.user_memory import get_memory_service

log = logging.getLogger(__name__)

class FeedbackManager:
    """
    Manages implicit user feedback (clicks, likes, purchases, rejections).
    updates the User Profile / Memory based on actions.
    """
    
    async def process_feedback(
        self,
        user_id: str,
        event_type: str,
        item_metadata: Dict
    ) -> Dict:
        """
        Process a user feedback event.
        
        Args:
            user_id: The user identifier
            event_type: "click", "like", "purchase", "reject", "view"
            item_metadata: Metadata about the item (color, style, type, title)
            
        Returns:
            {
                "processed": True,
                "memory_created": True/False,
                "memory_id": 123
            }
        """
        log.info(f"Processing feedback: {event_type} for user {user_id}")
        
        memory_service = await get_memory_service()
        result = {
            "processed": True,
            "memory_created": False,
            "memory_id": None
        }
        
        try:
            # 1. POSITIVE SIGNALS (Click, Like, Purchase)
            if event_type in ["click", "like", "purchase"]:
                # Construct implicit preference statement
                # e.g. "User showed interest in Navy Blue Blazer (Professional)"
                
                # Extract features
                title = item_metadata.get("title", "Unknown Item")
                color = item_metadata.get("color")
                item_type = item_metadata.get("type", "item")
                
                # Weight confidence based on action
                confidence_map = {
                    "click": 0.5,      # Weak signal
                    "like": 0.8,       # Strong signal
                    "purchase": 1.0    # Very strong signal
                }
                confidence = confidence_map.get(event_type, 0.5)
                
                # Create description
                desc_parts = [f"User interested in {title}"]
                if color:
                    desc_parts.append(f"({color})")
                
                description = " ".join(desc_parts)
                
                # Store in vector memory as "implicit_preference"
                # This helps "recall_for_context" find these features later
                memory_id = await memory_service.store_memory(
                    user_id=user_id,
                    content=description,
                    memory_type="implicit_preference",
                    confidence=confidence
                )
                
                result["memory_created"] = True
                result["memory_id"] = memory_id
                log.info(f"🧠 Implicit memory created: {description} (conf={confidence})")
                
            # 2. NEGATIVE SIGNALS (Reject, Dislike)
            elif event_type in ["reject", "dislike"]:
                # "User rejected Navy Blazer"
                title = item_metadata.get("title", "Item")
                description = f"User rejected {title}"
                
                # Store effectively as a negative preference for THIS SESSION context
                # (Lower confidence so it doesn't ban the item forever, just downranks it)
                memory_id = await memory_service.store_memory(
                    user_id=user_id,
                    content=description,
                    memory_type="implicit_dislike",
                    confidence=0.6
                )
                
                result["memory_created"] = True
                result["memory_id"] = memory_id
                log.info(f"🧠 Implicit dislike created: {description}")
                
            return result
            
        except Exception as e:
            log.error(f"Failed to process feedback: {e}")
            return {"processed": False, "error": str(e)}

# Global Singleton
_feedback_manager = None

def get_feedback_manager() -> FeedbackManager:
    global _feedback_manager
    if _feedback_manager is None:
        _feedback_manager = FeedbackManager()
    return _feedback_manager
