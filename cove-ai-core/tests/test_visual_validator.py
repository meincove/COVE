#!/usr/bin/env python3
"""
Test VisualValidator
Verifies GPT-4o Vision analysis of outfit images
"""

import asyncio
import sys
import os
sys.path.insert(0, '/Users/ssg/Desktop/COVE/cove-ai-core')

from dotenv import load_dotenv
load_dotenv('/Users/ssg/Desktop/COVE/cove-ai-core/.env')

from app.agents.visual_validator import VisualValidator


async def test_visual_validation():
    """Test visual analysis of mock outfits"""
    
    print("=" * 80)
    print("TESTING VISUAL VALIDATOR (GPT-4o)")
    print("=" * 80)
    print()
    
    validator = VisualValidator()
    
    # 1. Good Outfit (Mock URLs - assume GPT-4o can access them or handle placeholder behavior)
    # Using real-ish Placehold.co images for color testing if real URLs fail
    # But for now, let's use some example public URLs if possible, or expect failure if mostly checks URL reachability
    
    # NOTE: GPT-4o Vision needs actual accessible URLs. 
    # Using reliable static placeholders for color testing.
    
    good_outfit = [
        {
            "title": "Navy Blue Blazer",
            "image_url": "https://placehold.co/400x500/000080/FFFFFF/png?text=Navy+Blazer"
        },
        {
            "title": "White Dress Shirt",
            "image_url": "https://placehold.co/400x500/FFFFFF/000000/png?text=White+Shirt"
        },
        {
            "title": "Grey Trousers",
            "image_url": "https://placehold.co/400x500/808080/FFFFFF/png?text=Grey+Trousers"
        }
    ]
    
    print("👔 Testing Harmonious Outfit (Navy + White + Grey)...")
    result = await validator.validate_outfit(good_outfit)
    print(f"   Score: {result['score']}")
    print(f"   Critique: {result['critique']}")
    print("-" * 40)
    
    # 2. Clashing Outfit
    bad_outfit = [
        {
            "title": "Neon Green Hoodie",
            "image_url": "https://placehold.co/400x500/39FF14/000000/png?text=Neon+Green+Hoodie"
        },
        {
            "title": "Red Plaid Pants",
            "image_url": "https://placehold.co/400x500/FF0000/000000/png?text=Red+Plaid+Pants"
        },
        {
            "title": "Purple Hat",
            "image_url": "https://placehold.co/400x500/800080/FFFFFF/png?text=Purple+Hat"
        }
    ]
    
    print("\n🤡 Testing Clashing Outfit (Neon Green + Red + Purple)...")
    result = await validator.validate_outfit(bad_outfit)
    print(f"   Score: {result['score']}")
    print(f"   Critique: {result['critique']}")
    
    print("\n" + "=" * 80)


if __name__ == "__main__":
    asyncio.run(test_visual_validation())
