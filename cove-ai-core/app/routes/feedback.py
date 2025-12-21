from fastapi import APIRouter, Depends, HTTPException, Body
from typing import Dict, Any, Optional
from pydantic import BaseModel
import logging

from app.services.feedback_manager import get_feedback_manager, FeedbackManager

router = APIRouter()
log = logging.getLogger(__name__)

class FeedbackRequest(BaseModel):
    user_id: str
    event_type: str  # click, like, purchase, reject
    item_metadata: Dict[str, Any]  # product details

@router.post("/feedback")
async def process_feedback(
    payload: FeedbackRequest,
    manager: FeedbackManager = Depends(get_feedback_manager)
):
    """
    Process implicit user feedback (clicks, etc.) to refine user profile.
    """
    if not payload.user_id:
        raise HTTPException(status_code=400, detail="Missing user_id")
        
    try:
        result = await manager.process_feedback(
            user_id=payload.user_id,
            event_type=payload.event_type,
            item_metadata=payload.item_metadata
        )
        return result
    except Exception as e:
        log.error(f"Feedback endpoint error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
