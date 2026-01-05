
"""
STRESS TEST SUITE: "Is the Verifier Actually Useful?"
"""
import pytest
import os
from dotenv import load_dotenv
load_dotenv()
from app.mcp_agents.verifier.verifier import get_verifier

# --- SCENARIOS ---
SCENARIOS = [
    {
        "name": "Impossible Constraint",
        "query": "Show me a leather jacket under $5",
        "draft_answer": "I found this amazing leather jacket for $4.99!",
        "tool_outputs": {"items_found": 0, "cheapest_item": {"price": 150.00, "name": "Leather Jacket"}},
        "expected_status": "FAIL",
        "note": "Verifier MUST catch the price lie."
    },
    {
        "name": "Conflicting User Intent",
        "query": "I want something warm for summer",
        "draft_answer": "Here is a heavy wool coat perfect for summer.",
        "tool_outputs": {"top_item": {"name": "Wool Coat", "season": "Winter"}},
        "expected_status": "FAIL",
        "note": "Verifier should flag logical inconsistency (Warm vs Summer)."
    },
    {
        "name": "Vague Query -> hallucinations",
        "query": "Do you have that thing from the movie?",
        "draft_answer": "Yes, here is the exact jacket from Top Gun.",
        "tool_outputs": {"items_found": 1, "top_item": {"name": "Bomber Jacket", "description": "Generic bomber"}},
        "expected_status": "FAIL",
        "note": "Verifier should flag unproven claims ('Top Gun')."
    },
    {
        "name": "Correct but Boring Answer (Tone Check)",
        "query": "Show me red dresses",
        "draft_answer": "DATABASE_RESULT: [Item 1, Item 2]. Query executed successfully.",
        "tool_outputs": {"items_found": 2},
        "expected_status": "FAIL", # or PASS with refinement?
        "note": "Verifier should fix robotic tone."
    },
    {
        "name": "Color Nuance (Dark Blue vs Blue)",
        "query": "Show me dark blue hoodies",
        "draft_answer": "Here are some dark blue options.",
        "tool_outputs": {"items_found": 1, "top_item": {"color": "Blue", "name": "Standard Blue Hoodie"}},
        "expected_status": "FAIL", # Expecting it to correct "Dark Blue" -> "Blue"
        "note": "Verifier should clarify it is 'Blue', not explicitly 'Dark Blue'."
    }
]

@pytest.mark.asyncio
async def test_stress_scenarios():
    verifier = get_verifier()
    
    print("\n--- STARTING STRESS TEST ---")
    for s in SCENARIOS:
        print(f"\n🧪 Scenario: {s['name']}")
        print(f"   Query: {s['query']}")
        print(f"   Draft: {s['draft_answer']}")
        
        # Build context
        context = {"intent": "stress_test"}
        
        result = await verifier.verify(s['query'], s['draft_answer'], context, s['tool_outputs'])
        
        status = result["status"]
        critique = result.get("critique", "")
        refined = result.get("refined_answer", "")
        suggestions = result.get("suggestions", [])
        
        print(f"   👉 Verdict: {status}")
        print(f"   📝 Critique: {critique}")
        print(f"   ✨ Refined: {refined}")
        print(f"   💡 Suggestions: {suggestions}")
        
        if status == s["expected_status"]:
             print(f"   ✅ PASSED TEST (Matched Expectation)")
        else:
             print(f"   ❌ FAILED TEST (Unexpected Behavior)")

if __name__ == "__main__":
    # verification runs require env vars for LLM
    import asyncio
    asyncio.run(test_stress_scenarios())
