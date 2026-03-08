"""
Intent Mapping for Orchestrator Integration
Maps LLM-based semantic intents to orchestrator intent kinds
"""

# Mapping from intelligent classifier intents to orchestrator intent kinds
INTENT_MAPPING = {
    # Our semantic intents → Orchestrator intents
    "recommendations": "discover",  # Product browsing/discovery
    "outfit_builder": "agent_stylist", # Build complete outfits
    "show_more": "discover",        # User wants more of same - treat as discovery
    "cart_proposal": "cart_add",    # Add to cart intent
    "checkout_ready": "checkout_start",  # Ready to pay
    "order_history": "order_query",  # Order tracking
    "size_help": "size_fit",        # Sizing questions
    "quality_question": "generic",   # Product quality/materials
    "answer": "generic",            # General questions
    "greeting": "greeting",         # Greetings
    "none": "unknown",              # Off-topic/unknown
}


def map_semantic_intent_to_orchestrator(semantic_intent: str, query: str = "", entities: dict = None) -> str:
    """
    Map semantic intent from LLM classifier to orchestrator intent kind
    
    Args:
        semantic_intent: Intent from intelligent classifier
            (recommendations, cart_proposal, checkout_ready, etc.)
        query: Optional raw user query for keyword-based refinement
        entities: Optional extracted entities/filters
    
    Returns:
        orchestrator intent kind (discover, cart_add, checkout_start, etc.)
    """
    # 1. Direct Mapping
    kind = INTENT_MAPPING.get(semantic_intent, "generic")
    
    # 2. Refinement: If intent is recommendations but query mentions "outfit", promote to stylist
    if kind == "discover":
        q_lower = query.lower()
        if "outfit" in q_lower or "look" in q_lower or "style" in q_lower:
            # Check for "look" as noun, not "look for"
            if "outfit" in q_lower or ("look" in q_lower and "looking for" not in q_lower):
                return "agent_stylist"
        
        # Check entities
        if entities and entities.get("type") == "outfit":
            return "agent_stylist"
            
    return kind
