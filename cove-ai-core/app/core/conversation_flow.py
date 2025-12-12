"""
Conversation Flow Handler - Guides users through multi-step flows.

Handles outfit builder conversation:
1. User: "I want to build an outfit"
2. Bot: "What's the occasion?"
3. User: "business meeting"
4. Bot: "What's your budget?"
5. User: "$300"
6. Bot: "Any style preferences?"
7. User: "smart casual"
8. Bot triggers orchestrator with: "build an outfit for business meeting, budget $300, smart casual"
"""

from typing import Dict, Any, Optional, List
from pathlib import Path
import json
import logging
import re

log = logging.getLogger("cove.conversation")


class ConversationFlowHandler:
    """Manages multi-step conversation flows (e.g., outfit builder)."""
    
    def __init__(self):
        self.flows = self._load_flows()
        # In-memory state storage (session_id -> state)
        # TODO: Move to Redis for production
        self._active_conversations: Dict[str, Dict[str, Any]] = {}
    
    def _load_flows(self) -> Dict[str, Any]:
        """Load conversation flows from JSON config."""
        config_path = Path(__file__).parent.parent.parent / "data" / "conversation_flows.json"
        
        try:
            with open(config_path, "r") as f:
                flows = json.load(f)
            log.info(f"✓ Loaded {len(flows)} conversation flows")
            return flows
        except Exception as e:
            log.error(f"Failed to load conversation flows: {e}")
            return {}
    
    def should_start_conversation(self, message: str) -> Optional[str]:
        """
        Check if message should start a conversation flow.
        
        Returns:
            Flow name if matched, None otherwise
        """
        message_lower = message.lower()
        
        for flow_name, flow in self.flows.items():
            triggers = flow.get("trigger_patterns", [])
            if any(trigger in message_lower for trigger in triggers):
                log.info(f"🎯 Starting conversation flow: {flow_name}")
                return flow_name
        
        return None
    
    def start_conversation(self, session_id: str, flow_name: str) -> str:
        """
        Start a new conversation flow.
        
        Returns:
            First question to ask user
        """
        flow = self.flows.get(flow_name)
        if not flow:
            return "Sorry, I couldn't find that conversation flow."
        
        steps = flow.get("flow", [])
        if not steps:
            return "Sorry, this conversation flow is not configured properly."
        
        # Initialize conversation state
        self._active_conversations[session_id] = {
            "flow_name": flow_name,
            "current_step": 0,
            "answers": {},
            "flow": flow
        }
        
        # Return first question
        first_step = steps[0]
        return self._format_question(first_step)
    
    def is_in_conversation(self, session_id: str) -> bool:
        """Check if session has an active conversation."""
        return session_id in self._active_conversations
    
    def handle_response(self, session_id: str, message: str) -> Dict[str, Any]:
        """
        Handle user response in active conversation.
        
        Returns:
            {
                "complete": bool,  # Is conversation complete?
                "message": str,    # Next question or completion message
                "trigger_orchestrator": bool,  # Should trigger orchestrator?
                "orchestrator_query": str | None,  # Query for orchestrator
                "orchestrator_context": dict | None  # Context for orchestrator
            }
        """
        if session_id not in self._active_conversations:
            return {
                "complete": False,
                "message": "No active conversation found.",
                "trigger_orchestrator": False
            }
        
        state = self._active_conversations[session_id]
        flow = state["flow"]
        steps = flow.get("flow", [])
        current_idx = state["current_step"]
        
        if current_idx >= len(steps):
            # Shouldn't happen, but handle gracefully
            del self._active_conversations[session_id]
            return {
                "complete": True,
                "message": "Conversation complete!",
                "trigger_orchestrator": False
            }
        
        # Store current answer
        current_step = steps[current_idx]
        step_name = current_step["step"]
        state["answers"][step_name] = message
        
        # Move to next step
        state["current_step"] += 1
        
        # Check if more steps
        if state["current_step"] < len(steps):
            next_step = steps[state["current_step"]]
            return {
                "complete": False,
                "message": self._format_question(next_step),
                "trigger_orchestrator": False
            }
        
        # Conversation complete! Build orchestrator query
        del self._active_conversations[session_id]
        
        return self._build_orchestrator_trigger(flow, state["answers"])
    
    def _format_question(self, step: Dict[str, Any]) -> str:
        """Format question with examples."""
        question = step.get("question", "")
        examples = step.get("examples", [])
        
        if examples:
            examples_text = ", ".join(f'"{ex}"' for ex in examples[:3])
            question += f"\n\n(e.g., {examples_text})"
        
        return question
    
    def _build_orchestrator_trigger(
        self,
        flow: Dict[str, Any],
        answers: Dict[str, str]
    ) -> Dict[str, Any]:
        """
        Build orchestrator query from collected answers.
        
        For outfit_builder:
            Answers: {occasion: "business meeting", budget: "$300", style: "smart casual"}
            Query: "build an outfit for business meeting, budget $300, style smart casual"
        """
        # Extract budget number
        budget_str = answers.get("budget", "500")
        budget_num = self._extract_budget(budget_str)
        
        # Build query message
        occasion = answers.get("occasion", "general")
        style = answers.get("style", "")
        
        query_parts = [f"build an outfit for {occasion}"]
        if style:
            query_parts.append(f"style {style}")
        
        query = ", ".join(query_parts)
        
        # Completion message
        completion_template = flow.get("completion_message", "Building your outfit...")
        completion_msg = completion_template.format(
            occasion=occasion,
            budget=budget_num
        )
        
        return {
            "complete": True,
            "message": completion_msg,
            "trigger_orchestrator": True,
            "orchestrator_workflow": flow.get("orchestrator_workflow", "outfit_builder"),
            "orchestrator_query": query,
            "orchestrator_context": {
                "budget_max": budget_num,
                "occasion": occasion,
                "style": style
            }
        }
    
    def _extract_budget(self, budget_str: str) -> float:
        """Extract numeric budget from string like '$300' or '200-300' or 'under €500'."""
        # Remove currency symbols
        cleaned = re.sub(r'[$€£]', '', budget_str)
        
        # Find first number
        numbers = re.findall(r'\d+', cleaned)
        if numbers:
            return float(numbers[0])
        
        # Default
        return 500.0
    
    def cancel_conversation(self, session_id: str):
        """Cancel active conversation."""
        if session_id in self._active_conversations:
            del self._active_conversations[session_id]
            log.info(f"Cancelled conversation for session {session_id}")


# Global instance
conversation_handler = ConversationFlowHandler()

log.info("✓ Conversation flow handler ready")
