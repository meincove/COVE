"""
Session state management for the AI Agent.
Handles in-memory tracking of conversation context, pending questions, and history.

Extracted from app/routes/agent.py to improve separation of concerns.
"""
from typing import Any, Dict, List, Optional, Set
from datetime import datetime
import os
import time
import json
import logging

from app.core.redis_client import get_redis_client, redis_available

log = logging.getLogger("cove.session_state")

# In-memory session caches (single-process only)
# TODO: Move to Redis for production scalability
_SESSION_TTL_SECONDS = int(os.getenv("SESSION_STATE_TTL_SECONDS", "21600"))  # 6 hours

_SESSION_RECS: Dict[str, List[Dict[str, Any]]] = {}
_SESSION_LAST_USER_MSG: Dict[str, str] = {}
_SESSION_LAST_SEEN: Dict[str, float] = {}

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
) -> Optional[str]:
    """
    Create namespaced session ID for separate chat sessions.
    
    Examples:
        - guest_abc123:main
        - clerk_user_xyz:outfit_builder
    """
    base = clerk_id or guest_id
    if not base:
        return None
    return f"{base}:{session_type}"


def get_base_user_id(
    guest_id: Optional[str],
    clerk_id: Optional[str]
) -> Optional[str]:
    """
    Get base user ID without session namespace.
    Used for accessing user-level data shared across sessions.
    """
    return clerk_id or guest_id


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
            key = get_namespaced_session_id(
                body.guestSessionId,
                body.clerkUserId,
                body.sessionType
            )
            if key:
                if redis_available():
                    SessionStateManager._touch_redis(key)
                else:
                    SessionStateManager._touch_and_prune(key)
            return key
        return None

    @staticmethod
    def _redis_key(session_key: str, suffix: str) -> str:
        return f"cove:session:{session_key}:{suffix}"

    @staticmethod
    def _touch_redis(session_key: str) -> None:
        client = get_redis_client()
        if not client:
            return
        try:
            meta_key = SessionStateManager._redis_key(session_key, "__meta")
            client.setex(meta_key, _SESSION_TTL_SECONDS, "1")
        except Exception as e:
            log.debug("Redis touch failed: %s", e)

    @staticmethod
    def _redis_get(session_key: str, suffix: str, default):
        client = get_redis_client()
        if not client:
            return default
        key = SessionStateManager._redis_key(session_key, suffix)
        try:
            raw = client.get(key)
            if raw is None:
                return default
            # Refresh TTL on access
            if _SESSION_TTL_SECONDS > 0:
                client.expire(key, _SESSION_TTL_SECONDS)
            return json.loads(raw)
        except Exception as e:
            log.debug("Redis get failed for %s: %s", key, e)
            return default

    @staticmethod
    def _redis_set(session_key: str, suffix: str, value) -> None:
        client = get_redis_client()
        if not client:
            return
        key = SessionStateManager._redis_key(session_key, suffix)
        try:
            payload = json.dumps(value)
            if _SESSION_TTL_SECONDS > 0:
                client.setex(key, _SESSION_TTL_SECONDS, payload)
            else:
                client.set(key, payload)
        except Exception as e:
            log.debug("Redis set failed for %s: %s", key, e)

    @staticmethod
    def _redis_delete(session_key: str, suffix: str) -> None:
        client = get_redis_client()
        if not client:
            return
        key = SessionStateManager._redis_key(session_key, suffix)
        try:
            client.delete(key)
        except Exception as e:
            log.debug("Redis delete failed for %s: %s", key, e)

    @staticmethod
    def _touch_and_prune(key: str) -> None:
        """Update last seen and prune stale sessions."""
        now = time.time()
        _SESSION_LAST_SEEN[key] = now

        if _SESSION_TTL_SECONDS <= 0:
            return

        cutoff = now - _SESSION_TTL_SECONDS
        stale_keys = [k for k, ts in _SESSION_LAST_SEEN.items() if ts < cutoff]
        for k in stale_keys:
            SessionStateManager._purge_session(k)

    @staticmethod
    def _purge_session(key: str) -> None:
        """Remove all cached state for a session key."""
        if redis_available():
            for suffix in (
                "recs",
                "last_user_msg",
                "awaiting_size",
                "awaiting_color",
                "awaiting_quantity",
                "shown_slugs",
                "search_context",
                "user_prefs",
                "accum_profile",
                "interactions",
                "body_profile",
                "__meta",
            ):
                SessionStateManager._redis_delete(key, suffix)
        _SESSION_LAST_SEEN.pop(key, None)
        _SESSION_RECS.pop(key, None)
        _SESSION_LAST_USER_MSG.pop(key, None)
        _SESSION_AWAITING_SIZE.pop(key, None)
        _SESSION_AWAITING_COLOR.pop(key, None)
        _SESSION_AWAITING_QUANTITY.pop(key, None)
        _SESSION_SHOWN_SLUGS.pop(key, None)
        _SESSION_SEARCH_CONTEXT.pop(key, None)
        _SESSION_USER_PREFERENCES.pop(key, None)
        _SESSION_ACCUMULATED_PROFILE.pop(key, None)
        _SESSION_INTERACTIONS.pop(key, None)
        _SESSION_BODY_PROFILE.pop(key, None)

    # --- Recommendations Context ---
    
    @classmethod
    def store_session_recs(cls, body, items: List[Any]) -> None:
        key = cls.get_session_key(body)
        if not key:
            return
        # Handle both dicts and Pydantic objects
        normalized = [
            it.dict() if hasattr(it, "dict") else it 
            for it in items
        ]
        if redis_available():
            cls._redis_set(key, "recs", normalized)
        else:
            _SESSION_RECS[key] = normalized

    @classmethod
    def get_session_recs(cls, body) -> List[Dict[str, Any]]:
        key = cls.get_session_key(body)
        if not key:
            return []
        if redis_available():
            return cls._redis_get(key, "recs", [])
        return _SESSION_RECS.get(key, [])

    # --- Pending Questions State ---

    @classmethod
    def set_awaiting_size(cls, body, product_info: Dict[str, Any]) -> None:
        key = cls.get_session_key(body)
        if key:
            if redis_available():
                cls._redis_set(key, "awaiting_size", product_info)
            else:
                _SESSION_AWAITING_SIZE[key] = product_info

    @classmethod
    def get_awaiting_size(cls, body) -> Optional[Dict[str, Any]]:
        key = cls.get_session_key(body)
        if not key:
            return None
        if redis_available():
            return cls._redis_get(key, "awaiting_size", None)
        return _SESSION_AWAITING_SIZE.get(key)

    @classmethod
    def clear_awaiting_size(cls, body) -> None:
        key = cls.get_session_key(body)
        if key:
            if redis_available():
                cls._redis_delete(key, "awaiting_size")
            elif key in _SESSION_AWAITING_SIZE:
                del _SESSION_AWAITING_SIZE[key]

    @classmethod
    def set_awaiting_color(cls, body, product_info: Dict[str, Any]) -> None:
        key = cls.get_session_key(body)
        if key:
            if redis_available():
                cls._redis_set(key, "awaiting_color", product_info)
            else:
                _SESSION_AWAITING_COLOR[key] = product_info

    @classmethod
    def get_awaiting_color(cls, body) -> Optional[Dict[str, Any]]:
        key = cls.get_session_key(body)
        if not key:
            return None
        if redis_available():
            return cls._redis_get(key, "awaiting_color", None)
        return _SESSION_AWAITING_COLOR.get(key)

    @classmethod
    def clear_awaiting_color(cls, body) -> None:
        key = cls.get_session_key(body)
        if key:
            if redis_available():
                cls._redis_delete(key, "awaiting_color")
            elif key in _SESSION_AWAITING_COLOR:
                del _SESSION_AWAITING_COLOR[key]
            
    @classmethod
    def set_awaiting_quantity(cls, body, product_info: Dict[str, Any]) -> None:
        key = cls.get_session_key(body)
        if key:
            if redis_available():
                cls._redis_set(key, "awaiting_quantity", product_info)
            else:
                _SESSION_AWAITING_QUANTITY[key] = product_info

    @classmethod
    def get_awaiting_quantity(cls, body) -> Optional[Dict[str, Any]]:
        key = cls.get_session_key(body)
        if not key:
            return None
        if redis_available():
            return cls._redis_get(key, "awaiting_quantity", None)
        return _SESSION_AWAITING_QUANTITY.get(key)

    @classmethod
    def clear_awaiting_quantity(cls, body) -> None:
        key = cls.get_session_key(body)
        if key:
            if redis_available():
                cls._redis_delete(key, "awaiting_quantity")
            elif key in _SESSION_AWAITING_QUANTITY:
                del _SESSION_AWAITING_QUANTITY[key]

    # --- Conversation Context ---

    @classmethod
    def update_last_user_message(cls, body) -> None:
        key = cls.get_session_key(body)
        if key and hasattr(body, "message"):
            if redis_available():
                cls._redis_set(key, "last_user_msg", body.message)
            else:
                _SESSION_LAST_USER_MSG[key] = body.message

    @classmethod
    def get_last_user_message(cls, body) -> Optional[str]:
        key = cls.get_session_key(body)
        if not key:
            return None
        if redis_available():
            return cls._redis_get(key, "last_user_msg", None)
        return _SESSION_LAST_USER_MSG.get(key)

    # --- Shown Items Tracking ---

    @classmethod
    def get_shown_slugs(cls, body) -> Set[str]:
        key = cls.get_session_key(body)
        if not key:
            return set()
        if redis_available():
            return set(cls._redis_get(key, "shown_slugs", []))
        return _SESSION_SHOWN_SLUGS.get(key, set())

    @classmethod
    def mark_slugs_as_shown(cls, body, slugs: List[str]) -> None:
        key = cls.get_session_key(body)
        if not key:
            return
        if redis_available():
            existing = set(cls._redis_get(key, "shown_slugs", []))
            existing.update(slugs)
            cls._redis_set(key, "shown_slugs", list(existing))
        else:
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
            payload = {
                "filters": filters,
                "intent": intent,
                "timestamp": time.time()
            }
            if redis_available():
                cls._redis_set(key, "search_context", payload)
            else:
                _SESSION_SEARCH_CONTEXT[key] = payload

    @classmethod
    def get_search_context(cls, body) -> Optional[Dict[str, Any]]:
        """Retrieve active search context."""
        key = cls.get_session_key(body)
        if not key:
            return None
        if redis_available():
            return cls._redis_get(key, "search_context", None)
        return _SESSION_SEARCH_CONTEXT.get(key)

    # --- User Preferences (persist for entire session) ---

    @classmethod
    def set_gender_preference(cls, body, gender: str) -> None:
        """Store user's gender preference for the session."""
        key = cls.get_session_key(body)
        if key:
            if redis_available():
                prefs = cls._redis_get(key, "user_prefs", {})
                prefs["gender"] = gender.lower().strip()
                cls._redis_set(key, "user_prefs", prefs)
            else:
                if key not in _SESSION_USER_PREFERENCES:
                    _SESSION_USER_PREFERENCES[key] = {}
                _SESSION_USER_PREFERENCES[key]["gender"] = gender.lower().strip()

    @classmethod
    def get_gender_preference(cls, body) -> Optional[str]:
        """Get user's stored gender preference."""
        key = cls.get_session_key(body)
        if not key:
            return None
        if redis_available():
            prefs = cls._redis_get(key, "user_prefs", {})
            return prefs.get("gender")
        if key in _SESSION_USER_PREFERENCES:
            return _SESSION_USER_PREFERENCES[key].get("gender")
        return None

    @classmethod
    def get_all_preferences(cls, body) -> Dict[str, Any]:
        """Get all stored preferences for the session."""
        key = cls.get_session_key(body)
        if not key:
            return {}
        if redis_available():
            return cls._redis_get(key, "user_prefs", {})
        return _SESSION_USER_PREFERENCES.get(key, {})

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

        if redis_available():
            profile = cls._redis_get(key, "accum_profile", {"entities_seen": {}, "query_count": 0})
        else:
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

        if redis_available():
            cls._redis_set(key, "accum_profile", profile)

    @classmethod
    def get_accumulated_profile(cls, body) -> Dict[str, Any]:
        """
        Get inferred user profile from accumulated entities.
        Returns most frequently mentioned preferences.
        """
        key = cls.get_session_key(body)
        if not key:
            return {}
        if redis_available():
            profile = cls._redis_get(key, "accum_profile", None)
            if not profile:
                return {}
        else:
            if key not in _SESSION_ACCUMULATED_PROFILE:
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
        if redis_available():
            existing = cls._redis_get(key, "interactions", [])
        else:
            if key not in _SESSION_INTERACTIONS:
                _SESSION_INTERACTIONS[key] = []
            existing = _SESSION_INTERACTIONS[key]

        # Add interaction with timestamp
        interaction = {
            "slug": slug,
            "action": action,
            "timestamp": datetime.now().isoformat(),
            "meta": meta or {}
        }

        # Prevent duplicate consecutive interactions for same slug
        if existing and existing[-1].get("slug") == slug and existing[-1].get("action") == action:
            existing[-1]["timestamp"] = datetime.now().isoformat()
        else:
            existing.append(interaction)

        # Keep only last 50 interactions to limit memory
        if len(existing) > 50:
            existing = existing[-50:]

        if redis_available():
            cls._redis_set(key, "interactions", existing)
        else:
            _SESSION_INTERACTIONS[key] = existing

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
        if redis_available():
            return cls._redis_get(key, "interactions", [])
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
        if redis_available():
            profile = cls._redis_get(key, "body_profile", {})
        else:
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
        
        profile["updated_at"] = datetime.now().isoformat()

        if redis_available():
            cls._redis_set(key, "body_profile", profile)

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
        if redis_available():
            return cls._redis_get(key, "body_profile", {})
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
        if redis_available():
            profile = cls._redis_get(key, "body_profile", {})
        else:
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

        if redis_available():
            cls._redis_set(key, "body_profile", profile)
    
    @classmethod
    def has_complete_body_profile(cls, body) -> bool:
        """Check if user has provided enough info for size recommendations."""
        profile = cls.get_body_profile(body)
        # Minimum: height and weight OR at least 2 usual sizes
        has_measurements = profile.get("height_cm") and profile.get("weight_kg")
        has_size_history = len(profile.get("usual_sizes", {})) >= 2
        return has_measurements or has_size_history
