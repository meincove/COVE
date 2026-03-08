
import asyncio
import logging
import sys
import os

# Ensure project root is in python path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.agents.stylist_agent import StylistAgent
# from app.services.logger import setup_logger

# Setup logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("test_gender")

# Mock Context
context = {
    "user_id": "test_user_gender_verif",
    "guest_session_id": "session_123",
    # CRITICAL: NO explicit gender in context
}

async def run_gender_test(query, description):
    print(f"\n--- Testing: {description} ---")
    print(f"Query: '{query}'")
    
    agent = StylistAgent("stylist")
    task = {"query": query, "budget": 1000}
    
    try:
        result = await agent.execute(task, context)
        
        if result.success:
            print("✅ Agent executed successfully")
            
            # Check intended gender in analysis
            intent_gender = result.data.get("intent", {}).get("gender")
            print(f"📊 Detect Gender in Intent: {intent_gender}")
            
            # Check items found
            candidates = result.data.get("candidates", {})
            total_items = sum(len(items) for items in candidates.values())
            print(f"📦 Total Items Found: {total_items}")
            
            if total_items > 0:
                print("✅ PASSED: Found items (did not halt)")
            else:
                print("⚠️ WARNING: 0 items found (might have over-filtered or search failed)")
                
        else:
            print(f"❌ FAILED: Agent returned success=False. Errors: {result.errors}")
            if "gender clarification" in str(result.reasoning).lower():
                 print("❌ FAILED: Agent halted for gender clarification!")

    except Exception as e:
        print(f"💥 EXCEPTION: {e}")

async def main():
    # Test 1: Ambiguous (Should default to UNISEX/ALL and proceed)
    await run_gender_test("I need a formal outfit for a gala", "Ambiguous Gender (Expect Unisex/All)")

    # Test 2: Inferred Male (Should detect 'boyfriend')
    await run_gender_test("Outfit for my boyfriend for a date", "Inferred Male (Keyword 'boyfriend')")
    
    # Test 3: Inferred Female (Should detect 'women')
    await run_gender_test("Women's business casual look", "Explicit Female (Keyword 'women')")

if __name__ == "__main__":
    asyncio.run(main())
