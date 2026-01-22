
import logging
from typing import Dict, Any, List

from app.agents.base_agent import BaseAgent, AgentResult
from app.vector.store import search_by_outfit_category
import asyncio
import json
import os
from litellm import completion

log = logging.getLogger("cove.agents.outfit_builder")

# ... (budget allocation remains same) ...

class OutfitBuilderAgent(BaseAgent):
    """
    Outfit Builder Agent v2 - Uses category-constrained vector search.
    
    Replaces v1 logic (text search + filtering) with direct DB-level
    category filtering to ensure all core items (shoes!) are always found.
    """

    async def _plan_outfit(self, occasion: str, style: str, gender: str) -> Dict[str, Any]:
        """
        Uses LLM to dynamically plan the outfit structure, search queries, and constraints.
        Resolves issues where hardcoded logic fails for niche requests (e.g. 'hiking', 'beach', '90s party').
        """
        # ... (prompt remains same) ...
        # Get model from env, default to gpt-4o-mini if not set, or gpt-3.5-turbo
        model = os.getenv("LLM_ROUTER_MODEL", "gpt-3.5-turbo") 

        prompt = f"""You are an Expert Fashion Stylist. Plan an outfit for this user request:
Occasion: {occasion}
Style: {style}
Gender: {gender}

Your Goal: Determine the best clothing categories, specific search terms to find them, and strict negative filters to avoid inappropriate items.

Output JSON ONLY with this structure:
{{
  "categories": ["tops", "bottoms", "shoes", "outerwear", "accessories"],
  "search_queries": {{
    "tops": "specific keywords",
    "bottoms": "specific keywords",
    ...
  }},
  "banned_terms": {{
    "tops": ["term1", "term2"],
    "bottoms": ["term1", "term2"],
    "shoes": ["term1", "term2"]
  }}
}}

CRITICAL RULES FOR BANS:
1. **Formal/Wedding/Elegant:** MUST BAN: ["tee", "t-shirt", "hoodie", "sweatshirt", "graphic", "logo", "polo", "short", "denim", "sneaker", "runner", "sandal", "slide"].
2. **Gym/Active:** MUST BAN: ["denim", "jeans", "boot", "loafer", "leather", "formal", "dress shoe", "heel"].
3. **Be Strict:** If in doubt, ban it. A tee is NEVER okay for a wedding.
"""
        try:
            response = await asyncio.to_thread(
                completion,
                model=model,
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"}
            )
            content = response.choices[0].message.content
            plan = json.loads(content)
            
            # Post-process to ensure synonyms are covered
            self._expand_bans(plan, style, occasion)
            return plan

        except Exception as e:
            log.error(f"❌ LLM Planning failed: {e}")
            return {
                "categories": ["tops", "bottoms", "shoes"],
                "search_queries": {"tops": style, "bottoms": style, "shoes": style},
                "banned_terms": {}
            }
    
    async def execute(self, task: Dict[str, Any], context: Dict[str, Any], stream_callback=None) -> AgentResult:
        # ✨ PHASE 7: Use candidates from Stylist if available
        # This respects the strict filtering (gender, type, color) done by the Stylist
        pre_filtered_candidates = task.get("candidates", {})
        
        budget_max = task.get("budget_max", 500)
        gender = task.get("gender")
        style = task.get("style", "casual")
        occasion = task.get("occasion", "any") # Capture occasion for logging
        num_outfits = task.get("num_outfits", 3)
        
        log.info(f"🎨 OutfitBuilder v2: budget={budget_max}, gender={gender}, style={style}, occasion={occasion}, num_outfits={num_outfits}")
        if pre_filtered_candidates:
            log.info(f"   ✨ Using {len(pre_filtered_candidates)} pre-filtered candidate lists from Stylist")
        
        if stream_callback:
            await stream_callback({
                "event_type": "status",
                "message": f"Building {num_outfits} outfits matching your style..."
            })
            
        # 1. 🧠 LLM Planning Phase
        plan = await self._plan_outfit(occasion, style, gender)
        
        categories = plan.get("categories", ["tops", "bottoms", "shoes"])
        # Ensure we always have core elements if not explicitly removed? No, trust the Stylist.
        if "tops" not in categories: categories.append("tops") # Safety
        if "shoes" not in categories: categories.append("shoes")
        
        log.info(f"   📋 Plan Categories: {categories}")
        log.info(f"   🔍 Plan Queries: {plan.get('search_queries')}")
        log.info(f"   🚫 Plan Bans: {plan.get('banned_terms')}")
        
        # Calculate per-category budgets dynamically
        # Base allocation weights
        weights = {
            "top": 0.3, "bottom": 0.3, "shoes": 0.3, 
            "outerwear": 0.4, "accessories": 0.1, "other": 0.1
        }
        # Normalize weights for selected categories
        total_weight = sum(weights.get(c, 0.2) for c in categories)
        category_budgets = {
            cat: budget_max * (weights.get(cat, 0.2) / total_weight)
            for cat in categories
        }
        
        all_outfit_items = []
        global_used_slugs = set()
        missing_categories = []
        
        for outfit_idx in range(num_outfits):
            outfit_id = f"outfit_{outfit_idx + 1}"
            outfit_items = []
            outfit_total = 0.0
            
            # Helper to find items for this outfit
            current_outfit_products = {} # Map category -> product dict for harmony check
            
            for category in categories:
                budget_for_category = category_budgets[category]
                
                # 1. Try to get from Pre-filtered Candidates (Stylist)
                candidates = []
                source = "search"
                
                # Handle mapping (Stylist might use "tops" vs "top")
                stylist_cat = category 
                if category == "top": stylist_cat = "tops"
                if category == "bottom": stylist_cat = "bottoms"
                
                if pre_filtered_candidates and stylist_cat in pre_filtered_candidates:
                    # Filter out already used items
                    raw_candidates = pre_filtered_candidates[stylist_cat]
                    candidates = [
                        c for c in raw_candidates 
                        if c.get("slug") not in global_used_slugs
                        # Optional: double check price if Stylist didn't enforced it strictly per item
                        and float(c.get("price", 0)) <= budget_for_category * 1.5 # Allow some flexibility if it's the perfect item
                    ]
                    if candidates:
                        source = "stylist_candidates"
                        # Sort by price descending or similarity? Stylist usually returns sorted by relevance.
                        # Let's trust the Stylist's order.
                
                if not candidates:
                    # Use LLM-optimized query for this category
                    # e.g. "silk blouse" instead of just "formal"
                    # Append 'style' to ensure we keep the aesthetic vibe
                    base_query = plan.get("search_queries", {}).get(category.lower(), style)
                    combined_query = f"{style} {base_query}"

                    # Map our internal keys to store keys if needed
                    store_cat = category
                    if category == "top": store_cat = "tops"
                    if category == "bottom": store_cat = "bottoms"
                    
                    # 💡 RELAXED BUDGET: Use total budget_max as cap for search to avoid filtering out 
                    # expensive key items (like the €561 Shirt) just because of arbitrary partitioning.
                    # Even allow going over budget (2x) to ensure we find *something*.
                    search_cap = float(budget_max) * 2 if budget_max else None

                    candidates = await search_by_outfit_category(
                        outfit_category=store_cat,
                        style_query=combined_query,
                        gender=gender,
                        price_max=search_cap, # Use GLOBAL budget cap, not local partition
                        exclude_slugs=list(global_used_slugs),
                        top_k=50, # Fetch more to allow for filtering
                    )

                    # 🕵️‍♂️ STRICT FILTERING: Use LLM-generated bans
                    if candidates:
                        filtered = []
                        # Get bans for this category (normalize keys)
                        bans = plan.get("banned_terms", {}).get(category.lower(), [])
                        # Also check singular variants
                        if not bans and category.lower().endswith("s"):
                            bans = plan.get("banned_terms", {}).get(category.lower()[:-1], [])
                        
                        if bans:
                            for c in candidates:
                                title_lower = c.get("title", "").lower()
                                title_lower = c.get("title", "").lower()
                                should_ban = any(ban in title_lower for ban in bans)
                                if should_ban:
                                    log.info(f"🚫 BANNED: '{title_lower}' matched bans {bans}")
                                else:
                                    filtered.append(c)
                                    log.info(f"✅ ALLOWED: '{title_lower}' (No match in {bans})")
                            
                            if filtered:
                                log.info(f"   🧹 Filtered {len(candidates) - len(filtered)} items using bans: {bans}")
                                candidates = filtered
                            else:
                                log.warning(f"   ⚠️ Strict filter removed all items for {category}! Bans: {bans}")
                                # NO FALLBACK: If we banned them, they are banned.
                                candidates = []
                
                # ✨ FALLBACK: Emit candidates if Stylist failed to find any
                if stream_callback and candidates:
                    await stream_callback({
                        "event_type": "category_candidates",
                        "category": category,
                        "candidates": candidates,
                        "total_found": len(candidates),
                        "status": f"Found {len(candidates)} options for {category}"
                    })
                
                if not candidates:
                    log.warning(f"   ⚠️ No {category} found under €{budget_for_category:.2f}")
                    if category not in ["accessories", "other"]:  # Don't fail for accessories
                        missing_categories.append((outfit_id, category))
                    
                    # Create notification item
                    item_entry = {
                        "category": category,
                        "product": {
                            "title": f"No {category} found",
                            "price": 0,
                            "type": "notification",
                            "description": f"Could not find {category} under €{budget_for_category:.0f}"
                        },
                        "reason": "Budget/inventory constraint",
                        "is_notification": True,
                        "outfit_id": outfit_id
                    }
                    outfit_items.append(item_entry)
                    all_outfit_items.append(item_entry)
                    continue
                
                # Select best
                selected = candidates[0]
                item_price = float(selected.get("price") or 0)
                
                # Create item entry
                item_entry = {
                    "outfit_id": outfit_id,
                    "category": category,
                    "slug": selected["slug"],
                    "product": selected,  # Full product data for UI
                    "title": selected["title"],
                    "type": selected["type"],
                    "price": item_price,
                    "reason": f"Matches style '{style}'",
                    "imageUrl": selected.get("imageUrl"),
                    "color": selected.get("color"),
                    "url": selected.get("url"),
                }
                
                outfit_items.append(item_entry)
                all_outfit_items.append(item_entry)
                global_used_slugs.add(selected["slug"])
                current_outfit_products[category] = selected
                outfit_total += item_price
                
                if stream_callback:
                    await stream_callback({
                        "event_type": "item_selected",
                        "category": category,
                        "selected_item": selected,
                        "outfit_id": outfit_id
                    })
            
            # ✨ VISUAL HARMONY CHECK
            harmony_result = await self._check_harmony(current_outfit_products, style)
            if harmony_result and not harmony_result.get("is_harmonious", True):
                 log.warning(f"   🎨 Harmony Alert: {harmony_result.get('critique')}")
                 # Append critique to the last item or specific metadata?
                 # ideally we retry, but for robustness first pass, let's just tag it.
                 # Let's add a "stylist_note" to the outfit items
                 for item in outfit_items:
                      if item.get("slug") == harmony_result.get("clashing_item_slug"):
                           item["stylist_note"] = f"⚠️ Stylist Note: {harmony_result.get('critique')}"

            log.info(f"   ✅ {outfit_id} complete: €{outfit_total:.2f}")

        return AgentResult(
            success=True,
            data={
                "outfit_items": all_outfit_items,
                "num_outfits": num_outfits,
                "is_outfit": True,
                "is_multi_outfit": True,
                "budget_max": budget_max
            },
            reasoning=f"Generated {num_outfits} outfits using category-aware search.",
            confidence=0.9 if not missing_categories else 0.7,
            tools_used=["category_search_v2"]
        )

    def _determine_categories(self, occasion: str, style: str) -> List[str]:
        """Determine categories based on occasion logic."""
        cats = ["tops", "bottoms", "shoes"]
        
        # Layering (Blazers/Jackets)
        # Layering (Blazers/Jackets)
        layering_triggers = ["formal", "business", "date", "smart_casual", "party", "wedding", "elegant"]
        if any(t in occasion.lower() for t in layering_triggers):
             cats.append("outerwear")
        
        # Accessories (Always nice)
        cats.append("other") # 'other' maps to accessories in store logic
        
        return cats

    async def _check_harmony(self, items: Dict[str, Any], style: str) -> Dict[str, Any]:
        """Lightweight LLM check for visual harmony."""
        try:
            import litellm
            import json
            import os
            
            # Skip if minimal items
            if len(items) < 2: return None
            
            # Format items for prompt
            items_desc = []
            for cat, item in items.items():
                 color = item.get("color", "unknown color")
                 title = item.get("title", "unknown item")
                 items_desc.append(f"- {cat}: {title} ({color})")
            
            prompt = f"""You are a strict Fashion Stylist. Check this outfit for visual harmony.
Style Goal: {style}
Items:
{chr(10).join(items_desc)}

Rules:
1. NO CLASHES (e.g. Green Pants + Red Top is BAD unless Christmas).
2. NO FORMALITY MISMATCH (e.g. Gym Shorts + Blazer is BAD).
3. If harmonious, return {{"is_harmonious": true}}.
4. If NOT harmonious, return {{"is_harmonious": false, "critique": "brief reason", "clashing_item_slug": "slug_of_worst_item"}}.

JSON ONLY."""
            
            model = os.getenv("LLM_REASONING_MODEL", "openrouter/openai/gpt-4o-mini")
            response = await litellm.acompletion(
                model=model.replace("openrouter:", "openrouter/"),
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"},
                temperature=0.1
            )
            return json.loads(response.choices[0].message.content)

        except Exception as e:
            log.warning(f"Harmony check failed: {e}")
            return None

    def _expand_bans(self, plan: Dict[str, Any], style: str, occasion: str):
        """
        Hybrid Logic:
        1. Expand synonyms (tee -> t-shirt).
        2. SAFETY NET: If LLM fails to ban obvious items for strict occasions, force them.
        """
        synonyms = {
            "t-shirt": ["tee", "graphic", "logo"],
            "tee": ["t-shirt"],
            "sneakers": ["sneaker", "runner", "trainer", "tennis"],
            "jeans": ["denim"],
            "pants": ["trousers", "slacks"],
            "boots": ["boot"],
            "sandals": ["slide", "flip-flop"]
        }
        
        if "banned_terms" not in plan:
            plan["banned_terms"] = {}
        
        # Normalize keys to lowercase to prevent matches missing due to case (Shoes vs shoes)
        raw_banned = plan["banned_terms"]
        normalized_banned = {}
        for k, v in raw_banned.items():
            normalized_banned[k.lower()] = v
        plan["banned_terms"] = normalized_banned
        banned = normalized_banned

        # 🚨 SAFETY NET: Enforce Formal Rules if LLM slipped up
        is_strict_formal = any(t in occasion.lower() or t in style.lower() for t in ["formal", "wedding", "black-tie", "gala", "tuxendo"])
        is_business = "business" in occasion.lower() or "business" in style.lower()

        if is_strict_formal:
            log.info(f"👔 STRICT FORMAL DETECTED: {occasion}")
            # Force Top Bans (No Sweaters for Black Tie!)
            if "tops" not in banned: banned["tops"] = []
            for bad in ["tee", "t-shirt", "hoodie", "sweatshirt", "polo", "graphic", "sweater", "knit", "cardigan"]:
                if bad not in banned["tops"]: banned["tops"].append(bad)
            log.info(f"   🔒 Forced Bans for Tops: {banned['tops']}")
            
            # Force Shoe Bans
            if "shoes" not in banned: banned["shoes"] = []
            for bad in ["sneaker", "runner", "sandals", "slide", "canvas", "slip-on", "flip-flop"]:
                if bad not in banned["shoes"]: banned["shoes"].append(bad)
            
            # 💡 SAFETY NET: Override Search Queries to ensure valid items are found (preventing fallback)
            queries = plan.get("search_queries", {})
            queries["shoes"] = "mens formal leather loafers oxford dress shoes"
            queries["tops"] = "mens formal dress shirt button down"
            queries["bottoms"] = "mens formal dress trousers slacks suit pants"
            queries["outerwear"] = "mens formal suit jacket blazer"
            plan["search_queries"] = queries

        # 🚨 SAFETY NET: Enforce Gym Rules
        is_active = any(t in occasion.lower() or t in style.lower() for t in ["gym", "workout", "active", "run"])
        if is_active:
             if "shoes" not in banned: banned["shoes"] = []
             for bad in ["boot", "loafer", "formal", "dress", "canvas", "leather"]:
                 if bad not in banned["shoes"]: banned["shoes"].append(bad)
        
        # Expand Synonyms
        for category, terms in banned.items():
            new_terms = set(terms)
            for term in terms:
                # Add singulars
                if term.endswith("s"): new_terms.add(term[:-1])
                # Add synonyms
                for key, variants in synonyms.items():
                    if term in variants or term == key:
                        new_terms.update(variants)
            banned[category] = list(new_terms)
        
        # 🔑 Robustness: Ensure singular keys exist (shoes -> shoe) to match any LLM category variance
        keys = list(banned.keys())
        for k in keys:
            if k.endswith("s"):
                singular = k[:-1]
                if singular not in banned:
                    banned[singular] = banned[k]

# Handler wrapper
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
