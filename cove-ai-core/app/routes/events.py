from fastapi import APIRouter, Depends, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, Dict, Any
from app.agents.proactive_agent import proactive_agent
from app.services.session_state import SessionStateManager
import logging
log = logging.getLogger("cove.events")

router = APIRouter()

class EventIn(BaseModel):
    signal: str  # VIEW_BRAND, VIEW_PRODUCT, CART_IDLE, CLICK_PRODUCT, CART_ADD
    context: Dict[str, Any] # { "brand": "nike", "url": "...", "slug": "..." }
    user_id: Optional[str] = None
    session_id: Optional[str] = None
    guest_id: Optional[str] = None  # For session tracking

class EventOut(BaseModel):
    triggered: bool
    message: Optional[str] = None
    action: Optional[str] = None
    priority: int = 0

# Map event signals to interaction actions
_SIGNAL_TO_ACTION = {
    "VIEW_PRODUCT": "VIEW",
    "CLICK_PRODUCT": "CLICK",
    "CART_ADD": "CART_ADD",
    "PURCHASE": "PURCHASE",
}

@router.post("/ai/events", response_model=EventOut)
async def handle_event(event: EventIn):
    """
    Ingest user signals and check for proactive triggers.
    Also tracks interactions for real-time personalization.
    """
    log.info(f"📡 Event received: {event.signal} from {event.user_id or event.guest_id}")
    
    # Track product interactions for session-level personalization
    if event.signal in _SIGNAL_TO_ACTION:
        slug = event.context.get("slug") or event.context.get("product_slug")
        if slug:
            # Create a mock body for SessionStateManager
            mock_body = type('obj', (object,), {
                'guest_id': event.guest_id,
                'user_id': event.user_id,
                'session_id': event.session_id
            })()
            
            action = _SIGNAL_TO_ACTION[event.signal]
            SessionStateManager.track_product_interaction(
                body=mock_body,
                slug=slug,
                action=action,
                meta={
                    "brand": event.context.get("brand"),
                    "type": event.context.get("type"),
                    "price": event.context.get("price"),
                }
            )
            log.info(f"📊 Tracked {action} interaction for slug: {slug}")
    
    # Delegate to Proactive Agent for trigger evaluation
    response = await proactive_agent.handle_signal(
        signal=event.signal,
        context=event.context,
        user_id=event.user_id
    )
    
    return response
