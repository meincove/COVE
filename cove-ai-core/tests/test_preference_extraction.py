#!/usr/bin/env python3
"""
Test Preference Extraction
Verifies LLM can parse user statements correctly
"""

import asyncio
import sys
import os
sys.path.insert(0, '/Users/ssg/Desktop/COVE/cove-ai-core')

from dotenv import load_dotenv
load_dotenv('/Users/ssg/Desktop/COVE/cove-ai-core/.env')

from app.agents.preference_extractor import PreferenceExtractor


async def test_preference_extraction():
    """Test extraction with various statements"""
    
    print("=" * 80)
    print("TESTING PREFERENCE EXTRACTION")
    print("=" * 80)
    print()
    
    extractor = PreferenceExtractor()
    
    test_statements = [
        "I hate hoodies, they make me look sloppy",
        "I love navy and black colors",
        "I prefer slim fit clothing",
        "Need professional outfits for office meetings",
        "Avoid bright colors and patterns",
        "I'm into minimalist style, nothing flashy",
        "Blazers are my favorite, especially dark ones"
    ]
    
    for statement in test_statements:
        print(f"📝 Statement: '{statement}'")
        print("-" * 40)
        
        try:
            prefs = await extractor.extract(statement)
            
            print(f"   Colors: {prefs['colors']}")
            print(f"   Likes: {prefs['likes']}")
            print(f"   Dislikes: {prefs['dislikes']}")
            print(f"   Styles: {prefs['styles']}")
            print(f"   Formality: {prefs['formality']}")
            print(f"   Occasions: {prefs['occasions']}")
            print(f"   Confidence: {prefs['confidence']:.2f}")
            print()
            
        except Exception as e:
            print(f"   ❌ Failed: {e}")
            print()
    
    # Test categorization
    print("=" * 80)
    print("TESTING CATEGORIZATION")
    print("=" * 80)
    print()
    
    statement = "I prefer slim fit blazers in navy, avoid hoodies"
    print(f"Statement: '{statement}'")
    print()
    
    categorized = await extractor.extract_and_categorize(statement)
    print("Categorized Output:")
    for key, value in categorized.items():
        print(f"   {key}: {value}")
    
    print()
    print("=" * 80)
    print("✅ EXTRACTION TEST COMPLETE")
    print("=" * 80)


if __name__ == "__main__":
    asyncio.run(test_preference_extraction())
