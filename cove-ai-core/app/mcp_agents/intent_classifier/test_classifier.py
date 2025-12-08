"""
Test Intent Classifier
Validates LLM + embedding hybrid classification
"""

import asyncio
from app.mcp_agents.intent_classifier import get_classifier


async def test_intent_classifier():
    """Test intent classification"""
    
    classifier = get_classifier()
    
    test_cases = [
        # English
        ("show me hoodies", "recommendations"),
        ("add to cart", "cart_proposal"),
        ("checkout", "checkout_ready"),
        ("where is my order", "order_history"),
        ("what size should I get", "size_help"),
        ("what's the quality like", "quality_question"),
        ("hello", "greeting"),
        
        # French
        ("montre-moi des sweats", "recommendations"),
        ("ajouter au panier", "cart_proposal"),
        
        # Spanish
        ("enséñame sudaderas", "recommendations"),
        ("pagar", "checkout_ready"),
        
        # German
        ("zeig mir Hoodies",  "recommendations"),
        ("in den Warenkorb", "cart_proposal"),
        
        # Edge cases
        ("idk what I want", "recommendations"),  # Vague but shopping intent
        ("hoodie pls", "recommendations"),  # Slang
        ("what's the weather", "none"),  # Off-topic
    ]
    
    print("🧪 Testing Intent Classifier\n")
    print("=" * 80)
    
    correct = 0
    total = len(test_cases)
    
    for query, expected_intent in test_cases:
        result = classifier.classify(query)
        intent = result["intent"]
        confidence = result["confidence"]
        method = result["classification_method"]
        
        is_correct = intent == expected_intent
        correct += 1 if is_correct else 0
        
        status = "✅" if is_correct else "❌"
        print(f"{status} {query:30} → {intent:20} ({confidence:.2%}) [{method}]")
        
        if not is_correct:
            print(f"   Expected: {expected_intent}")
    
    print("=" * 80)
    accuracy = correct / total
    print(f"\n📊 Accuracy: {accuracy:.1%} ({correct}/{total})")
    print(f"🎯 Target: >90% (Industry standard)")
    
    if accuracy >= 0.9:
        print("✅ PASS - Ready for production!")
    else:
        print("❌ FAIL - Needs tuning")


if __name__ == "__main__":
    asyncio.run(test_intent_classifier())
