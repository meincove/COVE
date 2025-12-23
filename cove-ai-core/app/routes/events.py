from fastapi import APIRouter, Depends, BackgroundTasks
from pydantic import BaseModel
from typing import Optional, Dict, Any
from app.agents.proactive_agent import proactive_agent
import logging
log = logging.getLogger("cove.events")

router = APIRouter()

class EventIn(BaseModel):
    signal: str  # VIEW_BRAND, VIEW_PRODUCT, CART_IDLE
    context: Dict[str, Any] # { "brand": "nike", "url": "..." }
    user_id: Optional[str] = None
    session_id: Optional[str] = None

class EventOut(BaseModel):
    triggered: bool
    message: Optional[str] = None
    action: Optional[str] = None
    priority: int = 0

@router.post("/ai/events", response_model=EventOut)
async def handle_event(event: EventIn):
    """
    Ingest user signals and check for proactive triggers.
    """
    log.info(f"📡 Event received: {event.signal} from {event.user_id}")
    
    # Delegate to Proactive Agent
    response = await proactive_agent.handle_signal(
        signal=event.signal,
        context=event.context,
        user_id=event.user_id
    )
    
    return response
