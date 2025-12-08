"""
Simple test for intent classifier core (without MCP)
"""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))

from app.mcp_agents.intent_classifier.classifier import get_classifier


def test_intent_classifier():
    """Test intent classification"""
    
    classifier = get_classifier()
    
    test_cases = [
        # English
        ("show me hoodies", "recommendations"),
        ("add to cart", "cart_proposal"),
        ("checkout", "checkout_ready"),
        ("where is my order", "order_history"),
        
        # Multilingual
        ("montre-moi des sweats", "recommendations"),
        ("ajouter au panier", "cart_proposal"),
    ]
    
    print("🧪 Testing Intent Classifier (LiteLLM + openrouter)\n")
    print("=" * 80)
    
    for query, expected_intent in test_cases:
        try:
            result = classifier.classify(query)
            intent = result["intent"]
            confidence = result["confidence"]
            method = result["classification_method"]
            
            is_correct = intent == expected_intent
            status = "✅" if is_correct else "❌"
            print(f"{status} {query:30} → {intent:20} ({confidence:.2%}) [{method}]")
            
            if not is_correct:
                print(f"   Expected: {expected_intent}")
        except Exception as e:
            print(f"❌ {query:30} → ERROR: {e}")
    
    print("=" * 80)


if __name__ == "__main__":
    test_intent_classifier()
