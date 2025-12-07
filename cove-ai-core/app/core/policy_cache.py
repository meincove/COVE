# app/core/policy_cache.py
"""
Static policy answer cache for common questions.

Pre-computed answers for frequently asked policy questions.
Provides instant responses without LLM calls.
"""
from typing import Optional, Dict, List

# Static policy answers with keyword matching
POLICY_ANSWERS: Dict[str, Dict[str, any]] = {
    "shipping_time": {
        "answer": "We offer 2-5 business days shipping within the EU, and 5-10 business days worldwide. All orders are dispatched within 24 hours.",
        "keywords": ["shipping", "delivery", "how long", "when will", "arrive", "dispatch", "send"]
    },
    "return_policy": {
        "answer": "30-day return policy. Items must be unworn with tags attached. Free returns within EU. We'll issue a full refund within 5-7 business days of receiving your return.",
        "keywords": ["return", "refund", "exchange", "send back", "money back", "change mind"]
    },
    "wash_care": {
        "answer": "Machine wash cold (30°C max), tumble dry low. Do not bleach. Iron on low heat if needed. Our premium cotton maintains its quality wash after wash.",
        "keywords": ["wash", "care", "clean", "shrink", "washing", "laundry", "machine wash"]
    },
    "sizing": {
        "answer": "Our items fit true to size. Check our size guide for detailed measurements. Free size exchanges if your first choice doesn't fit perfectly.",
        "keywords": ["size guide", "measurements", "sizing chart", "true to size", "fit guide"]
    },
    "materials": {
        "answer": "We use premium 100% combed cotton for softness and durability. All materials are ethically sourced and OEKO-TEX certified.",
        "keywords": ["material", "fabric", "cotton", "quality", "what is it made"]
    },
    "tracking": {
        "answer": "You'll receive a tracking number via email once your order ships. Track your package in real-time through the link in your confirmation email.",
        "keywords": ["track", "tracking", "where is my", "order status", "track order"]
    }
}


def get_policy_answer(query: str) -> Optional[str]:
    """
    Check if query matches a known policy question.
    
    Args:
        query: User's question
        
    Returns:
        Pre-computed answer if matched, None otherwise
    """
    query_lower = query.lower()
    
    # Check each policy for keyword matches
    for policy_id, policy in POLICY_ANSWERS.items():
        keywords: List[str] = policy["keywords"]
        
        # Match if any keyword found
        if any(kw in query_lower for kw in keywords):
            return policy["answer"]
    
    return None


def get_all_policy_keywords() -> List[str]:
    """Get all policy keywords for reference."""
    all_keywords = []
    for policy in POLICY_ANSWERS.values():
        all_keywords.extend(policy["keywords"])
    return sorted(set(all_keywords))
