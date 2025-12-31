"""
Context Manager for Intent Classification

Provides rich conversation context to help the LLM understand user intent.
Retrieves products shown, user preferences, cart state, etc.
"""

from typing import Dict, Any, List, Optional
import logging

log = logging.getLogger(__name__)


async def get_conversation_context(
    session_id: str,
    clerk_user_id: Optional[str] = None
) -> Dict[str, Any]:
    """
    Get rich conversation context for intent classification.
    
    Retrieves:
    - Products shown in this conversation
    - User preferences
    - Cart items
    - Last query
    
    Args:
        session_id: Guest session ID
        clerk_user_id: Optional authenticated user ID
        
    Returns:
        {
            "products_shown": [
                {"name": "COVE Hoodie", "tier": "casual", "turn": 1, "details": {...}},
                {"name": "LuxeLine Tee", "tier": "premium", "turn": 2, "details": {...}}
            ],
            "last_query": "show me tees",
            "cart_items": [...],
            "user_preferences": {...}
        }
    """
    try:
        # Import here to avoid circular dependencies
        from app.services.fact_storage import get_facts
        
        # Get facts from database
        facts = await get_facts(
            clerk_user_id=clerk_user_id or "",
            guest_session_id=session_id
        )
        
        # Extract products shown
        products_shown = _extract_products_from_facts(facts)
        
        # Extract other context
        last_query = None
        user_preferences = {}
        
        if facts:
            active_context = facts.get("active_context", {})
            last_query = active_context.get("last_query")
            user_preferences = facts.get("user_preferences", {})
        
        context = {
            "products_shown": products_shown,
            "last_query": last_query,
            "cart_items": [],  # TODO: Get from cart service
            "user_preferences": user_preferences
        }
        
        log.debug(f"Retrieved context for session {session_id}: {len(products_shown)} products shown")
        
        return context
        
    except Exception as e:
        log.error(f"Failed to get conversation context: {e}", exc_info=True)
        # Return empty context on failure (don't block intent classification)
        return {
            "products_shown": [],
            "last_query": None,
            "cart_items": [],
            "user_preferences": {}
        }


def _extract_products_from_facts(facts: Optional[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Extract products shown from facts.
    
    Args:
        facts: Facts dictionary from database
        
    Returns:
        List of products with name, tier, turn, and details
    """
    if not facts:
        return []
    
    product_focus = facts.get("product_focus", {})
    current_products = product_focus.get("current_products", [])
    
    if not current_products:
        return []
    
    # Extract relevant product info
    products_shown = []
    for product in current_products:
        products_shown.append({
            "name": product.get("name", "Unknown Product"),
            "tier": product.get("tier", ""),
            "turn": product.get("turn_introduced", 0),
            "details": product.get("full_details", {}),
            "product_id": product.get("product_id", ""),
            "user_interest": product.get("user_interest_level", "medium")
        })
    
    # Sort by turn introduced (most recent first)
    products_shown.sort(key=lambda p: p["turn"], reverse=True)
    
    return products_shown
