
import json
from pathlib import Path
from typing import Any, Dict, List, Optional, Literal, ClassVar
from pydantic import BaseModel, Field, validator

class AgentIn(BaseModel):
    message: str
    top_k: int = 6

    # optional context for cart + user
    cartId: Optional[str] = None
    clerkUserId: Optional[str] = None
    guestSessionId: Optional[str] = None
    sessionType: Optional[str] = "main"  # NEW: "main", "outfit_builder", "cart"
    email: Optional[str] = None
    
    # Message history for context (list of {role, content})
    history: Optional[List[Dict[str, str]]] = None

    # how much per-user history to use in the LLM fallback
    # "user" = normal behavior, "none" = treat as fresh chat turn
    historyScope: Literal["user", "session", "none"] = "user"
    
    # Config-driven validation (cached)
    _validation_config: ClassVar[Optional[dict]] = None
    
    @classmethod
    def get_validation_config(cls) -> dict:
        """Load validation config once and cache it"""
        if cls._validation_config is None:
            # Path from agent.py: .../cove-ai-core/app/schemas/agent.py
            # Need to go up 3 levels: schemas -> app -> cove-ai-core -> data
            config_path = Path(__file__).resolve().parent.parent.parent / "data" / "validation_config.json"
            with open(config_path) as f:
                cls._validation_config = json.load(f)
        return cls._validation_config
    
    @validator('message')
    def validate_message(cls, v: str) -> str:
        """Config-driven message validation - no hardcoded rules"""
        config = cls.get_validation_config()['query_validation']['message']
        errors = cls.get_validation_config()['error_messages']
        
        # Handle None explicitly (config-driven)
        if v is None:
            if not config.get('allow_null', False):
                raise ValueError(errors['empty_message'])
            return None
        
        # Trim if configured
        if config.get('trim_before_validation', True) and v:
            v = v.strip()
        
        # Check empty/whitespace (config-driven)
        if not config.get('allow_whitespace_only', False):
            if not v or not v.strip():
                raise ValueError(errors['empty_message'])
        
        # Check length (config-driven limits)
        max_len = config.get('max_length', 5000)
        if len(v) > max_len:
            raise ValueError(errors['message_too_long'].format(max_length=max_len))
        
        return v
    
    @validator('top_k')
    def validate_top_k(cls, v: int) -> int:
        """Config-driven top_k validation - no hardcoded limits"""
        config = cls.get_validation_config()['query_validation']['top_k']
        errors = cls.get_validation_config()['error_messages']
        
        min_val = config.get('min', 1)
        max_val = config.get('max', 100)
        
        # Config-driven boundary check
        if v < min_val or v > max_val:
            raise ValueError(errors['invalid_top_k'].format(min=min_val, max=max_val))
        
        return v


class AgentItem(BaseModel):
    title: str
    url: str
    slug: str
    score: Optional[float] = None
    reason: Optional[str] = None
    type: Optional[str] = None
    tier: Optional[str] = None
    color: Optional[str] = None
    size: Optional[str] = None
    variantId: Optional[str] = None
    price: Optional[float] = None  # Product price for display
    imageUrl: Optional[str] = None  # ✨ PHASE 6: Product image URL
    outfit_id: Optional[str] = None  # ✨ PHASE 7: Multi-outfit grouping (e.g. "outfit_1")
    
    # Rich product details for fact extraction (match RecItem)
    material: Optional[str] = None
    fit: Optional[str] = None
    fabric: Optional[Dict[str, Any]] = None
    care: Optional[Dict[str, Any]] = None
    style: Optional[Dict[str, Any]] = None
    description: Optional[str] = None
    styleNotes: Optional[str] = None
    fitNotes: Optional[str] = None


class AgentStatus(BaseModel):
    """Status updates to show agent's thinking process"""
    kind: Literal["status"]
    status: Literal[
        "searching",
        "analyzing",
        "reasoning",
        "comparing",
        "recommending",
        "adding_to_cart",
        "creating_checkout"
    ]
    message: str
    details: Optional[str] = None


class AgentOut(BaseModel):
    kind: Literal["answer", "recommendations", "cart_proposal", "checkout_ready"]
    answer: str
    citations: List[Dict[str, Any]] = Field(default_factory=list)
    items: List[AgentItem] = Field(default_factory=list)
    cart_payload: Optional[Dict[str, Any]] = None
    checkout: Optional[Dict[str, Any]] = None  # Week 4: For checkout_ready responses
    thinking_steps: Optional[List[Dict[str, str]]] = None  # Week 4: Agentic - Show reasoning
    debug_plan: Optional[Dict[str, Any]] = None
    # Phase 1: Agentic enhancements - Detailed thinking display (feature-flagged)
    thinking_events: Optional[List[Dict[str, Any]]] = None  # Detailed AI reasoning steps
    tools_used: Optional[List[Dict[str, Any]]] = None  # Tools called with duration/results
    suggestions: Optional[List[str]] = None  # NEW: Drive Forward suggestions (follow-ups)
    # Interactive question options for conversation flow
    question_options: Optional[Dict[str, Any]] = None  # {input_type, options, allow_custom, slider_config}


class AgentCartAddIn(BaseModel):
    variantId: str
    size: Optional[str] = None  # Allow None for cart proposals without size
    quantity: int = 1

    cartId: Optional[str] = None
    clerkUserId: Optional[str] = None
    guestSessionId: Optional[str] = None
    email: Optional[str] = None
    idempotencyKey: Optional[str] = None
    retry_count: int = 0  # CRAG: Prevent infinite loops


class AgentCartAddOut(BaseModel):
    ok: bool
    message: str
    cart: Dict[str, Any]
    cartId: Optional[str] = None
    items: List[Dict[str, Any]] = Field(default_factory=list)
