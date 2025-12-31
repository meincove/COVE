"""
Session state management for the AI Agent.
Handles in-memory tracking of conversation context, pending questions, and history.

Extracted from app/routes/agent.py to improve separation of concerns.
"""
from typing import Any, Dict, List, Optional, Set

# In-memory session caches (single-process only)
# TODO: Move to Redis for production scalability

_SESSION_RECS: Dict[str, List[Dict[str, Any]]] = {}
_SESSION_LAST_USER_MSG: Dict[str, str] = {}

# Track when we asked user for missing information
_SESSION_AWAITING_SIZE: Dict[str, Dict[str, Any]] = {}
_SESSION_AWAITING_COLOR: Dict[str, Dict[str, Any]] = {}
_SESSION_AWAITING_QUANTITY: Dict[str, Dict[str, Any]] = {}

# Track shown items to prevent duplicates in "show more"
_SESSION_SHOWN_SLUGS: Dict[str, Set[str]] = {}


def get_namespaced_session_id(
    guest_id: Optional[str],
    clerk_id: Optional[str],
    session_type: str = "main"
) -> str:
    """
    Create namespaced session ID for separate chat sessions.
    
    Examples:
        - guest_abc123:main
        - clerk_user_xyz:outfit_builder
    """
    base = clerk_id or guest_id or "anonymous"
    return f"{base}:{session_type}"


def get_base_user_id(
    guest_id: Optional[str],
    clerk_id: Optional[str]
) -> str:
    """
    Get base user ID without session namespace.
    Used for accessing user-level data shared across sessions.
    """
    return clerk_id or guest_id or "anonymous"


class SessionStateManager:
    """
    Manages session state for agent interactions.
    Abstracts the underlying storage (currently memory, future Redis).
    """
    
    @staticmethod
    def get_session_key(body) -> Optional[str]:
        """Extract session key from request body."""
        # Handles both Pydantic models (body.guestSessionId) and dicts
        if hasattr(body, "guestSessionId"):
            return get_namespaced_session_id(
                body.guestSessionId,
                body.clerkUserId,
                body.sessionType
            )
        return None

    # --- Recommendations Context ---
    
    @classmethod
    def store_session_recs(cls, body, items: List[Any]) -> None:
        key = cls.get_session_key(body)
        if not key:
            return
        # Handle both dicts and Pydantic objects
        _SESSION_RECS[key] = [
            it.dict() if hasattr(it, "dict") else it 
            for it in items
        ]

    @classmethod
    def get_session_recs(cls, body) -> List[Dict[str, Any]]:
        key = cls.get_session_key(body)
        if not key:
            return []
        return _SESSION_RECS.get(key, [])

    # --- Pending Questions State ---

    @classmethod
    def set_awaiting_size(cls, body, product_info: Dict[str, Any]) -> None:
        key = cls.get_session_key(body)
        if key:
            _SESSION_AWAITING_SIZE[key] = product_info

    @classmethod
    def get_awaiting_size(cls, body) -> Optional[Dict[str, Any]]:
        key = cls.get_session_key(body)
        return _SESSION_AWAITING_SIZE.get(key) if key else None

    @classmethod
    def clear_awaiting_size(cls, body) -> None:
        key = cls.get_session_key(body)
        if key and key in _SESSION_AWAITING_SIZE:
            del _SESSION_AWAITING_SIZE[key]

    @classmethod
    def set_awaiting_color(cls, body, product_info: Dict[str, Any]) -> None:
        key = cls.get_session_key(body)
        if key:
            _SESSION_AWAITING_COLOR[key] = product_info

    @classmethod
    def get_awaiting_color(cls, body) -> Optional[Dict[str, Any]]:
        key = cls.get_session_key(body)
        return _SESSION_AWAITING_COLOR.get(key) if key else None

    @classmethod
    def clear_awaiting_color(cls, body) -> None:
        key = cls.get_session_key(body)
        if key and key in _SESSION_AWAITING_COLOR:
            del _SESSION_AWAITING_COLOR[key]
            
    @classmethod
    def set_awaiting_quantity(cls, body, product_info: Dict[str, Any]) -> None:
        key = cls.get_session_key(body)
        if key:
            _SESSION_AWAITING_QUANTITY[key] = product_info

    @classmethod
    def get_awaiting_quantity(cls, body) -> Optional[Dict[str, Any]]:
        key = cls.get_session_key(body)
        return _SESSION_AWAITING_QUANTITY.get(key) if key else None

    @classmethod
    def clear_awaiting_quantity(cls, body) -> None:
        key = cls.get_session_key(body)
        if key and key in _SESSION_AWAITING_QUANTITY:
            del _SESSION_AWAITING_QUANTITY[key]

    # --- Conversation Context ---

    @classmethod
    def update_last_user_message(cls, body) -> None:
        key = cls.get_session_key(body)
        if key and hasattr(body, "message"):
            _SESSION_LAST_USER_MSG[key] = body.message

    @classmethod
    def get_last_user_message(cls, body) -> Optional[str]:
        key = cls.get_session_key(body)
        return _SESSION_LAST_USER_MSG.get(key) if key else None

    # --- Shown Items Tracking ---

    @classmethod
    def get_shown_slugs(cls, body) -> Set[str]:
        key = cls.get_session_key(body)
        return _SESSION_SHOWN_SLUGS.get(key, set()) if key else set()

    @classmethod
    def mark_slugs_as_shown(cls, body, slugs: List[str]) -> None:
        key = cls.get_session_key(body)
        if not key:
            return
        if key not in _SESSION_SHOWN_SLUGS:
            _SESSION_SHOWN_SLUGS[key] = set()
        _SESSION_SHOWN_SLUGS[key].update(slugs)

    @classmethod
    def filter_out_shown_items(cls, body, items: List[Any]) -> List[Any]:
        shown = cls.get_shown_slugs(body)
        if not shown:
            return items
        # items can be dicts or AgentItems
        return [
            item for item in items 
            if (getattr(item, "slug", None) or item.get("slug")) not in shown
        ]
