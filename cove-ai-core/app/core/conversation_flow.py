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

from typing import Dict, Any, Optional, List, Union
from pathlib import Path
import json
import logging
import re
import os
from litellm import acompletion

log = logging.getLogger("cove.conversation")


class ConversationFlowHandler:
    """Manages multi-step conversation flows (e.g., outfit builder)."""
    
    def __init__(self):
        self.flows = self._load_flows()
        self.stylist_config = self._load_stylist_config()
        # In-memory state storage (session_id -> state)
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

    def _load_stylist_config(self) -> Dict[str, Any]:
        """Load stylist config for keyword extraction."""
        config_path = Path(__file__).parent.parent.parent / "data" / "stylist_config.json"
        try:
            with open(config_path, "r") as f:
                return json.load(f)
        except Exception as e:
            log.error(f"Failed to load stylist config: {e}")
            return {}

    # ... (skipping unchanged methods) ...

    async def _extract_slots_from_text(self, text: str) -> Dict[str, Any]:
        """Attempt to extract budget, occasion, and style using LLM."""
        try:
            log.info(f"🧠 LLM Extracting slots from: '{text}'")
            response = await acompletion(
                model="openrouter/openai/gpt-4o-mini",
                messages=[ 
                    {"role": "system", "content": """Extract outfit request details as JSON with these keys:
- 'occasion': The context/purpose/event (e.g., "mountains", "beach", "wedding", "work meeting", "date night", "casual weekend")
- 'budget': Numeric budget if mentioned (e.g., 200, 500)
- 'style': Style preference if mentioned (e.g., "casual", "formal", "minimalist")
- 'gender': Target gender if mentioned. Rules:
  - "girlfriend", "wife", "for her", "for women", "women's" → "women"
  - "boyfriend", "husband", "for him", "for men", "men's" → "men"
  - If not specified or unclear → null

Examples:
"outfit for my girlfriend under 500" → {"occasion": null, "budget": 500, "style": null, "gender": "women"}
"casual look for my boyfriend" → {"occasion": "casual", "budget": null, "style": "casual", "gender": "men"}
"wedding guest outfit under 500 euros" → {"occasion": "wedding", "budget": 500, "style": null, "gender": null}
"I want to build an outfit for my girlfriend under 500 euros" → {"occasion": null, "budget": 500, "style": null, "gender": "women"}

Return valid JSON. Use null for values not found."""},
                    {"role": "user", "content": text}
                ],
                response_format={"type": "json_object"},
                api_key=os.getenv("OPENROUTER_API_KEY")
            )
            content = response.choices[0].message.content
            log.info(f"🧠 LLM extraction raw response: {content}")
            extracted = json.loads(content)
            # Filter nulls
            result = {k: v for k, v in extracted.items() if v is not None}
            log.info(f"✅ LLM extracted slots: {result}")
            return result
        except Exception as e:
            log.warning(f"⚠️ LLM extraction failed: {e}. Falling back to heuristics.")
            return self._extract_slots_heuristic(text)

    def _extract_slots_heuristic(self, text: str) -> Dict[str, Any]:
        """Attempt to extract budget, occasion, and style using CONFIG-DRIVEN rules."""
        text_lower = text.lower()
        extracted = {}
        
        # --- Extract Budget ---
        # Matches: "250 euros", "250€", "$250", "budget 250", "under 250"
        budget_match = re.search(r'(?:€|eur|euro|euros|\$|£)\s*(\d+)', text_lower)
        if not budget_match:
            budget_match = re.search(r'(\d+)\s*(?:€|eur|euro|euros|\$|£)', text_lower)
        
        if budget_match:
            try:
                extracted["budget"] = str(float(budget_match.group(1)))
            except: 
                pass
        
        # --- Extract Occasion (Config-Driven) ---
        occasions_config = self.stylist_config.get("occasions", {})
        found_occasion = None
        
        # Check against mapped keywords
        for occasion_key, data in occasions_config.items():
            keywords = data.get("keywords", [])
            # Also match the key itself
            if occasion_key in text_lower or any(kw in text_lower for kw in keywords):
                # Prefer longer matches if overlap? 
                # For now, first match is acceptable, but let's prioritize specific phrases if possible.
                # Actually, simple set check is fine for now.
                found_occasion = occasion_key
                break
        
        if found_occasion:
            extracted["occasion"] = found_occasion

        # --- Extract Style (Config-Driven) ---
        styles_config = self.stylist_config.get("styles", {})
        found_style = None
        
        for style_key, data in styles_config.items():
            keywords = data.get("keywords", [])
            if style_key in text_lower or any(kw in text_lower for kw in keywords):
                found_style = style_key
                break
                
        if found_style:
            extracted["style"] = found_style
                
        return extracted
    
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
    
    async def start_conversation(self, session_id: str, flow_name: str, initial_message: str = "") -> Union[str, Dict[str, Any]]:
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
        state = {
            "flow_name": flow_name,
            "current_step": 0,
            "answers": {},
            "flow": flow
        }
        self._active_conversations[session_id] = state
        
        # ✨ ONE-SHOT: Extract slots from the triggering message immediately
        if initial_message:
            # CRITICAL: Store original message for context preservation (e.g., "boyfriend" for gender)
            state["original_query"] = initial_message
            
            extracted = await self._extract_slots_from_text(initial_message)
            log.info(f"🚀 One-Shot Extraction from '{initial_message}': {extracted}")
            for key, val in extracted.items():
                if val:
                    state["answers"][key] = val
        
        # Advance index until we find a step that needs an answer
        while state["current_step"] < len(steps):
            next_step_def = steps[state["current_step"]]
            step_name = next_step_def["step"]
            
            # If we already have an answer (from one-shot), SKIP IT
            if step_name in state["answers"]:
                log.info(f"⏭️ Skipping step '{step_name}' - already answered via one-shot")
                state["current_step"] += 1
            else:
                # Found a step that needs answering!
                return self._format_question(next_step_def)
                
        # If we skipped ALL steps, we are done immediately!
        # Return completion status to allow immediate execution
        log.info(f"🚀 One-shot extraction complete! Triggering immediate execution.")
        
        # Preserve original query
        state["answers"]["_original_query"] = state.get("original_query", "")
        
        # Clean up session since we are done
        del self._active_conversations[session_id]
        
        # Build trigger payload
        return self._build_orchestrator_trigger(flow, state["answers"])
    
    def is_in_conversation(self, session_id: str) -> bool:
        """Check if session has an active conversation."""
        return session_id in self._active_conversations
    
    async def handle_response(self, session_id: str, message: str) -> Dict[str, Any]:
        """
        Handle user response in active conversation.
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
        
        # 1. SMART EXTRACTION: Try to extract ALL possible slots from this message
        # This handles cases like "casual weekend 250 euros" (answering 2 questions at once)
        extracted = await self._extract_slots_from_text(message)
        log.info(f"🧠 extracted slots from '{message}': {extracted}")
        
        # Merge extracted slots into known answers
        # Be careful not to overwrite existing answers with None, but DO overwrite if new value found
        for key, val in extracted.items():
            if val:
                state["answers"][key] = val
                
        # Also store the raw response for the *current* step if we didn't extract a specific value for it
        # This ensures we capture free-text answers that might not match our extraction rules
        current_idx = state["current_step"]
        if current_idx < len(steps):
            current_step_name = steps[current_idx]["step"]
            # If we haven't already filled this slot via smart extraction, use the whole message
            if current_step_name not in state["answers"]:
                state["answers"][current_step_name] = message

        # 2. DYNAMIC SKIPPING: Advance index until we find a step that needs an answer
        while state["current_step"] < len(steps):
            next_step_def = steps[state["current_step"]]
            step_name = next_step_def["step"]
            
            # If we already have an answer for this step, SKIP IT
            if step_name in state["answers"]:
                log.info(f"⏭️ Skipping step '{step_name}' - already answered: {state['answers'][step_name]}")
                state["current_step"] += 1
            else:
                # Found a step that needs answering!
                return {
                    "complete": False,
                    "message": self._format_question(next_step_def),
                    "trigger_orchestrator": False
                }
        
        # 3. Conversation complete! Build orchestrator query
        # Preserve original query for context (gender, etc.)
        state["answers"]["_original_query"] = state.get("original_query", "")
        
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
        
        log.info(f"💰 Extracted budget from answers: {budget_str} -> {budget_num}")
        
        query_parts = [f"build an outfit for {occasion}"]
        if style:
            query_parts.append(f"style {style}")
        # Explicitly include budget in textual query as failsafe
        query_parts.append(f"budget {budget_num}")
        
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
                "style": style,
                "gender": answers.get("gender"),  # Extracted gender (women/men)
                "original_query": answers.get("_original_query", "")  # Preserve original for context
            }
        }
    
    def _extract_budget(self, budget_str: str) -> float:
        """Extract numeric budget from string like '$300' or '200-300' or 'under €500'."""
        if not budget_str:
            return 500.0
            
        # Ensure it's a string (LLM might return int)
        budget_str = str(budget_str)
        
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
