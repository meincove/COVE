from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from app.agents.vto_agent import VTOAgent
import logging

router = APIRouter(prefix="/ai/vto", tags=["vto"])
log = logging.getLogger("cove.routes.vto")

class VTOItem(BaseModel):
    title: str
    imageUrl: Optional[str] = None
    type: Optional[str] = None
    slug: Optional[str] = None

class VTORequest(BaseModel):
    items: List[VTOItem]
    imageUrl: Optional[str] = None
    imageData: Optional[str] = None # Base64

@router.post("/generate")
async def generate_vto(body: VTORequest):
    """
    Generate a Virtual Try-On preview using the VTO Agent.
    """
    try:
        # Convert Pydantic models to dict for the agent
        task = {
            "items": [item.dict() for item in body.items],
            "imageUrl": body.imageUrl,
            "imageData": body.imageData
        }
        
        # Instantiate and run the agent directly
        # (Alternatively, could use registry, but direct is fine for a specific route)
        agent = VTOAgent("vto_direct")
        result = await agent.run(task, context={})
        
        if result.success and result.data.get("vto_image_url"):
            return {
                "ok": True,
                "vto_image_url": result.data["vto_image_url"],
                "reasoning": result.reasoning
            }
        else:
            return {
                "ok": False,
                "error": result.errors[0] if result.errors else "Unknown VTO error",
                "reasoning": result.reasoning
            }
            
    except Exception as e:
        log.exception("VTO generation failed")
        return {"ok": False, "error": str(e)}
