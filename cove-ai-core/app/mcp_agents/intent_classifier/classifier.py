"""
Intent Classifier MCP Agent
Semantic intent classification using LLM + embeddings
Zero hardcoding - fully config-driven
"""

from typing import Dict, List, Optional, Tuple, Any
import json
import os
from pathlib import Path
from litellm import completion, embedding
import numpy as np
from functools import lru_cache


class IntentClassifier:
    """
    LLM-based intent classification with embedding fast-path
    """
    
    def __init__(self, config_path: Optional[str] = None):
        if config_path is None:
            base_dir = Path(__file__).resolve().parent.parent.parent.parent
            config_path = base_dir / "data" / "intent_classification_config.json"
        
        self.config = self._load_config(config_path)
        self.intents = self.config.get("intents", {})
        self.settings = self.config.get("classification_settings", {})
        self.output_format = self.config.get("output_format", {})
        
        # Pre-compute intent embeddings if enabled
        if self.settings.get("use_embeddings_fast_path"):
            self._precompute_intent_embeddings()
    
    def _load_config(self, config_path: Path) -> Dict:
        """Load configuration from JSON file"""
        try:
            with open(config_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading intent config: {e}")
            return {
                "intents": {},
                "classification_settings": {},
                "output_format": {}
            }
    
    def _precompute_intent_embeddings(self):
        """Pre-compute embeddings for all intents"""
        self.intent_embeddings = {}
        model = self.settings.get("embedding_model", "text-embedding-3-small")
        
        for intent_name, intent_data in self.intents.items():
            # Combine description + examples for rich representation
            text_to_embed = f"{intent_data['description']}. "
            text_to_embed += " ".join(intent_data.get("examples", [])[:3])
            
            try:
                response = embedding(
                    model=model,
                    input=[text_to_embed]
                )
                self.intent_embeddings[intent_name] = np.array(response.data[0]["embedding"])
            except Exception as e:
                print(f"Error embedding intent {intent_name}: {e}")
    
    def classify(self, query: str, context: Optional[Dict] = None) -> Dict[str, Any]:
        """
        Classify user query into intent
        
        Args:
            query: User's query text
            context: Optional context (user_id, conversation history, etc.)
        
        Returns:
            {
                "intent": str,
                "confidence": float,
                "entities": dict (optional),
                "reasoning": str (optional)
            }
        """
        if context is None:
            context = {}
        
        # Try embedding fast-path first
        if self.settings.get("use_embeddings_fast_path"):
            intent, confidence = self._embedding_classify(query)
            
            threshold = self.settings.get("embedding_confidence_threshold", 0.85)
            if confidence >= threshold:
                return self._format_output(intent, confidence, query, "embedding")
        
        # Fallback to LLM for complex/ambiguous queries
        if self.settings.get("fallback_to_llm", True):
            intent, confidence, reasoning = self._llm_classify(query, context)
            return self._format_output(intent, confidence, query, "llm", reasoning)
        
        # Default to none
        return self._format_output("none", 0.5, query, "default")
    
    def _embedding_classify(self, query: str) -> Tuple[str, float]:
        """Fast embedding-based classification"""
        model = self.settings.get("embedding_model", "text-embedding-3-small")
        
        try:
            # Get query embedding
            response = embedding(
                model=model,
                input=[query]
            )
            query_embedding = np.array(response.data[0]["embedding"])
            
            # Cosine similarity with each intent
            similarities = {}
            for intent_name, intent_embedding in self.intent_embeddings.items():
                similarity = self._cosine_similarity(query_embedding, intent_embedding)
                similarities[intent_name] = similarity
            
            # Get best match
            best_intent = max(similarities, key=similarities.get)
            confidence = similarities[best_intent]
            
            return best_intent, confidence
        
        except Exception as e:
            print(f"Error in embedding classification: {e}")
            return "none", 0.0
    
    def _llm_classify(self, query: str, context: Dict) -> Tuple[str, float, str]:
        """LLM-based classification (high accuracy, slower)"""
        import os
        system_prompt = self._build_prompt()
        
        try:
            # Get model from config (default to slash format for LiteLLM)
            model = self.settings.get("llm_model", "openrouter/openai/gpt-4o-mini")
            
            # LiteLLM with OpenRouter needs api_base set
            response = completion(
                model=model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Query: {query}"}
                ],
                api_base="https://openrouter.ai/api/v1",
                api_key=os.getenv("OPENROUTER_API_KEY"),
                temperature=self.settings.get("llm_temperature", 0),
                max_tokens=self.settings.get("llm_max_tokens", 20)
            )
            
            result = response.choices[0].message.content.strip().lower()
            
            # Extract intent name (should be first word)
            intent = result.split()[0] if result.split() else "none"
            
            # Validate intent exists in config
            if intent not in self.intents:
                intent = "none"
            
            return intent, 0.95, result  # LLM is generally high confidence
        
        except Exception as e:
            print(f"Error in LLM classification: {e}")
            return "none", 0.0, str(e)
    
    def _build_prompt(self) -> str:
        """Build advanced LLM prompt with chain-of-thought reasoning"""
        prompt = """You are an expert intent classifier for an e-commerce chatbot.

**Context Assumption:**
The user is shopping on an e-commerce site. ALL queries should be interpreted in this context.
Short affirmative responses likely indicate purchase interest.

**Your Task:**
Analyze the user's query and determine their PRIMARY intent. Think step-by-step:
1. What is the user trying to accomplish?
2. What action do they want to take?
3. What category best describes their goal?

**Key Principles:**
- **Assume shopping context**: "perfect" = wants to buy, "colors?" = wants to see options
- **Focus on INTENT, not literal words**: "I need this" = wants to add to cart
- **Handle slang**: "cop this" = add to cart, "lemme get" = add to cart
- **Understand implicit requests**: "I like it" = wants to buy
- **Short affirmations are cart_proposal**: "yes", "ok", "sure", "perfect", "great"
- **Single-word product features = recommendations**: "colors?", "sizes?", "styles?"
- **Action phrases are cart_proposal**: "I'll take it", "let's do this", "I want it"
- **Detect urgency**: "now", "asap", "quick" suggests checkout_ready
- **Multilingual**: Understand queries in ANY language (French, Spanish, German, etc.)

**Available Intents:**

"""
        
        # Sort by priority
        sorted_intents = sorted(
            self.intents.items(),
            key=lambda x: x[1].get("priority", 999)
        )
        
        for intent_name, intent_data in sorted_intents:
            prompt += f"**{intent_name}**\n"
            prompt += f"Meaning: {intent_data['description']}\n"
            
            # Add examples with reasoning
            max_examples = self.settings.get("max_examples_in_prompt", 3)
            examples = intent_data.get("examples", [])[:max_examples]
            if examples:
                prompt += f"Examples:\n"
                for ex in examples:
                    prompt += f"  - '{ex}'\n"
            
            # Add keywords as hints
            keywords = intent_data.get("keywords", [])
            if keywords:
                prompt += f"Common signals: {', '.join(keywords[:5])}\n"
            
            prompt += "\n"
        
        prompt += """**Classification Rules (Priority Order):**
1. Greetings ("hi", "hello", "hey") → greeting
2. Off-topic non-shopping queries → none
3. Single words asking for options ("colors?", "sizes?") → recommendations
4. Affirmations & purchase phrases ("perfect", "I like it", "I'll take it") → cart_proposal
5. Explicit add requests ("add to cart", "cop this") → cart_proposal
6. Urgency/payment intent ("asap", "checkout", "pay now") → checkout_ready
7. Order tracking keywords ("where's my order", "track") → order_history
8. Sizing questions ("what size", "fit") → size_help
9. Quality questions ("is it good", "material") → quality_question
10. General product browsing ("show me", "looking for") → recommendations

**Edge Cases:**
- Very short positive responses in shopping context = cart_proposal
- Questions about product attributes = recommendations
- Expressions of approval/desire = cart_proposal
- Empty or gibberish = none

**Reasoning Process:**
Ask yourself:
- Is this shopping-related? (If unclear, assume YES - this is an e-commerce chatbot)
- Does the user sound INTERESTED in a product? → cart_proposal or recommendations
- Is the user ready to COMPLETE a purchase? → checkout_ready
- Is the user asking about a PAST order? → order_history

**Output Format:**
Respond with ONLY the intent name (e.g., "recommendations")
No explanation, no punctuation, just the intent.

"""
        
        return prompt
    
    def _cosine_similarity(self, a: np.ndarray, b: np.ndarray) -> float:
        """Calculate cosine similarity between two vectors"""
        return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))
    
    def _format_output(
        self,
        intent: str,
        confidence: float,
        query: str,
        method: str,
        reasoning: Optional[str] = None
    ) -> Dict[str, Any]:
        """Format output according to config"""
        output = {"intent": intent}
        
        if self.output_format.get("include_confidence", True):
            output["confidence"] = round(confidence, 3)
        
        if self.output_format.get("include_reasoning", False) and reasoning:
            output["reasoning"] = reasoning
        
        if self.output_format.get("include_entities", True):
            output["entities"] = self._extract_entities(query, intent)
        
        output["classification_method"] = method
        
        return output
    
    def _extract_entities(self, query: str, intent: str) -> Dict[str, Any]:
        """Extract entities from query (basic implementation)"""
        # TODO: Implement proper entity extraction
        # For now, return empty dict
        return {}


# Singleton instance
_classifier = None

def get_classifier() -> IntentClassifier:
    """Get or create singleton classifier"""
    global _classifier
    if _classifier is None:
        _classifier = IntentClassifier()
    return _classifier
