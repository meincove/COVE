# cove-ai-core/app/history_logger.py
"""
Conversation history logging to Django backend.

This module provides helpers to log user and assistant messages
to the Django /ai_profiles/history/log/ endpoint.
"""

from __future__ import annotations

import logging
import os
from typing import Any, Dict, List, Optional

import httpx

log = logging.getLogger("cove.history")

# Configuration
DJANGO_BASE_URL = os.getenv("DJANGO_BASE_URL", "http://127.0.0.1:8001")
HISTORY_LOG_ENABLED = os.getenv("HISTORY_LOG_ENABLED", "true").lower() == "true"


async def log_history_event(
    *,
    role: str,
    kind: str,
    content: str,
    guest_session_id: str = "",
    clerk_user_id: str = "",
    email: str = "",
    meta: Optional[Dict[str, Any]] = None,
) -> None:
    """
    Send a single conversation event to Django history service.
    
    This is fire-and-forget: we log warnings but never break user flow.
    
    Args:
        role: "user" or "assistant"
        kind: High-level kind like "question", "answer", "recommendations", etc.
        content: Raw text message
        guest_session_id: Anonymous session ID
        clerk_user_id: Clerk user ID if logged in
        email: User email if available
        meta: Optional structured metadata
    """
    if not HISTORY_LOG_ENABLED:
        return
    
    if not content:
        log.warning("log_history_event called with empty content, skipping")
        return
    
    payload: Dict[str, Any] = {
        "guest_session_id": guest_session_id,
        "clerk_user_id": clerk_user_id,
        "email": email,
        "role": role,
        "kind": kind or "",
        "content": content,
        "meta": meta or {},
        "source": "cove-ai-core",
    }
    
    base = DJANGO_BASE_URL.rstrip("/")
    url = f"{base}/ai_profiles/history/log/"
    
    try:
        async with httpx.AsyncClient(timeout=3.0) as cx:
            resp = await cx.post(url, json=payload)
        if resp.status_code >= 300:
            log.warning(
                "history_log non-2xx (%s): %s",
                resp.status_code,
                resp.text[:200],
            )
    except Exception as e:
        log.warning("history_log failed: %s", e, exc_info=False)


async def log_history_turn(
    *,
    user_message: str,
    assistant_message: str,
    user_kind: str,
    assistant_kind: str,
    guest_session_id: str = "",
    clerk_user_id: str = "",
    email: str = "",
    user_meta: Optional[Dict[str, Any]] = None,
    assistant_meta: Optional[Dict[str, Any]] = None,
) -> None:
    """
    Log both the user message and the assistant reply as two events.
    
    This is called once per agent_query, right before returning the result.
    
    Args:
        user_message: User's input message
        assistant_message: Assistant's response
        user_kind: Intent kind for user message
        assistant_kind: Response kind ("answer", "recommendations", etc.)
        guest_session_id: Anonymous session ID
        clerk_user_id: Clerk user ID if logged in
        email: User email if available
        user_meta: Metadata for user message
        assistant_meta: Metadata for assistant message (items, filters, etc.)
    """
    # 1) Log user message
    await log_history_event(
        role="user",
        kind=user_kind,
        content=user_message,
        guest_session_id=guest_session_id,
        clerk_user_id=clerk_user_id,
        email=email,
        meta=user_meta,
    )
    
    # 2) Log assistant reply
    await log_history_event(
        role="assistant",
        kind=assistant_kind,
        content=assistant_message,
        guest_session_id=guest_session_id,
        clerk_user_id=clerk_user_id,
        email=email,
        meta=assistant_meta,
    )
