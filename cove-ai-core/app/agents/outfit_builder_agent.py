import logging
import asyncio
import json
from pathlib import Path
from typing import Dict, Any, List

import numpy as np
from app.agents.base_agent import BaseAgent, AgentResult
from app.vector.store import get_conn, get_product_embeddings_by_slugs

log = logging.getLogger("cove.agents.outfit_builder")

# Load outfit config (NO HARDCODING!)
_outfit_config_cache = None

def _get_outfit_config() -> Dict[str, Any]:
    global _outfit_config_cache
    if _outfit_config_cache is None:
        config_path = Path(__file__).resolve().parent.parent.parent / "data" / "outfit_config.json"
        with open(config_path) as f:
            _outfit_config_cache = json.load(f)
    return _outfit_config_cache

class OutfitBuilderAgent(BaseAgent):
    """
    Outfit Builder Agent - Assembles final outfits from candidate products.
    
    Responsibilities:
    - Receives candidate lists from StylistAgent (Retrieval)
    - Applies 'Smart Flexible Budget' logic
    - Selects the best compatible item for each category
    - Generates 'Notification' items for failures (User Idea)
    - Validates visual harmony (Placeholder)
    """
    
    async def execute(self, task: Dict[str, Any], context: Dict[str, Any], stream_callback=None) -> AgentResult:
        candidates = task.get("candidates", {})
        budget_max = task.get("budget_max", 500)
        user_preferences = task.get("user_preferences", {})
        
        log.info(f"🏗️ Building outfit from {len(candidates)} categories with budget €{budget_max}")
        
        # ✨ PHASE 5: Fetch embeddings for all candidates for vector compatibility
        all_slugs = []
        for cat, items in candidates.items():
            for item in items:
                if item.get("slug"):
                    all_slugs.append(item["slug"])
        
        embedding_map = {}
        if all_slugs:
            try:
                # Use sync connection here since we are inside sync/async boundary or simple execution
                # Actually execute is async, so we can use get_conn but we need to run it appropriately.
                # get_conn returns a context manager.
                # Since we are in async method, we should ideally use async DB or run in threadpool, 
                # but for now we'll use standard sync connection block which blocks the loop briefly.
                # Given it's a batch fetch, it's acceptable for this prototype.
                with get_conn() as conn:
                    embedding_map = get_product_embeddings_by_slugs(conn, all_slugs)
                log.info(f"   🧠 Loaded {len(embedding_map)} embeddings for semantic matching")
            except Exception as e:
                log.warning(f"Failed to fetch embeddings for outfit building: {e}")

        outfit_items = []
        selected_slugs = set()
        tools_used = ["smart_budget", "compatibility_check"]
        errors = []
        
        # Calculate flexible budget (simplified from original StylistAgent logic)
        remaining_budget = float(budget_max)
        total_cost = 0.0
        
        # Order categories (logic: Shoes -> Bottoms -> Tops usually? Or order provided)
        # We rely on the order in candidates dict or specific precedence
        # Precedence: Shoes (expensive foundation) -> Bottoms -> Tops -> Accessories
        precedence = ["shoes", "bottoms", "tops", "accessories"]
        ordered_categories = sorted(candidates.keys(), key=lambda c: precedence.index(c.lower()) if c.lower() in precedence else 99)
        
        for idx, category in enumerate(ordered_categories):
            cat_candidates = candidates[category]
            
            # Smart Budgeting
            remaining_cats = len(ordered_categories) - idx
            per_cat_budget = remaining_budget / remaining_cats if remaining_cats > 0 else remaining_budget
            flexible_cap = max(per_cat_budget, remaining_budget * 0.6)
            flexible_budget = min(flexible_cap, remaining_budget)
            
            if flexible_budget < 10 and remaining_budget > 10:
                flexible_budget = remaining_budget
                
            log.info(f"   Category: {category}, Candidates: {len(cat_candidates)}, Budget: €{flexible_budget:.2f}")
            
            best_item = None
            
            # Vet candidates using Compatibility Engine
            scored_candidates = []
            overflow_candidates = []  # Track items that exceed budget (for fallback)
            
            for item in cat_candidates:
                price = item.get("price", 0)
                
                # Soft Constraint: Budget (track overflow separately)
                if price > flexible_budget:
                    # Still track for overflow fallback
                    overflow_candidates.append(item)
                    continue
                    
                # Soft Constraint: Compatibility Score
                score, reason = self._calculate_compatibility(item, outfit_items, flexible_budget, embedding_map)
                scored_candidates.append({
                    "item": item, 
                    "score": score, 
                    "reason": reason
                })
            
            # Select Best (Highest Score)
            scored_candidates.sort(key=lambda x: x["score"], reverse=True)
            
            if scored_candidates:
                best = scored_candidates[0]
                best_item = best["item"]
                # Store the reason for later
                best_reason = best["reason"]
            elif overflow_candidates:
                # OVERFLOW FALLBACK: All items exceed budget, pick cheapest for completeness
                overflow_candidates.sort(key=lambda x: x.get("price", 9999))
                best_item = overflow_candidates[0]
                best_reason = "cheapest available (over budget, but ensures complete outfit)"
                log.warning(f"   ⚠️ {category}: All items exceeded budget, selecting cheapest (€{best_item.get('price', 0):.2f}) for outfit completeness")
            else:
                best_item = None
                best_reason = "No suitable item found"
    

            
            if best_item:
                slug = best_item.get("slug", "unknown")
                price = best_item.get("price", 0)
                
                outfit_items.append({
                    "category": category,
                    "product": best_item,
                    "reason": best_reason
                })
                selected_slugs.add(slug)
                total_cost += price
                remaining_budget -= price
                
                if stream_callback:
                    await stream_callback({
                        "event_type": "item_selected",
                        "category": category,
                        "selected_item": best_item,
                        "remaining_budget": remaining_budget,
                        "status": f"Selected {best_item.get('title')} for {category}"
                    })
            else:
                # FAILURE HANDLING (User Idea)
                if not cat_candidates:
                    msg = f"No {category} candidates provided by Stylist."
                else:
                    msg = f"Found {len(cat_candidates)} {category} candidates but all exceeded budget of €{flexible_budget:.0f}."
                
                log.warning(msg)
                
                # Add Notification Item
                outfit_items.append({
                    "category": category,
                    "product": {
                        "title": f"Missing {category}",
                        "price": 0,
                        "type": "notification",
                        "description": msg
                    },
                    "reason": msg,
                    "is_notification": True
                })
                
                if stream_callback:
                    await stream_callback({
                        "event_type": "notification",
                        "category": category,
                        "message": msg,
                        "status": "failed"
                    })
        
        # Build completeness metadata for Verifier
        missing_categories = [item["category"] for item in outfit_items if item.get("is_notification")]
        budget_exceeded = total_cost > budget_max
        is_complete = len(missing_categories) == 0
        
        return AgentResult(
            success=True,
            data={
                "outfit_items": outfit_items, 
                "total_cost": total_cost,
                # Verifier metadata
                "is_outfit": True,
                "is_complete": is_complete,
                "missing_categories": missing_categories,
                "budget_exceeded": budget_exceeded,
                "budget_max": budget_max
            },
            reasoning=f"Built outfit with {len(outfit_items)} items (Cost: €{total_cost:.2f}). Complete: {is_complete}",
            confidence=0.9 if is_complete else 0.6,
            tools_used=tools_used
        )


    def _calculate_compatibility(self, item: Dict[str, Any], current_outfit: List[Dict[str, Any]], budget_cap: float, embedding_map: Dict[str, List[float]]) -> (float, str):
        """
        Calculates a compatibility score (0-100) for an item against the current outfit.
        Uses heuristic rules for Color Harmony AND Vector Semantics.
        """
        score = 50.0  # Base score
        reasons = []
        
        # ---------------------------------------------------------
        # 1. Budget Efficiency (0-10 pts)
        # ---------------------------------------------------------
        price = item.get("price", 0)
        # Prefer items that use most of the allocated budget (quality) but don't break it
        if price > 0 and budget_cap > 0:
            ratio = price / budget_cap
            if 0.5 <= ratio <= 1.0:
                score += 10
                reasons.append("optimal price point")
            elif ratio < 0.3:
                score -= 5 # suspicious quality or too cheap?
        
        # 2. Color Harmony (-20 to +30 pts) - CONFIG-DRIVEN
        config = _get_outfit_config()
        color_families = config.get("color_families", {})
        color_scores = config.get("color_scores", {})
        
        NEUTRALS = set(color_families.get("neutrals", []))
        EARTH = set(color_families.get("earth", []))
        COOL = set(color_families.get("cool", []))
        WARM = set(color_families.get("warm", []))
        
        neutral_score = color_scores.get("neutral_match", 5)
        monochrome_score = color_scores.get("monochrome_match", 15)
        tonal_score = color_scores.get("tonal_match", 10)
        
        item_color = (item.get("color") or "").lower()
        
        # Analyze against existing items
        for outfit_item in current_outfit:
            # Skip notifications
            if outfit_item.get("is_notification"):
                continue
                
            other_prod = outfit_item.get("product", {})
            other_color = (other_prod.get("color") or "").lower()
            other_title = other_prod.get("title", "Item")
            
            if not item_color or not other_color:
                continue
                
            # Rule: Neutrals match everything
            if item_color in NEUTRALS or other_color in NEUTRALS:
                score += neutral_score
                reasons.append(f"neutral match with {other_title}")
                continue
            
            # Rule: Monochrome (Direct Match)
            if item_color == other_color or item_color in other_color or other_color in item_color:
                score += monochrome_score
                reasons.append(f"monochrome match with {other_title}")
                continue
                
            # Rule: Family Match
            families = [EARTH, COOL, WARM]
            same_family = False
            for family in families:
                if item_color in family and other_color in family:
                    score += tonal_score
                    reasons.append(f"tonal match with {other_title}")
                    same_family = True
                    break
            
            if same_family:
                continue
                
            # Rule: Clash Detection (Simplified)
            # Mixed families is Neutral (0 change).

        # ---------------------------------------------------------
        # 3. Vector Semantic Compatibility (-10 to +20 pts)
        # ---------------------------------------------------------
        # Check if items share the same "visual vibe" using cosine similarity
        semantic_score, semantic_reason = self._calculate_semantic_compatibility(item, current_outfit, embedding_map)
        score += semantic_score
        if semantic_reason:
            reasons.append(semantic_reason)
            
        if not current_outfit:
            reasons.append("foundation item")
            
        return score, ", ".join(reasons)

    def _calculate_semantic_compatibility(self, item: Dict[str, Any], current_outfit: List[Dict[str, Any]], embedding_map: Dict[str, List[float]]) -> (float, str):
        """
        Computes cosine similarity between the candidate item and existing outfit items.
        """
        if not current_outfit or not embedding_map:
            return 0.0, ""

        slug = item.get("slug")
        if not slug or slug not in embedding_map:
            return 0.0, ""

        item_vec = np.array(embedding_map[slug])
        norm_item = np.linalg.norm(item_vec)
        if norm_item == 0:
            return 0.0, ""

        total_sim = 0.0
        count = 0
        
        for outfit_item in current_outfit:
            if outfit_item.get("is_notification"):
                continue
                
            other_product = outfit_item.get("product", {})
            other_slug = other_product.get("slug")
            
            if other_slug and other_slug in embedding_map:
                other_vec = np.array(embedding_map[other_slug])
                norm_other = np.linalg.norm(other_vec)
                
                if norm_other > 0:
                    # Cosine Similarity
                    sim = np.dot(item_vec, other_vec) / (norm_item * norm_other)
                    total_sim += sim
                    count += 1
        
        if count == 0:
            return 0.0, ""
            
        avg_sim = total_sim / count
        
        # Load semantic thresholds from config (NO HARDCODING!)
        config = _get_outfit_config()
        thresholds = config.get("semantic_thresholds", {})
        scores = config.get("semantic_scores", {})
        
        strong_threshold = thresholds.get("strong_match", 0.6)
        good_threshold = thresholds.get("good_match", 0.45)
        clash_threshold = thresholds.get("clash", 0.2)
        
        strong_score = scores.get("strong_match", 20)
        good_score = scores.get("good_match", 10)
        clash_score = scores.get("clash", -10)
        
        if avg_sim > strong_threshold:
            return float(strong_score), "strong visual vibe match"
        elif avg_sim > good_threshold:
            return float(good_score), "good aesthetic fit"
        elif avg_sim < clash_threshold:
            return float(clash_score), "visual style clash"
            
        return 0.0, ""

log.info("✓ OutfitBuilder agent registered")

# Handler
async def outfit_builder_handler(task: dict, context: dict, stream_callback=None) -> dict:
    agent = OutfitBuilderAgent("outfit_builder")
    result = await agent.execute(task, context, stream_callback=stream_callback)
    return result.to_dict()

# Register
from app.core.agent_registry import registry, Agent

registry.register(Agent(
    name="outfit_builder",
    description="Assembles outfits from candidate products",
    capabilities=["outfit", "assembly", "budget"],
    handler=outfit_builder_handler,
    priority=10,
    config={}
))
