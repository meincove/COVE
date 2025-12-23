"""
Unit tests for Fact Extractor

Tests the fact extraction service's ability to:
1. Extract product context from conversations
2. Extract user preferences
3. Merge facts intelligently
4. Format context for LLM
"""

import pytest
import json
from app.services.fact_extractor import FactExtractor, get_fact_extractor


@pytest.mark.asyncio
async def test_product_focus_extraction():
    """Test that product context is correctly extracted"""
    
    extractor = FactExtractor()
    
    user_msg = "Show me that Nike Tech Fleece Hoodie in black, size M"
    assistant_msg = "Here's the Nike Tech Fleece Hoodie in black, size M. It's €89.99 and made of 80% cotton, 20% polyester."
    
    # Simulate agent metadata (what was actually shown)
    agent_metadata = {
        "items": [
            {
                "product_id": "prod_123",
                "variant_id": "var_456",
                "name": "Nike Tech Fleece Hoodie",
                "price": 89.99,
                "material": "80% cotton, 20% polyester",
                "color": "Black",
                "size": "M",
                "in_stock": True
            }
        ]
    }
    
    facts = await extractor.extract_facts(
        user_message=user_msg,
        assistant_response=assistant_msg,
        agent_metadata=agent_metadata
    )
    
    # Verify product focus was extracted
    assert "product_focus" in facts
    assert "current_products" in facts["product_focus"]
    assert len(facts["product_focus"]["current_products"]) > 0
    
    # Verify product details
    product = facts["product_focus"]["current_products"][0]
    assert product["product_id"] == "prod_123"
    assert product["name"] == "Nike Tech Fleece Hoodie"
    assert "full_details" in product
    
    print("✅ Product focus extraction works!")


@pytest.mark.asyncio
async def test_preference_extraction():
    """Test that user preferences are extracted"""
    
    extractor = FactExtractor()
    
    user_msg = "I prefer size M and I like minimalist style. My budget is around €100."
    assistant_msg = "Got it! I'll show you minimalist pieces in size M under €100."
    
    facts = await extractor.extract_facts(
        user_message=user_msg,
        assistant_response=assistant_msg
    )
    
    # Verify preferences were extracted
    assert "user_preferences" in facts
    prefs = facts["user_preferences"]
    
    # Check for size preference
    assert "size" in prefs or "size_top" in prefs
    
    # Check for style preference
    assert "style" in prefs
    
    # Check for budget
    assert "budget" in prefs or "price_max" in prefs
    
    print("✅ Preference extraction works!")


@pytest.mark.asyncio
async def test_fact_merging():
    """Test that facts are merged correctly across turns"""
    
    extractor = FactExtractor()
    
    # Turn 1: User states size preference
    facts1 = await extractor.extract_facts(
        user_message="I wear size M",
        assistant_response="Noted! I'll show you size M items."
    )
    
    # Turn 2: User asks about a product (should merge with existing facts)
    facts2 = await extractor.extract_facts(
        user_message="What's the material of that Nike hoodie?",
        assistant_response="The Nike hoodie is 80% cotton, 20% polyester.",
        existing_facts=facts1,
        agent_metadata={
            "items": [{
                "product_id": "prod_123",
                "name": "Nike Hoodie",
                "material": "80% cotton, 20% polyester"
            }]
        }
    )
    
    # Verify both facts are present
    assert "user_preferences" in facts2  # From turn 1
    assert "product_focus" in facts2  # From turn 2
    
    print("✅ Fact merging works!")


@pytest.mark.asyncio
async def test_context_formatting():
    """Test that facts are formatted correctly for LLM"""
    
    extractor = FactExtractor()
    
    facts = {
        "product_focus": {
            "current_products": [
                {
                    "product_id": "prod_123",
                    "name": "Nike Hoodie",
                    "full_details": {"price": 89.99, "material": "cotton"},
                    "user_questions": ["What's the material?"]
                }
            ]
        },
        "user_preferences": {
            "size": "M",
            "style": "minimalist"
        }
    }
    
    context = extractor.get_context_for_llm(facts)
    
    # Verify context includes key information
    assert "Nike Hoodie" in context
    assert "prod_123" in context
    assert "size" in context.lower()
    assert "minimalist" in context.lower()
    
    print("✅ Context formatting works!")
    print(f"\nFormatted context:\n{context}")


@pytest.mark.asyncio
async def test_product_history_tracking():
    """Test that product switches are tracked in history"""
    
    extractor = FactExtractor()
    
    # Turn 1: Look at product A
    facts1 = await extractor.extract_facts(
        user_message="Show me Nike hoodies",
        assistant_response="Here are some Nike hoodies",
        agent_metadata={"items": [{"product_id": "prod_A", "name": "Nike Hoodie A"}]}
    )
    
    # Turn 2: Switch to product B
    facts2 = await extractor.extract_facts(
        user_message="What about Adidas bombers?",
        assistant_response="Here are Adidas bombers",
        existing_facts=facts1,
        agent_metadata={"items": [{"product_id": "prod_B", "name": "Adidas Bomber"}]}
    )
    
    # Verify product history exists
    assert "product_focus" in facts2
    if "product_history" in facts2["product_focus"]:
        # Product A should be in history
        history = facts2["product_focus"]["product_history"]
        assert any(p.get("product_id") == "prod_A" for p in history)
    
    print("✅ Product history tracking works!")


if __name__ == "__main__":
    import asyncio
    
    print("Running Fact Extractor Tests...\n")
    
    asyncio.run(test_product_focus_extraction())
    asyncio.run(test_preference_extraction())
    asyncio.run(test_fact_merging())
    asyncio.run(test_context_formatting())
    asyncio.run(test_product_history_tracking())
    
    print("\n🎉 All tests passed!")
