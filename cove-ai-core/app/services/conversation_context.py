from __future__ import annotations

import logging
from typing import Dict

from app.services.conversation_manager import get_conversation_manager

log = logging.getLogger("cove.conversation_context")


async def resolve_query_with_context(body, query: str) -> Dict[str, str]:
    """
    Resolve a user query using recent conversation context.
    Falls back to the raw query if no session identity is available.
    """
    user_id = body.clerkUserId or body.guestSessionId
    if not user_id:
        log.warning("Missing clerkUserId/guestSessionId; disabling conversation context.")
        return {"resolved_query": query, "modification_type": "new_topic"}

    conv_manager = get_conversation_manager()
    conv_manager.add_message(user_id, "user", query)
    return await conv_manager.resolve_intent(user_id, query)
