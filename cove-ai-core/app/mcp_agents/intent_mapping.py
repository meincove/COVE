"""
Intent Mapping for Orchestrator Integration
Maps LLM-based semantic intents to orchestrator intent kinds
"""

# Mapping from intelligent classifier intents to orchestrator intent kinds
INTENT_MAPPING = {
    # Our semantic intents → Orchestrator intents
    "recommendations": "discover",  # Product browsing/discovery
    "cart_proposal": "cart_add",    # Add to cart intent
    "checkout_ready": "checkout_start",  # Ready to pay
    "order_history": "order_query",  # Order tracking
    "size_help": "size_fit",        # Sizing questions
    "quality_question": "generic",   # Product quality/materials
    "answer": "generic",            # General questions
    "greeting": "greeting",         # Greetings
    "none": "unknown",              # Off-topic/unknown
}


def map_semantic_intent_to_orchestrator(semantic_intent: str) -> str:
    """
    Map semantic intent from LLM classifier to orchestrator intent kind
    
    Args:
        semantic_intent: Intent from intelligent classifier
            (recommendations, cart_proposal, checkout_ready, etc.)
    
    Returns:
        orchestrator intent kind (discover, cart_add, checkout_start, etc.)
    """
    return INTENT_MAPPING.get(semantic_intent, "generic")
