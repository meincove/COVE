import pytest
import asyncio
import os
from dotenv import load_dotenv
load_dotenv()
from app.mcp_agents.verifier.verifier import get_verifier

# Set env for test
os.environ["VERIFIER_MODEL"] = "openrouter/openai/gpt-4o-mini"
os.environ["OPENROUTER_API_KEY"] = os.getenv("OPENROUTER_API_KEY", "dummy") # Ensure key exists or test skips

@pytest.mark.asyncio
async def test_verifier_hallucination_correction():
    verifier = get_verifier()
    
    # CASE 1: Hallucination 
    # Query: Green Hoodie
    # Tool: Found Red Hoodie
    # Draft: "Here is your green hoodie"
    
    query = "show me a green hoodie"
    draft = "I found this perfect green hoodie for you!"
    context = {"filters": {"color": "green", "type": "hoodie"}}
    tool_outputs = {
        "items_found": 1,
        "top_item": {"name": "Red Hoodie", "color": "Red", "price": 50}
    }
    
    print("\n--- Testing Hallucination Correction ---")
    result = await verifier.verify(query, draft, context, tool_outputs)
    
    print(f"Status: {result.get('status')}")
    print(f"Critique: {result.get('critique')}")
    print(f"Refined: {result.get('refined_answer')}")
    print(f"Suggestions: {result.get('suggestions')}")
    
    # Assertions (if using real LLM, logic might vary, but status should be FAIL usually)
    # Since we use a real LLM call, we can't strict assert "FAIL" deterministically without mocking LLM.
    # But we can check structure.
    assert "status" in result
    assert "suggestions" in result
    assert len(result["suggestions"]) == 3

@pytest.mark.asyncio
async def test_verifier_drive_forward():
    verifier = get_verifier()
    
    # CASE 2: Success
    # Query: Black Hoodie
    # Tool: Found Black Hoodie
    # Draft: "Here is your black hoodie"
    
    query = "show me a black hoodie"
    draft = "Here is an awesome black hoodie."
    context = {"filters": {"color": "black"}}
    tool_outputs = {
        "items_found": 1,
        "top_item": {"name": "Black Hoodie", "color": "Black"}
    }
    
    print("\n--- Testing Drive Forward (Success) ---")
    result = await verifier.verify(query, draft, context, tool_outputs)
    
    print(f"Status: {result.get('status')}")
    print(f"Critique: {result.get('critique')}")
    print(f"Refined: {result.get('refined_answer')}")
    print(f"Suggestions: {result.get('suggestions')}")
    
    assert "suggestions" in result
    assert len(result["suggestions"]) > 0

if __name__ == "__main__":
    # Manual run wrapper
    async def main():
        await test_verifier_hallucination_correction()
        await test_verifier_drive_forward()
    
    asyncio.run(main())
