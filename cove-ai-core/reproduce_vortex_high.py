import asyncio
import os
import logging
from app.core.conversation_flow import conversation_handler
from app.agents.multi_agent_orchestrator import orchestrator

# Configure logging to see EVERYTHING
logging.basicConfig(level=logging.INFO)
log = logging.getLogger("cove")
log.setLevel(logging.INFO)

async def reproduce_vortex_high_budget():
    print("\n\n🔥 STARTING REPRODUCTION: 'Vortex Streetwear casual weekend outfit under €1000' 🔥\n")
    
    session_id = "repro_vortex_high_fixed"
    
    print("--- 1. START CONVERSATION ---")
    start_msg = await conversation_handler.start_conversation(
        session_id=session_id,
        flow_name="outfit_builder_conversation",
        initial_message="I want a Vortex Streetwear casual weekend outfit under €1000"
    )
    print(f"Agent Response: {start_msg}")
    
    print("\n--- 2. USER CONFIRMS ---")
    response_payload = await conversation_handler.handle_response(session_id, "yes, show me")
    
    if response_payload.get("trigger_orchestrator"):
        query = response_payload["orchestrator_query"]
        context = response_payload["orchestrator_context"]
        workflow_name = response_payload["orchestrator_workflow"]
        
        # Run Orchestrator
        print("\n--- 4. EXECUTING WORKFLOW ---")
        async for result in orchestrator.execute_workflow(workflow_name, query, context, stream=True):
             if result["type"] == "complete":
                 print("\n--- 5. FINAL RESULT ---")
                 outfit = result["result"]["outfit_items"]
                 total = result["result"]["total"]
                 print(f"Total Cost: €{total}")
                 for item in outfit:
                     product = item.get('product', {})
                     brand = product.get('brand')
                     title = product.get('title')
                     price = product.get('price')
                     print(f" - {item['category']}: {title} (Brand: {brand}) (€{price})")

if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv()
    asyncio.run(reproduce_vortex_high_budget())
