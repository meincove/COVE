
import pytest
from app.core.vibe_translator import VibeTranslator

@pytest.mark.asyncio
async def test_vibe_translator_logic():
    """
    Test that VibeTranslator correctly identifies vibes and returns keywords.
    """
    # Test 1: explicit match
    query = "I want a mob wife aesthetic outfit"
    keywords = VibeTranslator.translate(query)
    print(f"\nQuery: '{query}'\nKeywords: {keywords}")
    
    assert "leopard" in keywords
    assert "gold" in keywords
    assert "faux fur" in keywords or "oversized" in keywords

    # Test 2: Case insensitivity
    query = "give me that Y2K look"
    keywords = VibeTranslator.translate(query)
    print(f"\nQuery: '{query}'\nKeywords: {keywords}")
    
    assert "baby tee" in keywords or "mini skirt" in keywords or "metallic" in keywords

    # Test 3: No match
    query = "business casual meeting"
    keywords = VibeTranslator.translate(query)
    print(f"\nQuery: '{query}'\nKeywords: {keywords}")
    
    assert len(keywords) == 0

@pytest.mark.asyncio
async def test_vibe_translator_taxonomy_integrity():
    """
    Ensure all defined vibes have non-empty keyword lists.
    """
    vibes = VibeTranslator.get_supported_vibes()
    print(f"\nSupported Vibes: {vibes}")
    
    assert "mob wife" in vibes
    assert "office siren" in vibes
    assert "gorpcore" in vibes
    
    for vibe in vibes:
        assert len(VibeTranslator.TAXONOMY[vibe]) > 0
