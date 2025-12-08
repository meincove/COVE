"""
Advanced Intent Classifier Test
Tests edge cases, slang, ambiguous queries, and context understanding
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))

from app.mcp_agents.intent_classifier.classifier import get_classifier


def test_advanced_intent_classifier():
    """Test advanced intent classification with edge cases"""
    
    classifier = get_classifier()
    
    # Expanded test cases with edge cases
    test_cases = [
        # Basic (should still work)
        ("show me hoodies", "recommendations"),
        ("add to cart", "cart_proposal"),
        
        # Slang & Informal
        ("cop this", "cart_proposal"),  # Slang for "buy"
        ("lemme get that black one", "cart_proposal"),
        ("I need this rn", "cart_proposal"),  # "right now"
        ("what u got in hoodies", "recommendations"),  # Informal
        
        # Indirect/Implicit
        ("I like this", "cart_proposal"),  # Implies wants to buy
        ("perfect", "cart_proposal"),  # After seeing product
        ("not sure about the size", "size_help"),
        ("will it shrink", "quality_question"),
        ("is it worth it", "quality_question"),
        
        # Urgency/Context
        ("need it asap", "checkout_ready"),
        ("how fast can I get this", "checkout_ready"),
        ("let's do this", "checkout_ready"),
        
        # Ambiguous 
        ("what about size", "size_help"),
        ("colors?", "recommendations"),  # Wants to see color options
        ("more like this", "recommendations"),
        
        # Multilingual
        ("j'adore ça", "cart_proposal"),  # French: "I love this"
        ("me gusta", "cart_proposal"),  # Spanish: "I like it"
        ("das nehme ich", "cart_proposal"),  # German: "I'll take it"
        
        # Order tracking (various phrasings)
        ("my package", "order_history"),
        ("where's my stuff", "order_history"),
        ("when will it arrive", "order_history"),
        ("track this", "order_history"),
        
        # Edge Cases
        ("", "none"),  # Empty
        ("asdfghjkl", "none"),  # Random
        ("what's the weather", "none"),  # Off-topic
        ("hey", "greeting"),
        ("sup", "greeting"),
    ]
    
    print("🧪 Advanced Intent Classifier Test\n")
    print("=" * 90)
    print(f"{'Query':<35} {'Expected':<20} {'Got':<20} {'Confidence':<12} Status")
    print("=" * 90)
    
    correct = 0
    total = len(test_cases)
    
    for query, expected_intent in test_cases:
        try:
            result = classifier.classify(query if query else ".")
            intent = result["intent"]
            confidence = result["confidence"]
            method = result["classification_method"]
            
            is_correct = intent == expected_intent
            correct += 1 if is_correct else 0
            
            status = "✅" if is_correct else "❌"
            query_display = query[:33] if query else "(empty)"
            print(f"{query_display:<35} {expected_intent:<20} {intent:<20} {confidence:>6.1%} [{method[0]}]  {status}")
            
        except Exception as e:
            print(f"{query[:33]:<35} ERROR: {str(e)[:40]}")
    
    print("=" * 90)
    accuracy = correct / total
    print(f"\n📊 Results: {accuracy:.1%} accuracy ({correct}/{total} correct)")
    print(f"🎯 Target: >90% (Industry benchmark)")
    print(f"🚀 Advanced: >95% (Exceptional)")
    
    if accuracy >= 0.95:
        print("\n✨ EXCEPTIONAL - Production ready!")
    elif accuracy >= 0.9:
        print("\n✅ GOOD - Ready for production")
    elif accuracy >= 0.8:
        print("\n⚠️  ACCEPTABLE - Consider fine-tuning")
    else:
        print("\n❌ NEEDS WORK - Requires prompt improvement")
    
    return accuracy


if __name__ == "__main__":
    accuracy = test_advanced_intent_classifier()
    exit(0 if accuracy >= 0.9 else 1)
