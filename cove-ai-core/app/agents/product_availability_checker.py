"""
Product Availability Checker - Phase 1.5 Day 8
Intelligently handle unavailable products with honest alternatives.

When user asks for "dark blue shirt" but we only have "blue shirts":
- Recommend the close alternative with honest disclosure
- Don't show random unrelated products
- Build trust through transparency
"""

from typing import List, Dict, Optional
import litellm
import json
import logging
import os

log = logging.getLogger(__name__)


class ProductAvailabilityChecker:
    """
    Check if search results match user's request and recommend alternatives honestly.
    
    Examples:
        User: "dark blue shirt" → We have: blue shirts
        Result: "We don't have dark blue, but here are blue shirts" + show results
        
        User: "red leather jacket" → We have: black leather jackets
        Result: "We have black leather jackets instead" + show results
        
        User: "unicorn costume" → We have: fashion items
        Result: "We don't have that" + show nothing (no random products!)
    """
    
    def __init__(self, model: Optional[str] = None):
        """Initialize with model from env config (GEN_MODEL) or explicit override."""
        raw_model = model or os.getenv("GEN_MODEL", "openrouter/openai/gpt-4o-mini")
        self.model = raw_model.replace("openrouter:", "openrouter/")
        self.type_knowledge = self._load_type_relationships()

    def _load_type_relationships(self) -> str:
        """Load type mappings from config and format as natural language knowledge."""
        try:
            from pathlib import Path
            config_path = Path(__file__).resolve().parent.parent.parent / "data" / "type_normalization_config.json"
            with open(config_path) as f:
                config = json.load(f)
            
            synonyms = config.get("type_synonyms", {})
            lines = []
            for canonical, variants in synonyms.items():
                # "Bomber is a specific type of Jacket."
                # variants includes "bomber jacket", "aviator" etc.
                # format: "Items like {variants} are subtypes of {canonical}."
                clean_vars = [v for v in variants if v != canonical]
                if clean_vars:
                    lines.append(f"- **{canonical.title()}**: includes {', '.join(clean_vars)}.")
            
            return "\n".join(lines)
        except Exception as e:
            log.warning(f"Failed to load type config: {e}")
            return ""

    async def check_and_recommend(
        self,
        user_query: str,
        search_results: List[Dict]
    ) -> Dict:
        """Analyze if search results match user's request.
        
        Note: We do NOT reject based on result count. Even 1 perfect match
        is better than 0 results. Let the LLM decide relevance, not arbitrary thresholds.
        """
        
        # Empty results = nothing to analyze
        if not search_results:
            return {
                "exact_match": False,
                "has_close_alternative": False,
                "alternative_explanation": None,
                "recommended_items": [],
                "should_show_results": False,
                "honesty_message": f"Sorry, we don't have '{user_query}' in our catalog."
            }
            
        # Inject dynamic knowledge
        knowledge_block = ""
        if self.type_knowledge:
            knowledge_block = f"""
3. **PRIORITY #3: DYNAMIC TYPE KNOWLEDGE (TRUSTED)**
   The following relationships are DEFINED in our catalog system. **RESPECT THEM.**
{self.type_knowledge}
   - If user asks for a subtype (e.g. Bomber), and we show the parent (Jacket), **ACCEPT IT**.
"""

        # Ask Claude
        try:
            response = await litellm.acompletion(
                model=self.model,
                messages=[{
                    "role": "system",
                    "content": f"""You're a product catalog quality control assistant.

Your task: Determine if search results are APPROPRIATE to show the user.

Return JSON:
{{
    "exact_match": true/false,
    "close_match": true/false,
    "match_explanation": "Brief explanation",
    "should_recommend": true/false,
    "honesty_message": "What to tell the user"
}}

RULES (Hierarchical Priority):

1. **PRIORITY #1: TRUST THE VISUAL SEARCH**
   - The search engine uses visual similarity. If it returned an item, it likely matches.
   - **Missing Metadata?** If color/type info is missing (N/A), **ASSUME IT MATCHES**. RECOMMEND IT.

2. **PRIORITY #2: SEMANTIC SIMILARITY**
   - Use semantic understanding to determine if results match the user's intent.
   - **Shirt vs Tee**: VALID (same category).
   - **Hoodie vs Sweatshirt**: VALID (same category).
   - **Pants vs Joggers vs Jeans**: VALID (same category).
{knowledge_block}
   - Do NOT reject based on rigid category boundaries.

3. **PRIORITY #3: ABSTRACT INTENTS**
   - Query: "Trends", "Styles", "Gifts", "Vibes", "Outfits" -> **ACCEPT ANYTHING**.

4. **PRIORITY #4: REJECTIONS (Smart Category Boundaries)**
   - Reject if the results are in a DIFFERENT category than what the user asked for.
   - **Cross-Category Mismatches (REJECT)**:
     * User asks for TOPS (shirt, tee, hoodie, sweater, jacket, blazer) → Results show BOTTOMS (pants, jeans, skirts, shorts)
     * User asks for BOTTOMS (pants, jeans, skirts, shorts, joggers) → Results show TOPS (shirts, jackets, hoodies)
     * User asks for FOOTWEAR (shoes, sneakers, boots) → Results show CLOTHING
     * User asks for specific brand "Nike" → Results show only "Adidas"
   
   - **Same-Category Matches (RECOMMEND)**:
     * User asks for "skirts" → Results show skirts ✅
     * User asks for "pants" → Results show joggers/jeans ✅
     * User asks for "jacket" → Results show bomber/blazer ✅
     * User asks for "shirt" → Results show tees ✅

EXAMPLES:
- User: "Blue Shirt", Result: "Tee" (Color: N/A) -> **RECOMMEND** (same category).
- User: "Red Hoodie", Result: "Hoodie" (Color: N/A) -> **RECOMMEND** (exact match).
- User: "Skirts", Result: "Skirt" -> **RECOMMEND** (exact match).
- User: "Pants", Result: "Joggers" -> **RECOMMEND** (same category).
- User: "Shirt", Result: "Pants" -> **REJECT** (cross-category mismatch).
- User: "Jacket", Result: "Skirt" -> **REJECT** (cross-category mismatch).
"""
                }, {
                    "role": "user",
                    "content": f"""User query: "{user_query}"

Top search results:
{self._format_results_for_llm(search_results[:8])}

Question: Should I recommend these results to the user?
Return only valid JSON."""
                }],
                response_format={"type": "json_object"},
                timeout=15
            )
            
            analysis = json.loads(response.choices[0].message.content)
            log.info(f"🤖 [AVAILABILITY CHECKER] LLM Analysis for '{user_query}': {analysis}")
            # ... rest of method default logic ...
            
            return {
                "exact_match": analysis.get("exact_match", False),
                "has_close_alternative": analysis.get("close_match", False),
                "alternative_explanation": analysis.get("match_explanation"),
                "recommended_items": search_results if analysis.get("should_recommend", True) else [],
                "should_show_results": analysis.get("should_recommend", True),
                "honesty_message": analysis.get("honesty_message", "")
            }
            
        except Exception as e:
            log.error(f"Failed to analyze product availability: {{e}}")
            # Fallback
            return {
                "exact_match": False,
                "has_close_alternative": True,
                "alternative_explanation": "We found some related products",
                "recommended_items": search_results,
                "should_show_results": True,
                "honesty_message": "Here are some related products (analysis unavailable)"
            }
    
    def _format_results_for_llm(self, results: List[Dict]) -> str:
        """Format search results for LLM analysis"""
        formatted = []
        for i, item in enumerate(results, 1):
            title = item.get('title', 'Unknown')
            product_type = item.get('type', 'unknown')
            color = item.get('color', 'N/A')
            formatted.append(f"{i}. {title} (type: {product_type}, color: {color})")
        
        return "\n".join(formatted) if formatted else "No results"
