import asyncio
import os
import logging
from app.core.conversation_flow import conversation_handler, ConversationFlowHandler
from app.agents.multi_agent_orchestrator import orchestrator

# Configure logging to see EVERYTHING
logging.basicConfig(level=logging.INFO)
log = logging.getLogger("cove")
log.setLevel(logging.INFO)

async def reproduce_failure():
    print("\n\n🔥 STARTING REPRODUCTION: 'Casual weekend outfit under €200' 🔥\n")
    
    session_id = "repro_session_1"
    
    # 1. Start Conversation (Simulate Flow)
    # User validates: "Casual weekend outfit under €200"
    # This triggers one-shot extraction
    print("--- 1. START CONVERSATION ---")
    start_msg = await conversation_handler.start_conversation(
        session_id=session_id,
        flow_name="outfit_builder_conversation",
        initial_message="Casual weekend outfit under €200"
    )
    print(f"Agent Response: {start_msg}")
    
    # Check internal state of conversation handler
    state = conversation_handler._active_conversations.get(session_id)
    print(f"Conversation State: {state.get('answers') if state else 'None'}")
    
    # 2. Trigger Orchestrator
    # If using 'start_conversation' with full info, it might return a question or be ready.
    # In the real app, the user might confirm "yes".
    # Let's clean up state and force trigger if it didn't auto-trigger.
    # Actually, conversation_handler returns "I have everything..." if valid.
    # We need to simulate the 'handle_response' call that triggers the orchestrator.
    
    print("\n--- 2. USER CONFIRMS ---")
    response_payload = await conversation_handler.handle_response(session_id, "yes, show me")
    print(f"Handle Response Payload: {response_payload}")
    
    if response_payload.get("trigger_orchestrator"):
        query = response_payload["orchestrator_query"]
        context = response_payload["orchestrator_context"]
        workflow_name = response_payload["orchestrator_workflow"]
        
        print(f"\n--- 3. ORCHESTRATOR TRIGGER ---")
        print(f"Query: '{query}'")
        print(f"Context: {context}")
        
        # Run Orchestrator
        print("\n--- 4. EXECUTING WORKFLOW ---")
        # We use stream=True to see events if we want, or False for report.
        # Let's use False to keep log clean but print result.
        async for result in orchestrator.execute_workflow(workflow_name, query, context, stream=True):
             if result["type"] == "progress":
                 print(f"   [Progress] {result['status']}")
             elif result["type"] == "agentic_event":
                 print(f"   [Agent Event] {result.get('category')} - {result.get('status')} - slug:{result.get('slug')} - {result.get('message') or result.get('reason')}")
             elif result["type"] == "complete":
                 print("\n--- 5. FINAL RESULT ---")
                 outfit = result["result"]["outfit_items"]
                 total = result["result"]["total"]
                 print(f"Total Cost: €{total}")
                 for item in outfit:
                     print(f" - {item['category']}: {item['product'].get('title')} (€{item['product'].get('price')})")

if __name__ == "__main__":
    import dotenv
    dotenv.load_dotenv("cove-ai-core/.env") # Load env
    asyncio.run(reproduce_failure())
