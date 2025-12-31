"""
PreferenceExtractor - Week 2 Day 3
LLM-powered preference extraction from user statements

Parses natural language into structured preferences:
- "I hate hoodies" → dislikes: ["hoodie"]
- "I love navy and black" → colors: ["navy", "black"]
- "I prefer slim fit" → fits: ["slim"]
"""

import litellm
from typing import Dict, List, Optional
import json
import logging
import os

log = logging.getLogger(__name__)


class PreferenceExtractor:
    """
    Extract structured fashion preferences from user statements using LLM.
    
    Examples:
        >>> extractor = PreferenceExtractor()
        >>> prefs = await extractor.extract("I hate hoodies and bright colors")
        >>> # Returns: {"dislikes": ["hoodie", "bright_colors"], ...}
    """
    
    def __init__(self, model: Optional[str] = None):
        """Initialize with model from env (GEN_MODEL) or explicit override"""
        self.model = model or os.getenv("GEN_MODEL", "openrouter/openai/gpt-4o-mini")
    
    async def extract(self, statement: str) -> Dict:
        """
        Extract preferences from a user statement.
        
        Args:
            statement: Natural language user input
            
        Returns:
            {
                "colors": ["navy", "black"],
                "dislikes": ["hoodie"],
                "likes": ["slim_fit"],
                "styles": ["minimalist"],
                "formality": 7,
                "confidence": 0.9
            }
        """
        try:
            response = await litellm.acompletion(
                model=self.model,
                messages=[{
                    "role": "system",
                    "content": """You're a fashion preference analyst. Extract structured preferences from user statements.

Return JSON with these fields:
{
    "colors": ["navy", "black"],  // Preferred colors mentioned
    "dislikes": ["hoodie", "patterns"],  // Things they hate/dislike/avoid
    "likes": ["slim_fit", "blazer"],  // Things they love/prefer/want
    "styles": ["minimalist", "professional"],  // Style descriptors
    "formality": 7,  // 1-10 if mentioned (1=casual, 10=formal)
    "occasions": ["work", "meetings"],  // Mentioned occasions
    "confidence": 0.9  // How confident are you? (0-1)
}

EXTRACTION RULES:
1. **Dislikes**: "hate", "dislike", "avoid", "don't want", "not into"
2. **Likes**: "love", "prefer", "want", "like", "into"
3. **Colors**: Extract exact color names (navy, black, grey, red, etc.)
4. **Items**: Extract product types (hoodie, blazer, jeans, etc.)
5. **Formality**: Infer from context (professional=7-9, casual=3-5)

IMPORTANT:
- Only extract what's explicitly mentioned
- Don't infer too much
- Empty arrays if nothing found
- Be specific with item names (don't just say "clothing")

Examples:

Input: "I hate hoodies, they make me look sloppy"
Output: {"dislikes": ["hoodie"], "likes": [], "colors": [], "styles": [], "formality": null, "occasions": [], "confidence": 0.95}

Input: "I love navy and black colors for work"
Output: {"colors": ["navy", "black"], "dislikes": [], "likes": [], "styles": [], "formality": 7, "occasions": ["work"], "confidence": 0.9}

Input: "I prefer slim fit clothing, especially blazers"
Output: {"likes": ["slim_fit", "blazer"], "dislikes": [], "colors": [], "styles": [], "formality": null, "occasions": [], "confidence": 0.85}

Input: "Need professional outfits for office meetings"
Output: {"styles": ["professional"], "occasions": ["office", "meeting"], "dislikes": [], "likes": [], "colors": [], "formality": 8, "confidence": 0.8}

Input: "Avoid bright colors and patterns"
Output: {"dislikes": ["bright_colors", "patterns"], "likes": [], "colors": [], "styles": [], "formality": null, "occasions": [], "confidence": 0.9}"""
                }, {
                    "role": "user",
                    "content": f"Extract preferences from: \"{statement}\"\n\nReturn only valid JSON."
                }],
                response_format={"type": "json_object"},
                timeout=15
            )
            
            preferences = json.loads(response.choices[0].message.content)
            
            # Validate and clean
            result = {
                "colors": preferences.get("colors", []),
                "dislikes": preferences.get("dislikes", []),
                "likes": preferences.get("likes", []),
                "styles": preferences.get("styles", []),
                "formality": preferences.get("formality"),
                "occasions": preferences.get("occasions", []),
                "confidence": preferences.get("confidence", 0.7),
                "original_statement": statement
            }
            
            log.info(f"Extracted preferences: {result}")
            return result
            
        except Exception as e:
            log.error(f"Failed to extract preferences: {e}")
            # Return empty preferences on failure
            return {
                "colors": [],
                "dislikes": [],
                "likes": [],
                "styles": [],
                "formality": None,
                "occasions": [],
                "confidence": 0.0,
                "original_statement": statement
            }
    
    async def extract_and_categorize(self, statement: str) -> Dict[str, List[str]]:
        """
        Extract and categorize for easy storage.
        
        Returns categories ready for UserProfile storage:
        {
            "color_preferences": ["navy", "black"],
            "dislikes": ["hoodie", "bright_colors"],
            "fit_preferences": ["slim"],
            "style_tags": ["minimalist", "professional"]
        }
        """
        prefs = await self.extract(statement)
        
        # Extract fit preferences from likes
        fit_keywords = ["slim", "regular", "oversized", "fitted", "relaxed", "loose"]
        fit_prefs = [like for like in prefs["likes"] if any(fit in like.lower() for fit in fit_keywords)]
        
        # Non-fit likes are style tags or product preferences
        other_likes = [like for like in prefs["likes"] if like not in fit_prefs]
        
        return {
            "color_preferences": prefs["colors"],
            "dislikes": prefs["dislikes"],
            "fit_preferences": fit_prefs,
            "style_tags": prefs["styles"] + other_likes,
            "formality": prefs.get("formality"),
            "confidence": prefs["confidence"]
        }


# Convenience functions
async def extract_preferences(statement: str) -> Dict:
    """Quick extraction without creating instance"""
    extractor = PreferenceExtractor()
    return await extractor.extract(statement)
