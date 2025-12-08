# app/core/events.py
"""
Event emission system for real-time agent progress.
Thread-safe, async-compatible, zero overhead when not streaming.
"""
from typing import Callable, Optional, Dict, Any
from contextvars import ContextVar

# Thread-safe context variable for event emitter
_event_emitter: ContextVar[Optional[Callable]] = ContextVar('event_emitter', default=None)


def set_event_emitter(emitter: Callable[[str, Dict[str, Any]], None]) -> None:
    """
    Set event emitter for current async context.
    Used by streaming endpoints to capture agent events.
    
    Args:
        emitter: Function that takes (event_type, data) and handles the event
    """
    _event_emitter.set(emitter)


def emit_event(event_type: str, data: Dict[str, Any]) -> None:
    """
    Emit event if emitter is set in current context.
    Silently does nothing if no emitter (regular non-streaming requests).
    
    Args:
        event_type: Type of event (e.g., 'thinking:step', 'progress')
        data: Event data dictionary
    """
    emitter = _event_emitter.get()
    if emitter is not None:
        try:
            emitter(event_type, data)
        except Exception:
            # Don't let event emission break the request
            pass


def clear_event_emitter() -> None:
    """Clear event emitter from current context."""
    _event_emitter.set(None)


def has_event_emitter() -> bool:
    """Check if event emitter is set (i.e., we're streaming)."""
    return _event_emitter.get() is not None
