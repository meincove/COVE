"""
Intent Classifier MCP Agent
Semantic intent classification using LLM with conversation context
NO HARDCODED CONFIGS - Pure few-shot learning
"""

from typing import Dict, List, Optional, Tuple, Any
import json
import os
import logging

log = logging.getLogger(__name__)


class IntentClassifier:
    """
    LLM-based intent classification with conversation context awareness.
    
    No config files, no hardcoded keywords - pure semantic understanding.
    """
    
    # Intent categories (no config file needed!)
    PRODUCT_DISCOVERY = "recommendations"
    PRODUCT_QUESTION = "product_question"
    PRODUCT_COMPARISON = "product_comparison"
    CART_OPERATION = "cart_proposal"
    CHECKOUT = "checkout_ready"
    SIZE_HELP = "size_help"
    QUALITY_QUESTION = "quality_question"
    ORDER_HISTORY = "order_history"
    OUTFIT_BUILDER = "outfit_builder"  # NEW: Build complete outfits
    GREETING = "greeting"
    NONE = "none"
    
    def __init__(self):
        """Initialize classifier - no config file needed!"""
        self.few_shot_examples = self._get_few_shot_examples()
    
    def _get_few_shot_examples(self) -> str:
        """
        Few-shot examples teaching the LLM how to classify.
        
        These are EXAMPLES of reasoning, not hardcoded rules!
        """
        return """
# Intent Classification Examples

Learn the PATTERN from these examples, then apply to new queries.

## Product Discovery (user wants to see NEW products)
- "show me hoodies" → recommendations
- "I'm looking for tees" → recommendations  
- "what bombers do you have?" → recommendations
- "show me more options" → recommendations
- "any black hoodies?" → recommendations

Pattern: User wants to BROWSE/SEE products, not asking about specific ones already shown.

## Product Question (asking about ALREADY SHOWN products)
- "what's the material of the first one?" → product_question
- "tell me more about that premium tee" → product_question
- "what about the second one?" → product_question
- "how much was that black hoodie you showed?" → product_question
- "the one with relaxed fit, tell me about it" → product_question

Pattern: User references SPECIFIC product from context (first, second, that one, etc.)

## Product Comparison (comparing multiple products)
- "compare the first two" → product_comparison
- "what's the difference between them?" → product_comparison
- "which one is warmer?" → product_comparison

Pattern: User wants to COMPARE products (difference, which, compare)

## Cart Operation (add/remove from cart)
- "add the first one to cart" → cart_proposal
- "add to cart" → cart_proposal
- "I'll take it" → cart_proposal
- "cop this" → cart_proposal

Pattern: User wants to ADD product to cart

## Checkout (ready to pay)
- "checkout" → checkout_ready
- "pay now" → checkout_ready
- "complete order" → checkout_ready

Pattern: User wants to COMPLETE purchase

## Size Help (sizing questions)
- "what size should I get?" → size_help
- "does it run small?" → size_help
- "fit guide" → size_help

Pattern: User asking about SIZING/FIT

## Quality Question (product quality)
- "is it good quality?" → quality_question
- "what's the material like?" → quality_question
- "how's the fabric?" → quality_question

Pattern: User asking about QUALITY/MATERIALS

## Order History (tracking orders)
- "where's my order?" → order_history
- "track my package" → order_history
- "order status" → order_history

Pattern: User asking about PAST orders

## Outfit Builder (build complete outfits)
- "build me an outfit" → outfit_builder
- "create an outfit for a date" → outfit_builder
- "style me for a wedding" → outfit_builder
- "put together a casual look" → outfit_builder
- "I need a complete outfit" → outfit_builder
- "casual outfit" → outfit_builder
- "formal outfit" → outfit_builder
- "date night outfit" → outfit_builder
- "business outfit" → outfit_builder
- "weekend outfit" → outfit_builder
- "what should I wear to a party" → outfit_builder
- "help me dress for an interview" → outfit_builder
- "outfit for summer" → outfit_builder
- "smart casual look" → outfit_builder

Pattern: User wants a COMPLETE OUTFIT built (multiple items that go together). Key words: "outfit", "look", "style me", "dress for", "wear to"

## Greeting (casual greetings)
- "hey" → greeting
- "hello" → greeting
- "hi there" → greeting

Pattern: Casual greeting, no specific request
"""
    
    async def classify(self, query: str, context: Optional[Dict] = None) -> Dict[str, Any]:
        """
        Classify user query into intent using conversation context.
        
        Args:
            query: User's query text
            context: Conversation context with products shown, etc.
        
        Returns:
            {
                "intent": str,
                "confidence": float,
                "reasoning": str,
                "entities": dict
            }
        """
        if context is None:
            context = {}
        
        # Use LLM for semantic classification with context
        intent, confidence, reasoning = await self._llm_classify_with_context(query, context)
        
        return {
            "intent": intent,
            "confidence": confidence,
            "reasoning": reasoning,
            "entities": {},
            "classification_method": "llm_with_context"
        }
    
    async def _llm_classify_with_context(self, query: str, context: Dict) -> Tuple[str, float, str]:
        """
        LLM-based classification with conversation context.
        
        This is the key enhancement - passes products shown to LLM!
        """
        from litellm import acompletion
        
        # Build context summary
        context_summary = self._build_context_summary(context)
        
        # Build prompt with few-shot examples + context
        system_prompt = f"""You are an intent classifier for a conversational AI shopping assistant.

Your job: Understand what the user WANTS from their message, using conversation context.

{self.few_shot_examples}

## Current Conversation Context
{context_summary}

## Classification Rules
1. If user references products from context (first, second, that one) → product_question
2. If user wants to see NEW products → recommendations
3. If user wants to compare products → product_comparison
4. If user wants to add to cart → cart_proposal
5. If user wants to checkout → checkout_ready
6. If user asks about sizing → size_help
7. If user asks about quality → quality_question
8. If user asks about orders → order_history
9. If user wants a COMPLETE OUTFIT built → outfit_builder
10. If casual greeting → greeting
11. If off-topic → none

**Critical**: Use the context above to understand references like "first one", "second one", "that premium tee"

Output ONLY the intent name (e.g., "recommendations"), nothing else.
"""
        
        print(f"🔍 [INTENT_CLASSIFIER] Classifying: '{query}'")
        try:
            model = os.getenv("INTENT_CLASSIFIER_MODEL", "openrouter/openai/gpt-4o-mini")
            
            response = await acompletion(
                model=model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Query: {query}"}
                ],
                api_key=os.getenv("OPENROUTER_API_KEY"),
                temperature=0.1,
                max_tokens=50,
                extra_headers={
                    "HTTP-Referer": "http://localhost:8000",
                    "X-Title": "COVE AI Intent Classifier"
                }
            )
            
            result = response.choices[0].message.content.strip().lower()
            
            # Extract intent (should be just the intent name)
            intent = result.split()[0] if result.split() else self.NONE
            
            # Map to valid intents
            valid_intents = {
                "recommendations", "product_question", "product_comparison",
                "cart_proposal", "checkout_ready", "size_help",
                "quality_question", "order_history", "outfit_builder",
                "greeting", "none"
            }
            
            if intent not in valid_intents:
                print(f"⚠️ [INTENT_CLASSIFIER] Invalid intent '{intent}', defaulting to 'none'")
                log.warning(f"Invalid intent '{intent}' from LLM, defaulting to 'none'")
                intent = self.NONE
            
            print(f"✅ [INTENT_CLASSIFIER] Result: {intent} (conf: 0.90)")
            log.info(f"Intent classified: {intent} (confidence: 0.90) for query: '{query[:50]}'")
            
            return intent, 0.90, result
        
        except Exception as e:
            print(f"❌ [INTENT_CLASSIFIER] Failed: {e}")
            log.error(f"Intent classification failed: {e}", exc_info=True)
            return self.NONE, 0.5, str(e)
    
    def _build_context_summary(self, context: Dict) -> str:
        """
        Build conversation context summary for LLM.
        
        This is KEY - tells LLM what products were shown!
        """
        products_shown = context.get("products_shown", [])
        
        if not products_shown:
            return "No products shown yet in this conversation."
        
        summary_lines = ["Products shown in this conversation:"]
        for i, product in enumerate(products_shown[:5], 1):
            name = product.get("name", "Unknown")
            tier = product.get("tier", "")
            summary_lines.append(f"{i}. {name} ({tier} tier)")
        
        if len(products_shown) > 5:
            summary_lines.append(f"... and {len(products_shown) - 5} more products")
        
        return "\n".join(summary_lines)


# Singleton instance
_classifier = None

def get_classifier() -> IntentClassifier:
    """Get or create singleton classifier"""
    global _classifier
    if _classifier is None:
        _classifier = IntentClassifier()
    return _classifier
