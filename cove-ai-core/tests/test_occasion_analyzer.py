#!/usr/bin/env python3
"""
Test OccasionAnalyzer Phase 1.5 implementation
Tests different scenarios to verify Claude's reasoning works
"""

import asyncio
import sys
import os

# Add parent directory to path
sys.path.insert(0, '/Users/ssg/Desktop/COVE/cove-ai-core')

from app.agents.occasion_analyzer import OccasionAnalyzer


async def test_occasion_analyzer():
    """Test OccasionAnalyzer with different scenarios"""
    
    analyzer = OccasionAnalyzer()
    
    test_cases = [
        {
            "name": "Conservative Law Firm",
            "occasion": "conservative law firm happy hour",
            "budget": 250,
            "expected_formality": "7-9",
            "expected_pieces": "3-4"
        },
        {
            "name": "Gym Workout",
            "occasion": "gym workout",
            "budget": 80,
            "expected_formality": "1-2",
            "expected_pieces": "2"
        },
        {
            "name": "Beach Wedding",
            "occasion": "beach wedding in July",
            "budget": 350,
            "expected_formality": "6-8",
            "expected_pieces": "3-4"
        },
        {
            "name": "Startup Pitch",
            "occasion": "startup pitch to investors",
            "budget": 200,
            "expected_formality": "5-7",
            "expected_pieces": "3"
        },
        {
            "name": "Casual Date",
            "occasion": "casual date night",
            "budget": 120,
            "expected_formality": "4-6",
            "expected_pieces": "2-3"
        }
    ]
    
    print("=" * 80)
    print("TESTING OCCASIONANALYZER - PHASE 1.5")
    print("=" * 80)
    print()
    
    results = []
    
    for test in test_cases:
        print(f"🧪 TEST: {test['name']}")
        print(f"   Occasion: {test['occasion']}")
        print(f"   Budget: €{test['budget']}")
        print()
        
        try:
            analysis = await analyzer.analyze(
                occasion=test['occasion'],
                budget=test['budget']
            )
            
            formality = analysis.get('formality', 'N/A')
            complexity = analysis.get('outfit_complexity', 'N/A')
            categories = analysis.get('required_categories', [])
            budget_allocation = analysis.get('budget_allocation', {})
            confidence = analysis.get('confidence', 0)
            reasoning = analysis.get('reasoning', 'N/A')
            
            print(f"   ✅ Claude Analysis:")
            print(f"      Formality: {formality}/10")
            print(f"      Pieces: {complexity}")
            print(f"      Categories: {categories}")
            print(f"      Budget Allocation:")
            for cat, pct in budget_allocation.items():
                print(f"         {cat:15} {pct*100:>5.1f}%  (€{test['budget']*pct:.2f})")
            print(f"      Confidence: {confidence:.2f}")
            print(f"      Reasoning: {reasoning[:100]}...")
            print()
            
            # Validation
            warnings = []
            
            # Check formality makes sense
            if isinstance(formality, int):
                if "gym" in test['occasion'].lower() and formality > 3:
                    warnings.append(f"⚠️  Gym should be low formality, got {formality}")
                elif "formal" in test['occasion'].lower() or "law firm" in test['occasion'].lower():
                    if formality < 6:
                        warnings.append(f"⚠️  Formal occasion should be high formality, got {formality}")
            
            # Check budget allocation sums to ~1.0
            total_allocation = sum(budget_allocation.values())
            if abs(total_allocation - 1.0) > 0.05:
                warnings.append(f"⚠️  Budget allocation sums to {total_allocation:.2f}, not 1.0")
            
            # Check categories match complexity
            if len(categories) != complexity:
                warnings.append(f"⚠️  Categories count ({len(categories)}) ≠ complexity ({complexity})")
            
            if warnings:
                for w in warnings:
                    print(f"   {w}")
                print()
                results.append((test['name'], 'WARN', analysis))
            else:
                print(f"   ✅ All validations passed!")
                print()
                results.append((test['name'], 'PASS', analysis))
                
        except Exception as e:
            print(f"   ❌ ERROR: {e}")
            print()
            results.append((test['name'], 'FAIL', str(e)))
    
    # Summary
    print("=" * 80)
    print("SUMMARY")
    print("=" * 80)
    
    passes = sum(1 for _, status, _ in results if status == 'PASS')
    warns = sum(1 for _, status, _ in results if status == 'WARN')
    fails = sum(1 for _, status, _ in results if status == 'FAIL')
    
    print(f"✅ Passed: {passes}/{len(test_cases)}")
    print(f"⚠️  Warnings: {warns}/{len(test_cases)}")
    print(f"❌ Failed: {fails}/{len(test_cases)}")
    print()
    
    if fails > 0:
        print("Failed tests:")
        for name, status, error in results:
            if status == 'FAIL':
                print(f"   - {name}: {error}")
        print()
    
    return passes == len(test_cases)


if __name__ == "__main__":
    success = asyncio.run(test_occasion_analyzer())
    sys.exit(0 if success else 1)
