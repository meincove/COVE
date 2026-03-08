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
    SHOW_MORE = "show_more"  # NEW: User wants more of the same type
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

## Product Discovery (user wants to see NEW/DIFFERENT products)
- "show me hoodies" → recommendations
- "I'm looking for tees" → recommendations  
- "what bombers do you have?" → recommendations
- "any black hoodies?" → recommendations

Pattern: User wants to BROWSE/SEE a specific product type, not asking about ones already shown.

## Show More (user wants MORE of the SAME type already shown)
- "show me more options" → show_more
- "got anything else?" → show_more
- "I'm not impressed" → show_more
- "these aren't what I'm looking for" → show_more
- "what else you got?" → show_more
- "meh, next" → show_more
- "show me alternatives" → show_more
- "any other options?" → show_more
- "not feeling these" → show_more
- "keep going" → show_more
- "more like this" → show_more

Pattern: User wants to see MORE products of the SAME type they were just shown. They're not specifying a new type - they want alternatives to what's on screen.

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

## Cart Operation (add ALREADY SHOWN product to cart)
- "add the first one to cart" → cart_proposal
- "I'll take it" → cart_proposal  (ONLY if products were already shown!)
- "cop this" → cart_proposal  (ONLY if products were already shown!)
- "add the black one" → cart_proposal  (ONLY if a black product was shown!)
- "buy the second option" → cart_proposal  (referencing already-shown product)
- "get me that hoodie you showed" → cart_proposal  (referencing already-shown product)

Pattern: User wants to ADD an ALREADY SHOWN product to cart. They must REFERENCE a product from context (first one, second, this, it, that hoodie, the black one, etc.). 

CRITICAL DISTINCTION - "buy/want/get" with a NEW product type:
- "I want to buy black hoodie" → recommendations  (NO products shown yet! Show products first)
- "buy me some sneakers" → recommendations  (searching for sneakers, not adding to cart)
- "I want to get a jacket" → recommendations  (product discovery, not cart add)
- "looking to buy jeans" → recommendations  (product discovery for jeans)

ONLY classify as cart_proposal if:
1. Products have ALREADY been shown in context, AND
2. User is REFERENCING those specific shown products (first, second, this, it, the one with...)

If user says "buy/want/get" + a product type they haven't seen yet, classify as "recommendations" to SHOW them products first.

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

## Outfit Builder (EXPLICIT outfit requests only!)
- "build me an outfit" → outfit_builder
- "create an outfit for a date" → outfit_builder
- "style me for a wedding" → outfit_builder
- "put together a casual look" → outfit_builder
- "I need a complete outfit" → outfit_builder
- "casual outfit please" → outfit_builder
- "formal outfit for work" → outfit_builder
- "weekend outfit" → outfit_builder
- "what should I wear to a party" → outfit_builder
- "help me dress for an interview" → outfit_builder
- "got a job interview, what do you suggest?" → outfit_builder
- "meeting with clients tomorrow, suggestions?" → outfit_builder
- "date night tonight, any ideas?" → outfit_builder
- "first day at new job, what should I wear?" → outfit_builder

Pattern: User asks for OUTFIT or STYLING ADVICE. Key triggers: "outfit", "look" (as noun), "style me", "dress me", "wear to", OR asking "what should I wear/suggest" for a SPECIFIC OCCASION (interview, date, wedding, meeting).

## Recommendations (Vague occasion-based queries - NO explicit outfit keyword)
- "looking for something casual" → recommendations  # "looking" is a verb, NOT "look" as outfit noun
- "need something for the weekend" → recommendations  # no "outfit/look" = browse products
- "something formal for work" → recommendations  # vague, just show products
- "casual weekend wear" → recommendations  # no "outfit" mentioned
- "something nice for a date" → recommendations  # no "outfit/look" = browse

Pattern: User mentions an occasion/style but does NOT explicitly say "outfit", "look", "style me". They just want to browse products, not build a complete coordinated outfit.

CRITICAL: "looking FOR something" ≠ "a casual LOOK". 
- "looking for casual clothes" → recommendations (verb form, browsing)
- "casual look for the weekend" → outfit_builder (noun form, outfit request)

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
        # Returns: intent, confidence, extra_data (dict or str)
        intent, confidence, extra_data = await self._llm_classify_with_context(query, context)
        
        reasoning = ""
        entities = {}
        
        if isinstance(extra_data, dict):
            reasoning = extra_data.get("reasoning", "")
            entities = extra_data.get("filters", {})
        else:
            reasoning = str(extra_data)
        
        return {
            "intent": intent,
            "confidence": confidence,
            "reasoning": reasoning,
            "entities": entities,
            "classification_method": "llm_with_context"
        }
    
    async def _llm_classify_with_context(self, query: str, context: Dict) -> Tuple[str, float, Any]:
        """
        LLM-based classification with conversation context + Slot Filling.
        Returns: (intent, confidence, {"filters": {...}, "reasoning": "..."})
        """
        from litellm import acompletion
        
        # Build context summary
        context_summary = self._build_context_summary(context)
        
        # Build prompt: Request JSON with Intent + Filters
        system_prompt = f"""You are an intent classifier and slot filler for a conversational AI shopping assistant.

Your job: 
1. Classify the user's INTENT (what they want to do).
2. Extract any FILTERS or ENTITIES (price, color, sort order, etc.).

{self.few_shot_examples}

## Filter Extraction Rules
Extract these specific fields into "filters" object if present:
- `price_min` (float): Minimum price
- `price_max` (float): Maximum price
- `sort` (str): 'price_asc' (if user asks for cheapest, lowest price, budget), 'price_desc' (expensive, premium, luxury)
- `type` (str): Product type (hoodie, tee, etc.)
- `brand` (str): Brand name (e.g., Aura Minimalist, Vortex Streetwear, etc.)
- `color` (str): Color name
- `gender` (str): CRITICAL! Extract gender from context:
  - 'male' if: "boyfriend", "husband", "for him", "for my guy", "men's", "mens", "for men", "male", "son", "brother", "dad", "father"
  - 'female' if: "girlfriend", "wife", "for her", "for my girl", "women's", "womens", "for women", "female", "daughter", "sister", "mom", "mother"
  - Leave empty if unclear/unisex
- `fit` (str): 'oversized', 'slim', 'regular', etc.
- `size` (str): S, M, L, XL, etc.
- `height_cm` (int): User height in cm
- `weight_kg` (int): User weight in kg
- `facet_query` (str): The attribute user is asking about (e.g., 'color', 'fabric', 'style')
- `target_index` (int): 0-based index if user refers to a specific item (0 for "first", 1 for "second").

## Current Conversation Context
{context_summary}

## Output Format
Return ONLY a valid JSON object:
{{
  "intent": "cart_proposal",
  "filters": {{
      "target_index": 0,
      "quantity": 1
  }},
  "reasoning": "User wants to buy the first item"
}}
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
                temperature=0.0,
                max_tokens=300,  # Increased for larger JSON
                response_format={ "type": "json_object" },
                extra_headers={
                    "HTTP-Referer": os.getenv("COVE_CORE_BASE_URL", "http://localhost:8000"),
                    "X-Title": "COVE AI Intent Classifier"
                }
            )
            
            content = response.choices[0].message.content.strip()
            # Safety cleanup for markdown
            if content.startswith("```json"):
                content = content.replace("```json", "").replace("```", "").strip()
            
            data = json.loads(content)
            intent = data.get("intent", self.NONE).lower()
            filters = data.get("filters", {})
            reasoning = data.get("reasoning", "")
            
            # Sanitize intent
            valid_intents = {
                "recommendations", "product_question", "product_comparison",
                "cart_proposal", "checkout_ready", "size_help",
                "quality_question", "order_history", "outfit_builder",
                "show_more", "greeting", "none"
            }
            if intent not in valid_intents:
                intent = self.NONE
            
            # Heuristic: If we extracted filters but intent is none/greeting, it's likely a search
            if intent in (self.NONE, "greeting") and any(k in filters for k in ("type", "price_max", "price_min", "sort", "gender", "fit", "size")):
                print(f"⚠️ [INTENT_CLASSIFIER] Intent '{intent}' but filters found {filters.keys()} -> promoting to 'recommendations'")
                intent = "recommendations"
            
            print(f"✅ [INTENT_CLASSIFIER] Intent: {intent}, Filters: {filters}")
            log.info(f"Intent: {intent}, Filters: {filters}")
            
            return intent, 0.90, {"filters": filters, "reasoning": reasoning}
            
        except Exception as e:
            print(f"❌ [INTENT_CLASSIFIER] Failed: {e}")
            log.error(f"Intent classification failed: {e}", exc_info=True)
            return self.NONE, 0.5, {}
    
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
