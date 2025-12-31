import asyncio
import os
import logging
import json
from datetime import datetime
import dotenv

# Load env BEFORE app imports
dotenv.load_dotenv("cove-ai-core/.env")

from app.core.conversation_flow import conversation_handler
from app.agents.multi_agent_orchestrator import orchestrator

# Configure logging to see EVERYTHING
logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(name)s: %(message)s')

async def deep_debug():
    print("\n\n🕵️‍♀️ DEEP DEBUG: 'Casual weekend outfit under €500' 🕵️‍♀️\n")
    
    session_id = f"debug_session_{int(datetime.now().timestamp())}"
    
    # 1. INTENT & EXTRACTION
    print("--- 1. CONVERSATION START ---")
    start_msg = await conversation_handler.start_conversation(
        session_id=session_id,
        flow_name="outfit_builder_conversation",
        initial_message="Casual weekend outfit under €500"
    )
    print(f"Bot Question: {start_msg}")
    
    state = conversation_handler._active_conversations.get(session_id)
    print(f"Conversation State (extracted): {json.dumps(state.get('answers'), indent=2)}")
    
    # 2. TRIGGER ORCHESTRATOR
    print("\n--- 2. USER CONFIRMATION ---")
    response_payload = await conversation_handler.handle_response(session_id, "yes")
    print(f"Orchestrator Trigger: {response_payload.get('trigger_orchestrator')}")
    print(f"Orchestrator Query: {response_payload.get('orchestrator_query')}")
    print(f"Orchestrator Context: {json.dumps(response_payload.get('orchestrator_context'), indent=2)}")

    if not response_payload.get("trigger_orchestrator"):
        print("❌ Orchestrator not triggered!")
        return

    # 3. RUN WORKFLOW & INSPECT AGENTS
    print("\n--- 3. EXECUTING WORKFLOW ---")
    query = response_payload["orchestrator_query"]
    context = response_payload["orchestrator_context"]
    workflow_name = response_payload["orchestrator_workflow"]
    
    async for event in orchestrator.execute_workflow(workflow_name, query, context, stream=True):
        evt_type = event.get("type")
        
        if evt_type == "progress":
            print(f"\n[PROGRESS] Group {event.get('step')} - Agents: {event.get('agents')}")
        
        elif evt_type == "agentic_event":
            # Stylist internal events
            cat = event.get("category")
            status = event.get("status")
            msg = event.get("message") or event.get("reason")
            slug = event.get("slug")
            print(f"   [STYLIST EVENT] {cat}: {status} ({slug}) - {msg}")
            
        elif evt_type == "step_complete":
            print(f"[STEP COMPLETE] {event.get('status')}")
            
            # INSPECT INTERMEDIATE RESULTS
            results = event.get("results", {})
            
            # Stylist Candidates
            if "stylist" in results:
                print("\n[STYLIST CANDIDATES]")
                stylist_data = results["stylist"].get("data", {})
                candidates = stylist_data.get("candidates", {})
                for cat, items in candidates.items():
                    print(f"  Category: {cat} ({len(items)} items)")
                    for item in items[:3]: # Show top 3
                        print(f"    - {item.get('title')} (€{item.get('price')}, color: {item.get('color')})")
            
            # Builder Output
            if "outfit_builder" in results:
                print("\n[BUILDER SELECTED ITEMS]")
                builder_data = results["outfit_builder"].get("data", {})
                outfit_items = builder_data.get("outfit_items", [])
                for item in outfit_items:
                    prod = item.get("product", {})
                    print(f"    - {prod.get('title')} (€{prod.get('price')}) [Reason: {item.get('reason')}]")
            
        elif evt_type == "complete":
            print("\n--- 4. FINAL RESULT ---")
            result = event.get("result", {})
            items = result.get("outfit_items", [])
            print(f"Total: €{result.get('total')}")
            print(f"Within Budget: {result.get('within_budget')}")
            
            print("\n[OUTFIT ITEMS DEBUG]")
            for item in items:
                prod = item.get("product", {})
                print(f" - Category: {item.get('category')}")
                print(f"   Title: {prod.get('title')}")
                print(f"   Price (dict): {prod.get('price')}")
                print(f"   PriceNumeric (dict): {prod.get('priceNumeric')}") 
                print(f"   Valid Relevance? (Manual Check): {'NO' if 'pants' in prod.get('title').lower() and item.get('category')=='tops' else 'YES'}")

if __name__ == "__main__":
    import dotenv
    dotenv.load_dotenv("cove-ai-core/.env")
    asyncio.run(deep_debug())
