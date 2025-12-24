"""
Fact Extraction Service

Extracts structured facts from conversation turns to prevent context loss
in long conversations. Focuses on:
1. Product context (most important for shopping)
2. User preferences
3. Active filters/constraints
4. Conversation state
"""

import json
import logging
from typing import Dict, Any, List, Optional
from pathlib import Path
import litellm

log = logging.getLogger("cove.fact_extractor")


class FactExtractor:
    """
    Extracts and maintains structured facts from conversations.
    """
    
    def __init__(self):
        self.config = self._load_config()
        
    def _load_config(self) -> Dict[str, Any]:
        """Load fact extraction configuration"""
        try:
            config_path = Path(__file__).parent.parent.parent / "data" / "fact_extraction_config.json"
            if config_path.exists():
                with open(config_path) as f:
                    return json.load(f)
        except Exception as e:
            log.warning(f"Failed to load fact extraction config: {e}")
        
        # Default config
        return {
            "enabled": True,
            "extract_preferences": True,
            "extract_filters": True,
            "extract_entities": True,
            "max_entities": 20,
            "fact_ttl_turns": 50,
            "llm_model": "openrouter/openai/gpt-4o-mini",
            "temperature": 0.1
        }
    
    async def extract_facts(
        self,
        user_message: str,
        assistant_response: str,
        existing_facts: Optional[Dict[str, Any]] = None,
        agent_metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Extract and merge facts from a conversation turn.
        
        Args:
            user_message: What the user said
            assistant_response: What the assistant responded
            existing_facts: Previously extracted facts
            agent_metadata: Additional context (items shown, filters used, etc.)
            
        Returns:
            Updated facts dictionary
        """
        if not self.config.get("enabled", True):
            return existing_facts or {}
        
        existing_facts = existing_facts or {}
        
        # Build extraction prompt
        prompt = self._build_extraction_prompt(
            user_message,
            assistant_response,
            existing_facts,
            agent_metadata
        )
        
        try:
            # Call LLM to extract facts
            response = await litellm.acompletion(
                model=self.config["llm_model"],
                messages=[
                    {"role": "system", "content": self._get_system_prompt()},
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"},
                temperature=self.config["temperature"]
            )
            
            extracted = json.loads(response.choices[0].message.content)
            
            # Merge with existing facts
            merged = self._merge_facts(existing_facts, extracted)
            
            log.info(f"Extracted facts: {len(extracted.get('product_focus', {}).get('current_products', []))} products, "
                    f"{len(merged.get('user_preferences', {}))} preferences")
            
            return merged
            
        except Exception as e:
            log.error(f"Fact extraction failed: {e}")
            return existing_facts
    
    def _get_system_prompt(self) -> str:
        """System prompt for fact extraction"""
        return """You are a Fact Extractor for a shopping assistant conversation.

Your job is to extract structured facts from each conversation turn that should be remembered.

CRITICAL: For shopping assistants, PRODUCT CONTEXT is the most important thing to track.

Extract:
1. **Product Focus** (MOST IMPORTANT):
   - Which specific products is the user currently discussing?
   - **EXTRACT ALL AVAILABLE PRODUCT DETAILS** from the AGENT METADATA, including:
     * Basic: name, product_id, brand, type, tier
     * Pricing: price (ALWAYS include if available in metadata)
     * Physical: material, fit, color, sizes available
     * Fabric: materialMain, gsm, breathability, softness, thickness
     * Style: dressCode, styleTags, useCases, pattern
     * Care: washTemp, dryer, iron, careNotes
     * Fit details: fit type, length, bodyShapes, recommendedGender
     * Any other details from metadata (description, styleNotes, fitNotes)
   - User's questions about each product
   - User's interest level (high/medium/low based on questions asked)

2. **User Preferences**:
   - Size preferences (top, bottom, shoes)
   - Style preferences (minimalist, streetwear, etc.)
   - Color preferences (liked/disliked)
   - Budget constraints
   - Material preferences
   - Fit preferences (oversized, slim, etc.)

3. **Active Context**:
   - Current feature (product_search, outfit_builder, cart, etc.)
   - Active search filters
   - Last query

4. **Decisions Made**:
   - Important decisions or statements by user

Output JSON schema:
{
  "product_focus": {
    "current_products": [
      {
        "product_id": "...",
        "name": "...",
        "full_details": {
          "tier": "...",
          "type": "...",
          "price": 123.45,  // ALWAYS include if in metadata
          "material": "...",
          "fit": "...",
          "color": "...",
          "fabric": {...},  // Include all fabric details if available
          "style": {...},   // Include all style details if available
          "care": {...},    // Include all care details if available
          "description": "...",
          "styleNotes": "...",
          "fitNotes": "...",
          // Include ANY other details from AGENT METADATA
        },
        "user_questions": [...],
        "user_interest_level": "high|medium|low",
        "turn_introduced": N
      }
    ],
    "product_history": [...],
    "last_search_results": [...]
  },
  "user_preferences": {...},
  "active_context": {...},
  "decisions_made": [...]
}

IMPORTANT RULES:
1. **EXTRACT ALL DETAILS** from AGENT METADATA - don't just extract basic info
2. **ALWAYS include price** if it's in the metadata (even if null)
3. **Include fabric, style, care details** if available
4. Only extract facts that are explicitly mentioned in the metadata or conversation
5. Do not invent or assume facts not present in the data"""

    def _build_extraction_prompt(
        self,
        user_message: str,
        assistant_response: str,
        existing_facts: Dict[str, Any],
        agent_metadata: Optional[Dict[str, Any]]
    ) -> str:
        """Build the extraction prompt"""
        
        prompt = f"""Extract facts from this conversation turn:

USER: {user_message}
ASSISTANT: {assistant_response}
"""
        
        if agent_metadata:
            prompt += f"\nAGENT METADATA: {json.dumps(agent_metadata, indent=2)}\n"
        
        if existing_facts:
            prompt += f"\nEXISTING FACTS: {json.dumps(existing_facts, indent=2)}\n"
        
        prompt += "\nExtract and return updated facts as JSON:"
        
        return prompt
    
    def _merge_facts(
        self,
        existing: Dict[str, Any],
        new: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Intelligently merge new facts with existing facts.
        
        Rules:
        - New facts override old facts for same keys
        - Product focus: merge current_products, append to history
        - Preferences: merge (new values override)
        - Decisions: append (keep history)
        """
        merged = existing.copy()
        
        # Merge product focus
        if "product_focus" in new:
            if "product_focus" not in merged:
                merged["product_focus"] = {}
            
            # Update current products
            if "current_products" in new["product_focus"]:
                merged["product_focus"]["current_products"] = new["product_focus"]["current_products"]
            
            # Merge product history
            if "product_history" in new["product_focus"]:
                existing_history = merged["product_focus"].get("product_history", [])
                merged["product_focus"]["product_history"] = existing_history + new["product_focus"]["product_history"]
                
                # Limit history size
                max_history = self.config.get("max_entities", 20)
                if len(merged["product_focus"]["product_history"]) > max_history:
                    merged["product_focus"]["product_history"] = merged["product_focus"]["product_history"][-max_history:]
            
            # Update last search results
            if "last_search_results" in new["product_focus"]:
                merged["product_focus"]["last_search_results"] = new["product_focus"]["last_search_results"]
        
        # Merge user preferences (new overrides old)
        if "user_preferences" in new:
            if "user_preferences" not in merged:
                merged["user_preferences"] = {}
            merged["user_preferences"].update(new["user_preferences"])
        
        # Merge active context (new overrides old)
        if "active_context" in new:
            merged["active_context"] = new["active_context"]
        
        # Append decisions
        if "decisions_made" in new:
            if "decisions_made" not in merged:
                merged["decisions_made"] = []
            merged["decisions_made"].extend(new["decisions_made"])
            
            # Limit decisions
            max_decisions = self.config.get("max_entities", 20)
            if len(merged["decisions_made"]) > max_decisions:
                merged["decisions_made"] = merged["decisions_made"][-max_decisions:]
        
        return merged
    
    def get_context_for_llm(self, facts: Dict[str, Any]) -> str:
        """
        Format facts as context string for LLM.
        
        This is injected into the system prompt so the LLM always has
        access to key facts even if old messages are truncated.
        
        IMPROVED: More structured, clearer formatting to help LLM use facts better.
        """
        if not facts:
            return ""
        
        context_parts = []
        
        # Product focus (most important) - IMPROVED FORMATTING
        if product_focus := facts.get("product_focus"):
            if current_products := product_focus.get("current_products"):
                context_parts.append("## 🛍️ Products User is Currently Discussing:")
                context_parts.append("(Reference these when user asks 'go back', 'compare', or mentions specific products)")
                context_parts.append("")
                
                for i, prod in enumerate(current_products, 1):
                    name = prod.get('name', 'Unknown Product')
                    prod_id = prod.get('product_id', 'N/A')
                    turn = prod.get('turn_introduced', '?')
                    interest = prod.get('user_interest_level', 'medium')
                    
                    # Clear product header
                    context_parts.append(f"{i}. **{name}** (shown in turn {turn}, interest: {interest})")
                    context_parts.append(f"   Product ID: {prod_id}")
                    
                    # Details in readable format
                    if details := prod.get("full_details"):
                        detail_str = ", ".join([f"{k}: {v}" for k, v in details.items() if v is not None])
                        if detail_str:
                            context_parts.append(f"   Details: {detail_str}")
                    
                    # User questions about this product
                    if questions := prod.get("user_questions"):
                        context_parts.append(f"   User asked: {', '.join(questions)}")
                    
                    context_parts.append("")  # Blank line between products
        
        # User preferences - IMPROVED FORMATTING
        if prefs := facts.get("user_preferences"):
            context_parts.append("## 👤 User Preferences:")
            context_parts.append("(Use these to personalize recommendations and responses)")
            context_parts.append("")
            
            for key, value in prefs.items():
                # Format key nicely (size_preferences -> Size Preferences)
                formatted_key = key.replace('_', ' ').title()
                context_parts.append(f"- **{formatted_key}**: {value}")
            context_parts.append("")
        
        # Active context - IMPROVED FORMATTING
        if active := facts.get("active_context"):
            context_parts.append("## 🎯 Current Conversation State:")
            
            if current_feature := active.get("current_feature"):
                context_parts.append(f"- Mode: {current_feature}")
            
            if last_query := active.get("last_query"):
                context_parts.append(f"- Last query: \"{last_query}\"")
            
            if search_filters := active.get("search_filters"):
                filter_str = ", ".join([f"{k}={v}" for k, v in search_filters.items()])
                context_parts.append(f"- Active filters: {filter_str}")
            
            context_parts.append("")
        
        # Decisions made - NEW ADDITION
        if decisions := facts.get("decisions_made"):
            if decisions:  # Only show if there are decisions
                context_parts.append("## ✅ Important Decisions/Statements:")
                for decision in decisions[-5:]:  # Last 5 decisions
                    context_parts.append(f"- {decision}")
                context_parts.append("")
        
        return "\n".join(context_parts)


# Singleton instance
_fact_extractor = None

def get_fact_extractor() -> FactExtractor:
    """Get the global fact extractor instance"""
    global _fact_extractor
    if _fact_extractor is None:
        _fact_extractor = FactExtractor()
    return _fact_extractor
