
import asyncio
import os
import sys

# Setup paths
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.agents.stylist_agent import StylistAgent
from app.agents.multi_agent_orchestrator import MultiAgentOrchestrator, WorkflowState

async def test_gender_confirm():
    stylist = StylistAgent("stylist")
    
    # Ambiguous query
    task = {
        "query": "I need an outfit for a party",
        "budget_max": 500,
        "categories": ["top", "bottom"]
    }
    
    context = {
        "user_id": "test_user",
        "gender": None, # Explicitly no gender in context
        "original_query": "I need an outfit for a party"
    }
    
    print("\n🔍 Testing Stylist Gender Ambiguity...")
    result = await stylist.execute(task, context)
    
    if result.success and result.data.get("needs_confirmation"):
        print("✅ SUCCESS: Stylist requested confirmation.")
        print(f"   Question: {result.data['question']}")
        print(f"   Options: {result.data['options']}")
    else:
        print("❌ FAILURE: Stylist did not request confirmation.")
        print(result.to_dict())

async def test_orchestrator_confirm():
    orch = MultiAgentOrchestrator()
    state = WorkflowState(
        query="I need an outfit for a party",
        budget_max=500,
        context={"gender": None, "original_query": "I need an outfit for a party"}
    )
    
    # Mocking Stylist result manually to test synthesize logic
    # (Since running full orchestrator requires real LLM calls which might be flaky or slow)
    state.agent_results["stylist"] = {
        "success": True,
        "data": {
            "needs_confirmation": True,
            "question": "Gender?",
            "options": ["M", "F"]
        },
        "reasoning": "Asking..."
    }
    
    print("\n🔍 Testing Orchestrator Synthesis...")
    final = orch._synthesize_results(state, "outfit_builder")
    
    if final.get("needs_confirmation"):
        print("✅ SUCCESS: Orchestrator bubbled up confirmation.")
    else:
        print("❌ FAILURE: Orchestrator swallowed confirmation.")
        print(final)

if __name__ == "__main__":
    asyncio.run(test_gender_confirm())
    asyncio.run(test_orchestrator_confirm())
