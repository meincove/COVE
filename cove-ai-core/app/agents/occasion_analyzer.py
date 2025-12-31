"""
LLM-Based Occasion Understanding - Phase 1.5
Removes hardcoded occasion matching, replaces with Claude 3.5 reasoning.
"""

from typing import Dict, Optional, List
import litellm
import json
import logging
import os

# Phase 3: LLM caching for performance
from app.core.llm_cache import llm_cache

log = logging.getLogger(__name__)


class OccasionAnalyzer:
    """
    Deeply understand occasions with Claude 3.5 nuance.
    
    Replaces hardcoded keyword matching with intelligent reasoning:
    - "Conservative law firm happy hour" ≠ "Startup happy hour"
    - "Beach wedding in July" ≠ "Winter formal wedding"
    - Dynamic outfit complexity (2-4 pieces based on formality)
    - Intelligent budget allocation (not just 50/50 split)
    """
    
    def __init__(self, model: Optional[str] = None):
        """Initialize with model from env (GEN_MODEL) or explicit override"""
        self.model = model or os.getenv("GEN_MODEL", "openrouter/openai/gpt-4o-mini")
    
    async def analyze(
        self,
        occasion: str,
        budget: float,
        style: Optional[str] = None,
        location: Optional[str] = None,
        season: Optional[str] = None
    ) -> Dict:
        """
        Deeply understand the occasion requirements.
        
        Args:
            occasion: User's description of the event
            budget: Total budget in euros
            style: User's preferred style (if any)
            location: Event location (for weather context)
            season: Current season (for appropriateness)
        
        Returns:
        {
            "formality": 7,  # 1-10 scale (1=gym, 10=black tie)
            "season_appropriate": ["light_fabrics", "neutral_colors"],
            "outfit_complexity": 3,  # number of pieces needed
            "required_categories": ["blazer", "dress_shirt", "dress_pants"],
            "optional_categories": ["belt", "watch"],
            "budget_allocation": {
                "blazer": 0.45,  # 45% of budget
                "dress_shirt": 0.25,
                "dress_pants": 0.30
            },
            "style_rules": {
                "avoid": ["casual_tees", "sneakers"],
                "prefer": ["neutral_colors", "classic_fits"]
            },
            "confidence": 0.92,
            "reasoning": "Conservative law firm requires formal professional attire..."
        }
        """
        
        # Build context prompt
        context_parts = [f"Occasion: {occasion}", f"Budget: €{budget}"]
        if style:
            context_parts.append(f"User style preference: {style}")
        if location:
            context_parts.append(f"Location: {location}")
        if season:
            context_parts.append(f"Season: {season}")
        
        context = "\n".join(context_parts)
        
        # Phase 3: Check cache first
        cache_key = llm_cache._create_key(
            model=self.model,
            messages=[{
                "role": "system",
                "content": "occasion_analyzer"  # Simplified for cache key
            }, {
                "role": "user",
                "content": context
            }]
        )
        
        cached_result = llm_cache.get(cache_key)
        if cached_result:
            return cached_result
        
        try:
            response = await litellm.acompletion(
                model=self.model,
                messages=[{
                    "role": "system",
                    "content": """You're a professional stylist analyzing outfit requirements.

Your task: Given an occasion, determine the EXACT outfit requirements.

Return JSON with this structure:
{
    "formality": <1-10 integer>,  // 1=gym, 5=casual date, 7=business, 10=black tie
    "outfit_complexity": <2-5 integer>,  // How many pieces? (gym=2, wedding=3-4, gala=4-5)
    "required_categories": ["list", "of", "specific", "types"],  // NOT generic "top/bottom"!
    "optional_categories": ["accessories", "if", "budget", "allows"],
    "budget_allocation": {
        "item_type": 0.45,  // Percentage as decimal (must sum to 1.0)
        "another_type": 0.30
    },
    "style_rules": {
        "avoid": ["things", "to", "avoid"],
        "prefer": ["preferred", "attributes"]
    },
    "season_appropriate": ["fabric", "guidelines"],
    "confidence": 0.92,  // How confident in this analysis (0-1)
    "reasoning": "Brief explanation of choices"
}

CRITICAL RULES:
1. Be SPECIFIC with categories: "blazer" not "top", "dress_pants" not "bottom"
2. Understand nuance: "conservative firm" ≠ "startup", "beach wedding" ≠ "formal wedding"
3. Budget allocation should reflect item importance (statement pieces get more)
4. Complexity varies: gym=2 pieces, date=2-3, business=3, wedding=3-4
5. Consider weather/season if mentioned
6. If occasion is vague, make reasonable assumptions but lower confidence

Examples:
- "Gym workout" → 2 pieces (tee, shorts), formality=1, 50/50 budget
- "Conservative law firm happy hour" → 3 pieces (blazer, dress_shirt, dress_pants), formality=8, 45/25/30 budget
- "Beach wedding in July" → 3-4 pieces (linen_shirt, dress_pants, optional_jacket), light_fabrics
- "Startup pitch" → 3 pieces (blazer, casual_tee, chinos), formality=6, 50/20/30 budget"""
                }, {
                    "role": "user",
                    "content": f"""Analyze this outfit request:

{context}

What outfit should I recommend? Return only valid JSON."""
                }],
                response_format={"type": "json_object"},
                timeout=30
            )
            
            analysis = json.loads(response.choices[0].message.content)
            
            # Validate response
            required_fields = ["formality", "outfit_complexity", "required_categories", "budget_allocation"]
            if not all(field in analysis for field in required_fields):
                log.error(f"Missing required fields in occasion analysis: {analysis}")
                return self._fallback_analysis(occasion, budget, style)
            
            # Ensure budget allocation sums to ~1.0
            total_allocation = sum(analysis["budget_allocation"].values())
            if abs(total_allocation - 1.0) > 0.1:
                log.warning(f"Budget allocation sums to {total_allocation}, normalizing...")
                # Normalize
                analysis["budget_allocation"] = {
                    k: v / total_allocation 
                    for k, v in analysis["budget_allocation"].items()
                }
            
            log.info(f"Occasion analysis: formality={analysis['formality']}, "
                    f"complexity={analysis['outfit_complexity']}, "
                    f"confidence={analysis.get('confidence', 'N/A')}")
            
            # Phase 3: Cache the result
            llm_cache.set(cache_key, analysis)
            
            return analysis
            
        except Exception as e:
            log.error(f"Failed to analyze occasion with LLM: {e}")
            return self._fallback_analysis(occasion, budget, style)
    
    def _fallback_analysis(self, occasion: str, budget: float, style: Optional[str]) -> Dict:
        """
        Fallback to simple rules if LLM fails.
        Better than crashing, but logs warning.
        """
        log.warning("Using fallback occasion analysis (LLM failed)")
        
        occasion_lower = occasion.lower()
        
        # Simple keyword-based fallback (temporary until LLM is stable)
        if any(word in occasion_lower for word in ["gym", "workout", "exercise"]):
            return {
                "formality": 1,
                "outfit_complexity": 2,
                "required_categories": ["tee", "shorts"],
                "optional_categories": [],
                "budget_allocation": {"tee": 0.5, "shorts": 0.5},
                "style_rules": {"avoid": ["formal"], "prefer": ["athletic", "breathable"]},
                "season_appropriate": ["breathable_fabrics"],
                "confidence": 0.5,
                "reasoning": "Fallback: Simple gym outfit"
            }
        elif any(word in occasion_lower for word in ["wedding", "formal", "gala"]):
            return {
                "formality": 8,
                "outfit_complexity": 3,
                "required_categories": ["blazer", "dress_shirt", "dress_pants"],
                "optional_categories": ["belt", "tie"],
                "budget_allocation": {"blazer": 0.45, "dress_shirt": 0.25, "dress_pants": 0.30},
                "style_rules": {"avoid": ["casual"], "prefer": ["formal", "neutral_colors"]},
                "season_appropriate": [],
                "confidence": 0.6,
                "reasoning": "Fallback: Formal event outfit"
            }
        else:
            # Default: casual 2-piece
            return {
                "formality": 5,
                "outfit_complexity": 2,
                "required_categories": ["tee", "pants"],
                "optional_categories": [],
                "budget_allocation": {"tee": 0.4, "pants": 0.6},
                "style_rules": {"avoid": [], "prefer": ["casual"]},
                "season_appropriate": [],
                "confidence": 0.5,
                "reasoning": "Fallback: Default casual outfit"
            }
