"""
Session state management for the AI Agent.
Handles in-memory tracking of conversation context, pending questions, and history.

Extracted from app/routes/agent.py to improve separation of concerns.
"""
from typing import Any, Dict, List, Optional, Set
from datetime import datetime

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

# Track active search context (filters, intent) for "show more" / "refine"
# Stores: { "filters": {...}, "intent": "...", "timestamp": ... }
_SESSION_SEARCH_CONTEXT: Dict[str, Dict[str, Any]] = {}

# User preferences that persist for the entire session
# Stores: { "gender": "male" | "female" | "unisex", ... }
_SESSION_USER_PREFERENCES: Dict[str, Dict[str, Any]] = {}

# Accumulated user profile from query entities (guest intelligence)
# Stores: { "entities_seen": {"size": ["XL", "L"], "color": ["black"], ...}, "inference": {...} }
_SESSION_ACCUMULATED_PROFILE: Dict[str, Dict[str, Any]] = {}

# Real-time interaction tracking for session-level personalization
# Stores: [{"slug": "...", "action": "VIEW|CLICK|CART_ADD", "timestamp": datetime, "meta": {...}}, ...]
_SESSION_INTERACTIONS: Dict[str, List[Dict[str, Any]]] = {}

# User body profile for size/fit intelligence
# Stores: {"height_cm": float, "weight_kg": float, "gender": str, "fit_preference": str, "usual_sizes": {...}}
_SESSION_BODY_PROFILE: Dict[str, Dict[str, Any]] = {}


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
        filtered = []
        for item in items:
            slug = None
            if hasattr(item, "slug"):
                slug = item.slug
            elif isinstance(item, dict):
                slug = item.get("slug")
            
            if slug and slug not in shown:
                filtered.append(item)
        return filtered

    # --- Active Search Context (Sync) ---

    @classmethod
    def set_search_context(cls, body, filters: Dict[str, Any], intent: str) -> None:
        """Store active search context synchronously for next turn."""
        key = cls.get_session_key(body)
        if key:
            import time
            _SESSION_SEARCH_CONTEXT[key] = {
                "filters": filters,
                "intent": intent,
                "timestamp": time.time()
            }

    @classmethod
    def get_search_context(cls, body) -> Optional[Dict[str, Any]]:
        """Retrieve active search context."""
        key = cls.get_session_key(body)
        return _SESSION_SEARCH_CONTEXT.get(key) if key else None

    # --- User Preferences (persist for entire session) ---

    @classmethod
    def set_gender_preference(cls, body, gender: str) -> None:
        """Store user's gender preference for the session."""
        key = cls.get_session_key(body)
        if key:
            if key not in _SESSION_USER_PREFERENCES:
                _SESSION_USER_PREFERENCES[key] = {}
            _SESSION_USER_PREFERENCES[key]["gender"] = gender.lower().strip()

    @classmethod
    def get_gender_preference(cls, body) -> Optional[str]:
        """Get user's stored gender preference."""
        key = cls.get_session_key(body)
        if key and key in _SESSION_USER_PREFERENCES:
            return _SESSION_USER_PREFERENCES[key].get("gender")
        return None

    @classmethod
    def get_all_preferences(cls, body) -> Dict[str, Any]:
        """Get all stored preferences for the session."""
        key = cls.get_session_key(body)
        return _SESSION_USER_PREFERENCES.get(key, {}) if key else {}

    # --- Entity Accumulator (Guest Intelligence) ---

    @classmethod
    def accumulate_entities(cls, body, entities: Dict[str, Any]) -> None:
        """
        Track entities from each query to build session-level user profile.
        Tracks: gender, size, color, style, price preferences, occasions.
        """
        key = cls.get_session_key(body)
        if not key:
            return
        
        if key not in _SESSION_ACCUMULATED_PROFILE:
            _SESSION_ACCUMULATED_PROFILE[key] = {"entities_seen": {}, "query_count": 0}
        
        profile = _SESSION_ACCUMULATED_PROFILE[key]
        profile["query_count"] += 1
        seen = profile["entities_seen"]
        
        # Track entities that indicate preferences
        trackable = ["gender", "size", "color", "type", "style", "occasion", "fit"]
        for entity_key in trackable:
            if entity_key in entities and entities[entity_key]:
                val = str(entities[entity_key]).lower().strip()
                if entity_key not in seen:
                    seen[entity_key] = []
                if val not in seen[entity_key]:
                    seen[entity_key].append(val)
        
        # Track price preferences
        if entities.get("price_max"):
            if "price_range" not in seen:
                seen["price_range"] = []
            seen["price_range"].append({"max": entities["price_max"]})
        if entities.get("price_min"):
            if "price_range" not in seen:
                seen["price_range"] = []
            seen["price_range"].append({"min": entities["price_min"]})

    @classmethod
    def get_accumulated_profile(cls, body) -> Dict[str, Any]:
        """
        Get inferred user profile from accumulated entities.
        Returns most frequently mentioned preferences.
        """
        key = cls.get_session_key(body)
        if not key or key not in _SESSION_ACCUMULATED_PROFILE:
            return {}
        
        profile = _SESSION_ACCUMULATED_PROFILE[key]
        seen = profile.get("entities_seen", {})
        
        # Build inferred profile from most common values
        inferred = {"source": "session_accumulator", "query_count": profile.get("query_count", 0)}
        
        for entity_key, values in seen.items():
            if entity_key == "price_range":
                # Average price preferences
                maxes = [p["max"] for p in values if "max" in p]
                mins = [p["min"] for p in values if "min" in p]
                if maxes:
                    inferred["avg_price_max"] = sum(maxes) / len(maxes)
                if mins:
                    inferred["avg_price_min"] = sum(mins) / len(mins)
            else:
                # Most common value (first is most recent for stability)
                if values:
                    inferred[f"preferred_{entity_key}"] = values[0]
                    if len(values) > 1:
                        inferred[f"all_{entity_key}s"] = values
        
        return inferred

    # =========================================================================
    # Real-Time Interaction Tracking (Phase 3: Personalization)
    # =========================================================================
    
    @classmethod
    def track_product_interaction(
        cls, 
        body, 
        slug: str, 
        action: str = "VIEW",
        meta: Optional[Dict[str, Any]] = None
    ) -> None:
        """
        Track user interaction with a product for session-level personalization.
        
        Args:
            body: Request body containing session identifiers
            slug: Product slug
            action: Interaction type (VIEW, CLICK, CART_ADD, PURCHASE)
            meta: Optional metadata (product type, color, price, etc.)
        """
        key = cls.get_session_key(body)
        if not key or not slug:
            return
        
        if key not in _SESSION_INTERACTIONS:
            _SESSION_INTERACTIONS[key] = []
        
        # Add interaction with timestamp
        interaction = {
            "slug": slug,
            "action": action,
            "timestamp": datetime.now(),
            "meta": meta or {}
        }
        
        # Prevent duplicate consecutive interactions for same slug
        existing = _SESSION_INTERACTIONS[key]
        if existing and existing[-1].get("slug") == slug and existing[-1].get("action") == action:
            # Update timestamp instead of adding duplicate
            existing[-1]["timestamp"] = datetime.now()
        else:
            _SESSION_INTERACTIONS[key].append(interaction)
        
        # Keep only last 50 interactions to limit memory
        if len(_SESSION_INTERACTIONS[key]) > 50:
            _SESSION_INTERACTIONS[key] = _SESSION_INTERACTIONS[key][-50:]

    @classmethod
    def get_session_interactions(cls, body) -> List[Dict[str, Any]]:
        """
        Get all product interactions for the current session.
        
        Returns:
            List of interaction dicts with slug, action, timestamp, meta
        """
        key = cls.get_session_key(body)
        if not key:
            return []
        return _SESSION_INTERACTIONS.get(key, [])
    
    @classmethod
    def get_recently_viewed_slugs(cls, body, limit: int = 10) -> List[str]:
        """
        Get slugs of recently viewed products (most recent first).
        
        Useful for "recently viewed" features and session affinity scoring.
        """
        interactions = cls.get_session_interactions(body)
        # Filter for VIEW/CLICK actions and get unique slugs in reverse order
        seen = set()
        slugs = []
        for i in reversed(interactions):
            if i["action"] in ("VIEW", "CLICK") and i["slug"] not in seen:
                slugs.append(i["slug"])
                seen.add(i["slug"])
                if len(slugs) >= limit:
                    break
        return slugs

    # =========================================================================
    # Body Profile Management (Size & Fit Intelligence)
    # =========================================================================
    
    @classmethod
    def set_body_profile(
        cls, 
        body, 
        height_cm: Optional[float] = None,
        weight_kg: Optional[float] = None,
        gender: Optional[str] = None,
        fit_preference: Optional[str] = None,
        usual_sizes: Optional[Dict[str, str]] = None
    ) -> None:
        """
        Store user's body profile for size recommendations.
        
        Args:
            body: Request body containing session identifiers
            height_cm: User height in centimeters
            weight_kg: User weight in kilograms
            gender: User's gender (men/women/unisex)
            fit_preference: Preferred fit (slim/regular/relaxed/oversized)
            usual_sizes: Dict of category -> usual size e.g. {"hoodie": "L", "pants": "M"}
        """
        key = cls.get_session_key(body)
        if not key:
            return
        
        if key not in _SESSION_BODY_PROFILE:
            _SESSION_BODY_PROFILE[key] = {}
        
        profile = _SESSION_BODY_PROFILE[key]
        
        # Only update provided fields
        if height_cm is not None:
            profile["height_cm"] = height_cm
        if weight_kg is not None:
            profile["weight_kg"] = weight_kg
        if gender is not None:
            profile["gender"] = gender.lower()
        if fit_preference is not None:
            profile["fit_preference"] = fit_preference.lower()
        if usual_sizes is not None:
            if "usual_sizes" not in profile:
                profile["usual_sizes"] = {}
            profile["usual_sizes"].update(usual_sizes)
        
        profile["updated_at"] = datetime.now()

    @classmethod
    def get_body_profile(cls, body) -> Dict[str, Any]:
        """
        Get user's stored body profile.
        
        Returns:
            Dict with height_cm, weight_kg, gender, fit_preference, usual_sizes
        """
        key = cls.get_session_key(body)
        if not key:
            return {}
        return _SESSION_BODY_PROFILE.get(key, {})
    
    @classmethod
    def update_usual_size(cls, body, category: str, size: str) -> None:
        """
        Update user's usual size for a specific category.
        Learns from purchases and cart adds.
        """
        key = cls.get_session_key(body)
        if not key:
            return
        
        if key not in _SESSION_BODY_PROFILE:
            _SESSION_BODY_PROFILE[key] = {}
        
        profile = _SESSION_BODY_PROFILE[key]
        if "usual_sizes" not in profile:
            profile["usual_sizes"] = {}
        
        # Track size frequency per category
        if "size_history" not in profile:
            profile["size_history"] = {}
        if category not in profile["size_history"]:
            profile["size_history"][category] = {}
        
        size_upper = size.upper()
        profile["size_history"][category][size_upper] = profile["size_history"][category].get(size_upper, 0) + 1
        
        # Update usual_sizes to most frequent
        category_history = profile["size_history"][category]
        most_common = max(category_history, key=category_history.get)
        profile["usual_sizes"][category] = most_common
    
    @classmethod
    def has_complete_body_profile(cls, body) -> bool:
        """Check if user has provided enough info for size recommendations."""
        profile = cls.get_body_profile(body)
        # Minimum: height and weight OR at least 2 usual sizes
        has_measurements = profile.get("height_cm") and profile.get("weight_kg")
        has_size_history = len(profile.get("usual_sizes", {})) >= 2
        return has_measurements or has_size_history
