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
        # Normalize model format: handle both openrouter:provider/model and openrouter/provider/model
        self.model = raw_model.replace("openrouter:", "openrouter/")
    
    async def check_and_recommend(
        self,
        user_query: str,
        search_results: List[Dict],
        min_results: int = 3
    ) -> Dict:
        """
        Analyze if search results match user's request.
        
        Args:
            user_query: What the user asked for (e.g., "dark blue shirt")
            search_results: Products returned by search
            min_results: Minimum results to consider "found"
        
        Returns:
        {
            "exact_match": false,
            "has_close_alternative": true,
            "alternative_explanation": "We don't have dark blue, but here are blue options",
            "recommended_items": [...],  # Only if close enough
            "should_show_results": true,
            "honesty_message": "We don't have exactly what you're looking for..."
        }
        """
        
        # If very few results, probably don't have it
        print(f"🕵️ Availability Check: query='{user_query}', results={len(search_results)}")
        if len(search_results) < min_results:
            return {
                "exact_match": False,
                "has_close_alternative": False,
                "alternative_explanation": None,
                "recommended_items": [],
                "should_show_results": False,
                "honesty_message": f"Sorry, we don't have '{user_query}' in our catalog."
            }
        
        # Ask Claude: Are these results close enough to the user's request?
        try:
            response = await litellm.acompletion(
                model=self.model,
                messages=[{
                    "role": "system",
                    "content": """You're a product catalog quality control assistant.

Your task: Determine if search results are APPROPRIATE to show the user.

Return JSON:
{
    "exact_match": true/false,  // Perfect match (same type + color)?
    "close_match": true/false,  // Close enough to recommend?
    "match_explanation": "Brief explanation",
    "should_recommend": true/false,  // Show results or not?
    "honesty_message": "What to tell the user"
}

CRITICAL MATCHING RULES:

1. **Product Type** (SMART):
   - Must match exactly OR be commonly interchangeable
   - **Common substitutions (OK to recommend):**
     - "shirt" ≈ "tee" (users often use these interchangeably!)
     - "hoodie" ≈ "sweatshirt" (same category)
     - "pants" ≈ "trousers" ≈ "jeans" (same category)
   - **Different types (REJECT):**
     - jacket ≠ pants
     - shirt ≠ dress
     - hoodie ≠ shorts
   
2. **Color Matching** (SMART):
   
   **Similar colors (RECOMMEND):**
   - dark blue ≈ blue ≈ navy ≈ mid blue ≈ ink navy (same family!)
   - light grey ≈ grey ≈ charcoal ≈ stone grey (same family!)
   - red ≈ burgundy ≈ wine
   - white ≈ optical white ≈ off-white (same family!)
   - black ≈ jet black (same family!)
   
   **CRITICAL**: Descriptive color names should match simple queries!
   - User asks "blue hoodie" + Results show "mid blue hoodie" or "ink navy hoodie" → RECOMMEND
   - User asks "white tee" + Results show "optical white tee" → RECOMMEND
   
   **Different colors (REJECT):****
   - red ≠ blue/green/yellow (completely different!)
   - orange ≠ black/white
   - If user asks for RED and results are BLUE → should_recommend=false
   
   **CRITICAL**:  If search results include the requested product type (e.g., hoodies) and have color data populated:
   - User asks "blue hoodie" + Results show hoodies with ANY blue variant → RECOMMEND
   - Even if color is "mid blue", "ink navy", or just "blue" → These are all valid!
   - The search system already filtered for appropriate colors
   - If items have color field populated and match type → should_recommend=TRUE
   
   **Different colors (REJECT):
   - "jacket" (no color) → any jacket color OK
   
   **Color missing in results:**
   - User wants "red hoodie", results show "hoodie" (no color info)
   - Be cautious → close_match=true IF same type
   
3. **Material/Fabric**:
   - linen → cotton (similar enough, same type!)
   - Different materials OK if same product type

4. **Specificity**:
   - Specific brand wanted but not available → REJECT
   - Generic query → broader matches OK

EXAMPLES:

✅ RECOMMEND:
- User: "dark blue shirt" + Results: "blue shirt", "navy shirt"
  → close_match=true (color family matches!)
  
- User: "linen blazer" + Results: "cotton blazer"
  → close_match=true (same type, material differs)
  
- User: "black hoodie" + Results: "hoodie" (no color info)
  → close_match=true (right type, careful on color)

❌ REJECT:
- User: "red velvet jacket" + Results: "blue jacket", "green jacket"
  → should_recommend=false (WRONG COLOR - not even close!)
  
- User: "hoodie" + Results: "pants", "shirts"
  → should_recommend=false (WRONG TYPE!)
  
- User: "Nike Air Max" + Results: "Adidas shoes"
  → should_recommend=false (specific brand wanted)

🎯 KEY PRINCIPLE:
- Same product type + similar color → RECOMMEND
- Same product type + completely different color → REJECT
- Different product type → REJECT (even if color matches!)

Be helpful but HONEST. Don't show unrelated items just to show something!"""
                }, {
                    "role": "user",
                    "content": f"""User query: "{user_query}"

Top search results:
{self._format_results_for_llm(search_results[:8])}

Question: Should I recommend these results to the user?
Analyze if they're close enough or completely unrelated.
Return only valid JSON."""
                }],
                response_format={"type": "json_object"},
                timeout=15
            )
            
            analysis = json.loads(response.choices[0].message.content)
            print(f"🤖 Availability LLM: exact={analysis.get('exact_match')}, close={analysis.get('close_match')}, recommend={analysis.get('should_recommend')}")
            print(f"   Explanation: {analysis.get('match_explanation')}")
            
            # Build response based on Claude's analysis
            return {
                "exact_match": analysis.get("exact_match", False),
                "has_close_alternative": analysis.get("close_match", False),
                "alternative_explanation": analysis.get("match_explanation"),
                "recommended_items": search_results if analysis.get("should_recommend", True) else [],
                "should_show_results": analysis.get("should_recommend", True),
                "honesty_message": analysis.get("honesty_message", "")
            }
            
        except Exception as e:
            log.error(f"Failed to analyze product availability: {e}")
            # Fallback: show results but mark as potentially incorrect
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
