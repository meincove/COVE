from __future__ import annotations
import json
import logging
import os
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field
from litellm import completion

log = logging.getLogger("cove.context_translator")

class SearchStrategy(BaseModel):
    semantic_query: str = Field(..., description="Optimized search query for vector search (e.g. 'formal wedding guest dress')")
    filters: Dict[str, Any] = Field(..., description="Hard filters (gender, price_max, color, type/category)")
    boost_attributes: List[str] = Field(default_factory=list, description="Attributes to boost in ranking (e.g. 'silk', 'linen', 'breathable')")
    visual_vibe: Optional[str] = Field(None, description="Visual style description for hybrid search (e.g. 'boho chic', 'minimalist')")
    reasoning: str = Field(default="", description="Explanation of the translation strategy")

class ContextTranslator:
    def __init__(self):
        raw_model = os.getenv("GEN_MODEL", "openrouter/openai/gpt-4o-mini")
        # LiteLLM uses forward slash for providers, not colon
        # Convert "openrouter:model" -> "openrouter/model"
        self.model = raw_model.replace("openrouter:", "openrouter/")

    async def translate(self, 
                       query: str, 
                       user_profile: Dict[str, Any], 
                       context_history: List[Dict[str, str]]) -> SearchStrategy:
        """
        Translate user query + profile into a structured SearchStrategy.
        """
        
        system_prompt = """You are a Fashion Context Translator.
Your goal is to translate raw user queries into a precise Search Strategy for a hybrid vector search engine.

INPUTS:
1. User Query: The raw text from the user.
2. User Profile: Known preferences (gender, size, style, budgets).
3. Context: Previous conversation turns.

OUTPUT:
A JSON object with:
- semantic_query: The "translated" query. 
  - IF specific item ("red nike hoodie"): keep it simple ("red nike hoodie").
  - IF vague/occasion ("wedding in summer"): translate to attributes ("formal summer dress breathbale").
- filters: Hard constraints (gender, price_max leading to 'price_max', color, type).
  - ALWAYS extract 'gender' if implied (mens, womens) or in profile.
  - INTELLIGENTLY infer 'type' if possible (wedding -> dress/suit).
- boost_attributes: List of keywords to softer boost (fabric, vibe, brand).
- visual_vibe: Short visual description for vector signaling.

RULES:
- If user profile says "male" and query is "wedding outfit", infer "suit" or "blazer" + "trousers".
- If query is "cheap", set price_max to appropriate budget tier (e.g. 50).
- If query is "something for gym", semantic_query = "activewear gym workout clothes".
"""

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": json.dumps({
                "query": query,
                "user_profile": user_profile,
                "context_summary": context_history[-3:] if context_history else []
            }, indent=2)}
        ]

        try:
            log.info(f"🧠 [CONTEXT] Translating with model: {self.model}")
            response = completion(
                model=self.model,
                messages=messages,
                response_format={"type": "json_object"},
                temperature=0.0
            )
            content = response.choices[0].message.content
            data = json.loads(content)
            strategy = SearchStrategy(**data)
            
            log.info(f"🧠 [CONTEXT] Translated '{query}' -> {strategy.semantic_query}")
            log.debug(f"🧠 [CONTEXT] Full Strategy: {strategy.dict()}")
            return strategy

        except Exception as e:
            log.warning(f"⚠️ [CONTEXT] Primary matching failed ({e}). Retrying with fallback 'gpt-4o-mini'...")
            try:
                # Fallback to standard OpenAI model name if provider string fails
                response = completion(
                    model="gpt-4o-mini",
                    messages=messages,
                    response_format={"type": "json_object"},
                    temperature=0.0
                )
                content = response.choices[0].message.content
                data = json.loads(content)
                strategy = SearchStrategy(**data)
                return strategy
            except Exception as e2:
                log.error(f"❌ [CONTEXT] ALL Translations failed: {e2}")
                # Fallback strategy
                return SearchStrategy(
                    semantic_query=query,
                    filters={},
                    boost_attributes=[],
                    reasoning=f"Fallback due to error: {e2}"
                )

_translator = None

def get_context_translator() -> ContextTranslator:
    global _translator
    if _translator is None:
        _translator = ContextTranslator()
    return _translator
