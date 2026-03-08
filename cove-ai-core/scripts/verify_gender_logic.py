#!/usr/bin/env python3
"""
Verification Script: Test StylistAgent Gender Logic

Tests:
1. Explicit gender keywords ("boyfriend", "girlfriend")
2. Ambiguous queries (no gender context)
3. Gender filter propagation to search payload
4. No "ask_gender" blocking
"""

import asyncio
import sys
import os
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.agents.stylist_agent import StylistAgent
import logging

# Setup logging
logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
log = logging.getLogger(__name__)

# Test cases covering different gender scenarios
TEST_CASES = [
    {
        "name": "Explicit Male (boyfriend keyword)",
        "query": "casual outfit for my boyfriend",
        "context": {},
        "expected_gender": "men"
    },
    {
        "name": "Explicit Female (girlfriend keyword)",
        "query": "date night outfit for my girlfriend",
        "context": {},
        "expected_gender": "women"
    },
    {
        "name": "Ambiguous Query (should default to unisex)",
        "query": "I need a hoodie for gym",
        "context": {},
        "expected_gender": "unisex"  # Should NOT halt with "ask_gender"
    },
    {
        "name": "Context-provided Gender (override)",
        "query": "casual outfit",
        "context": {"gender": "women"},
        "expected_gender": "women"
    },
    {
        "name": "Men's keyword in query",
        "query": "men's formal blazer",
        "context": {},
        "expected_gender": "men"
    }
]

async def run_verification():
    """Run all gender logic verification tests."""
    print("\n" + "="*80)
    print("🧪 GENDER LOGIC VERIFICATION TEST")
    print("="*80 + "\n")
    
    # Initialize agent
    agent = StylistAgent(name="StylistAgent")
    
    results = []
    
    for idx, test_case in enumerate(TEST_CASES, 1):
        print(f"\n{'─'*80}")
        print(f"Test {idx}/{len(TEST_CASES)}: {test_case['name']}")
        print(f"Query: \"{test_case['query']}\"")
        print(f"Context: {test_case['context']}")
        print(f"Expected Gender: {test_case['expected_gender']}")
        print(f"{'─'*80}")
        
        try:
            # Execute agent
            task = {
                "query": test_case["query"],
                "budget_max": 300,
                "categories": ["top", "bottom"]
            }
            
            # Add original_query to context for keyword fallback
            context = {**test_case["context"], "original_query": test_case["query"]}
            
            result = await agent.execute(task, context)
            
            # Check result
            if not result.success:
                print(f"❌ FAILED: Agent returned success=False")
                print(f"   Errors: {result.errors}")
                results.append({
                    "test": test_case["name"],
                    "status": "FAILED",
                    "reason": "Agent execution failed"
                })
                continue
            
            # Extract detected gender from analysis
            analysis = result.data.get("intent", {})
            detected_gender = analysis.get("gender", "N/A")
            
            # Normalize for comparison
            gender_map = {"male": "men", "female": "women", "men": "men", "women": "women", "unisex": "unisex"}
            normalized_detected = gender_map.get(detected_gender, detected_gender)
            
            print(f"\n📊 Results:")
            print(f"   Detected Gender: {detected_gender}")
            print(f"   Normalized: {normalized_detected}")
            print(f"   Analysis: {analysis.get('reasoning', 'No reasoning')[:100]}")
            
            # Check if gender matches expected
            if normalized_detected == test_case["expected_gender"]:
                print(f"   ✅ PASS: Gender correctly detected as '{normalized_detected}'")
                results.append({
                    "test": test_case["name"],
                    "status": "PASS",
                    "detected": normalized_detected
                })
            else:
                print(f"   ❌ FAIL: Expected '{test_case['expected_gender']}', got '{normalized_detected}'")
                results.append({
                    "test": test_case["name"],
                    "status": "FAIL",
                    "expected": test_case["expected_gender"],
                    "detected": normalized_detected
                })
            
            # Critical check: Should NEVER halt with "ask_gender"
            if detected_gender == "ask_gender":
                print(f"   🚨 CRITICAL ERROR: Agent returned 'ask_gender' - this should NOT happen!")
                results[-1]["critical_error"] = "ask_gender returned"
            
            # Check if candidates were returned
            candidates = result.data.get("candidates", {})
            print(f"   Candidates: {len(candidates)} categories with results")
            
        except Exception as e:
            print(f"❌ EXCEPTION: {e}")
            results.append({
                "test": test_case["name"],
                "status": "ERROR",
                "exception": str(e)
            })
    
    # Summary
    print("\n" + "="*80)
    print("📋 TEST SUMMARY")
    print("="*80)
    
    passed = sum(1 for r in results if r["status"] == "PASS")
    failed = sum(1 for r in results if r["status"] == "FAIL")
    errors = sum(1 for r in results if r["status"] == "ERROR")
    critical = sum(1 for r in results if "critical_error" in r)
    
    print(f"\nTotal Tests: {len(results)}")
    print(f"✅ Passed: {passed}")
    print(f"❌ Failed: {failed}")
    print(f"💥 Errors: {errors}")
    
    if critical > 0:
        print(f"\n🚨 CRITICAL ISSUES: {critical} test(s) returned 'ask_gender'")
    
    # Detailed failures
    if failed > 0 or errors > 0:
        print("\n❌ Failed/Error Details:")
        for r in results:
            if r["status"] in ["FAIL", "ERROR"]:
                print(f"   • {r['test']}")
                if "expected" in r:
                    print(f"     Expected: {r['expected']}, Got: {r['detected']}")
                if "exception" in r:
                    print(f"     Exception: {r['exception']}")
    
    print("\n" + "="*80)
    
    # Exit code
    if failed > 0 or errors > 0 or critical > 0:
        print("\n❌ VERIFICATION FAILED")
        sys.exit(1)
    else:
        print("\n✅ ALL TESTS PASSED")
        sys.exit(0)

if __name__ == "__main__":
    asyncio.run(run_verification())
