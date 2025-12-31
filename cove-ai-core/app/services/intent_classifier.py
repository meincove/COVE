"""
LLM-Based Intent Classifier

Replaces hardcoded keyword matching with semantic understanding.
Uses few-shot learning to teach the LLM how to classify user intents.

NO MORE HARDCODED KEYWORDS!
"""

from typing import Dict, Any, Optional, List
from pydantic import BaseModel, Field
import json
import logging

log = logging.getLogger(__name__)


class IntentResult(BaseModel):
    """Result of intent classification"""
    intent: str = Field(..., description="Classified intent")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score")
    reasoning: str = Field(..., description="Why this intent was chosen")
    extracted_entities: Dict[str, Any] = Field(
        default_factory=dict,
        description="Extracted entities (product references, actions, etc.)"
    )


class LLMIntentClassifier:
    """
    Semantic intent classification using LLM + few-shot learning.
    
    Understands user intent from MEANING, not keywords.
    Handles natural language variations and context.
    """
    
    # Intent categories
    PRODUCT_DISCOVERY = "product_discovery"
    PRODUCT_QUESTION = "product_question"
    PRODUCT_COMPARISON = "product_comparison"
    CART_OPERATION = "cart_operation"
    GENERAL_QUESTION = "general_question"
    CHITCHAT = "chitchat"
    
    def __init__(self, llm_client):
        """
        Initialize classifier with LLM client.
        
        Args:
            llm_client: LLM client for making completions
        """
        self.llm = llm_client
        self.few_shot_examples = self._get_few_shot_examples()
    
    def _get_few_shot_examples(self) -> str:
        """
        Few-shot examples teaching the LLM how to classify.
        
        These are EXAMPLES of how to think, not hardcoded rules!
        The LLM learns the pattern and applies it to new queries.
        """
        return """
# Intent Classification Examples

Learn from these examples, then apply the pattern to new queries.

## Product Discovery (user wants to see NEW products)
Examples:
- "show me hoodies" → product_discovery
- "I'm looking for tees" → product_discovery  
- "what bombers do you have?" → product_discovery
- "show me more options" → product_discovery
- "any black hoodies?" → product_discovery
- "I need a jacket for winter" → product_discovery

Pattern: User is asking to SEE products, not asking ABOUT specific products already shown.

## Product Question (asking about ALREADY SHOWN products)
Examples:
- "what's the material of the first one?" → product_question
- "tell me more about that premium tee" → product_question
- "what about the one with relaxed fit?" → product_question
- "how much was that black hoodie you showed?" → product_question
- "the second item, what's it made of?" → product_question
- "that one from earlier, tell me about it" → product_question

Pattern: User is referencing a SPECIFIC product from context (first, second, that one, etc.)

## Product Comparison (comparing multiple products)
Examples:
- "compare the first two" → product_comparison
- "what's the difference between them?" → product_comparison
- "which one is warmer?" → product_comparison
- "how do these hoodies differ?" → product_comparison
- "which should I choose?" → product_comparison

Pattern: User wants to COMPARE multiple products (difference, which, compare)

## Cart Operation (cart/checkout actions)
Examples:
- "add the first one to cart" → cart_operation
- "add to cart" → cart_operation
- "remove from cart" → cart_operation
- "checkout" → cart_operation
- "put it in my cart" → cart_operation

Pattern: User wants to take ACTION on cart (add, remove, checkout)

## General Question (brand/policy questions)
Examples:
- "what's your return policy?" → general_question
- "do you ship internationally?" → general_question
- "tell me about Cove" → general_question
- "what sizes do you have?" → general_question

Pattern: User asking about BRAND, POLICIES, or GENERAL info (not specific products)

## Chitchat (casual conversation)
Examples:
- "hey" → chitchat
- "thanks!" → chitchat
- "that's cool" → chitchat
- "awesome" → chitchat

Pattern: Casual conversation, no specific request
"""
    
    async def classify(
        self, 
        user_message: str,
        conversation_context: Optional[Dict[str, Any]] = None
    ) -> IntentResult:
        """
        Classify user intent using LLM semantic understanding.
        
        Args:
            user_message: What the user said
            conversation_context: Recent products shown, history, etc.
            
        Returns:
            IntentResult with intent, confidence, and reasoning
        """
        
        # Build context summary
        context_summary = self._build_context_summary(conversation_context)
        
        # LLM prompt for intent classification
        prompt = f"""You are an intent classifier for a conversational AI shopping assistant.

Your job: Understand what the user WANTS from their message, not just match keywords.

{self.few_shot_examples}

## Current Conversation Context
{context_summary}

## User's Message
"{user_message}"

## Your Task
Analyze the user's message and determine their intent.

Think step by step:
1. What is the user trying to accomplish?
2. Are they asking about products already shown? (check context above)
3. Do they want to see NEW products?
4. Are they comparing products?
5. Do they want to take an action (cart, checkout)?

Return ONLY valid JSON (no markdown, no code blocks):
{{
    "intent": "product_discovery|product_question|product_comparison|cart_operation|general_question|chitchat",
    "confidence": 0.85,
    "reasoning": "Brief explanation of why you chose this intent",
    "extracted_entities": {{
        "product_reference": "first|second|that premium one|etc (if applicable)",
        "product_type": "hoodie|tee|etc (if applicable)",
        "action": "add|remove|compare|etc (if applicable)"
    }}
}}

Return ONLY the JSON, nothing else."""
        
        try:
            # Call LLM
            response = await self.llm.complete(prompt, temperature=0.1, max_tokens=300)
            
            # Clean response (remove markdown code blocks if present)
            response = response.strip()
            if response.startswith("```"):
                # Remove markdown code blocks
                lines = response.split("\n")
                response = "\n".join(lines[1:-1]) if len(lines) > 2 else response
            
            # Parse JSON response
            result_dict = json.loads(response)
            result = IntentResult(**result_dict)
            
            log.info(
                f"Intent classified: {result.intent} "
                f"(confidence: {result.confidence:.2f}) - {result.reasoning}"
            )
            
            return result
            
        except json.JSONDecodeError as e:
            log.error(f"Failed to parse LLM response as JSON: {e}\nResponse: {response}")
            # Fallback: try to extract intent from response text
            return self._fallback_classification(user_message, response)
            
        except Exception as e:
            log.error(f"Intent classification failed: {e}", exc_info=True)
            # Safe fallback
            return IntentResult(
                intent=self.GENERAL_QUESTION,
                confidence=0.5,
                reasoning=f"Classification failed: {str(e)}"
            )
    
    def _fallback_classification(self, user_message: str, llm_response: str) -> IntentResult:
        """
        Fallback classification when JSON parsing fails.
        Try to extract intent from LLM response text.
        """
        response_lower = llm_response.lower()
        
        # Try to find intent in response
        if "product_discovery" in response_lower:
            intent = self.PRODUCT_DISCOVERY
        elif "product_question" in response_lower:
            intent = self.PRODUCT_QUESTION
        elif "product_comparison" in response_lower:
            intent = self.PRODUCT_COMPARISON
        elif "cart_operation" in response_lower:
            intent = self.CART_OPERATION
        elif "chitchat" in response_lower:
            intent = self.CHITCHAT
        else:
            intent = self.GENERAL_QUESTION
        
        return IntentResult(
            intent=intent,
            confidence=0.6,
            reasoning="Extracted from non-JSON LLM response"
        )
    
    def _build_context_summary(self, context: Optional[Dict[str, Any]]) -> str:
        """
        Build a concise summary of conversation context.
        
        Args:
            context: Conversation context with products shown, etc.
            
        Returns:
            Human-readable context summary
        """
        if not context:
            return "No products shown yet in this conversation."
        
        products_shown = context.get("products_shown", [])
        if not products_shown:
            return "No products shown yet in this conversation."
        
        # Build summary of products shown
        summary_lines = ["Products shown in this conversation:"]
        for i, product in enumerate(products_shown[:5], 1):  # Limit to 5 for context window
            name = product.get("name", "Unknown")
            tier = product.get("tier", "")
            summary_lines.append(f"{i}. {name} ({tier} tier)")
        
        if len(products_shown) > 5:
            summary_lines.append(f"... and {len(products_shown) - 5} more products")
        
        return "\n".join(summary_lines)


# Factory function for easy instantiation
def get_intent_classifier(llm_client) -> LLMIntentClassifier:
    """
    Get an intent classifier instance.
    
    Args:
        llm_client: LLM client for making completions
        
    Returns:
        LLMIntentClassifier instance
    """
    return LLMIntentClassifier(llm_client)
