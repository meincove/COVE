"""
Outfit Builder v2 - Simplified Architecture

This agent uses category-constrained vector search instead of 
text search + post-hoc filtering.

Key differences from v1:
1. Categories are deterministic (tops, bottoms, shoes), not LLM-planned
2. Filtering happens at DB level, not post-retrieval
3. Budget allocation is weighted (35% shoes, 35% bottoms, 30% tops)
4. No keyword expansion hacks needed
"""

from __future__ import annotations

import logging
from typing import Any, Dict, List, Optional

from app.agents.base_agent import AgentResult
from app.vector.store import search_by_outfit_category

log = logging.getLogger("cove.outfit_v2")

# Load config
import json
import os
from pathlib import Path

# Load Config
CONFIG_PATH = Path(__file__).parent.parent.parent / "data" / "outfit_config.json"
try:
    with open(CONFIG_PATH) as f:
        CONFIG = json.load(f)
except Exception as e:
    log.error(f"Failed to load outfit config: {e}. Using defaults.")
    CONFIG = {
        "budget_allocation": {
            "shoes": 0.35, "bottoms": 0.35, "tops": 0.30
        },
        "occasions": {}
    }

async def outfit_builder_v2_handler(
    task: Dict[str, Any],
    context: Dict[str, Any],
    stream_callback=None,
) -> AgentResult:
    """
    Generate complete outfits using category-constrained search.
    
    Args:
        task: Contains budget_max, gender, style, num_outfits
        context: Session context (user_id, guest_session_id)
        stream_callback: Optional callback for streaming updates
        
    Returns:
        AgentResult with outfit_items grouped by outfit_id
    """
    budget_max = task.get("budget_max", 500)
    gender = task.get("gender")
    style = task.get("style", "casual")
    num_outfits = task.get("num_outfits", 3)
    
    log.info(f"🎨 OutfitBuilder v2: budget={budget_max}, gender={gender}, style={style}, num_outfits={num_outfits}")
    
    # Streaming update
    if stream_callback:
        stream_callback({
            "type": "status",
            "message": f"Building {num_outfits} outfit{'s' if num_outfits > 1 else ''} for you..."
        })
    
    # Calculate per-category budgets using config
    # Use standard allocation initially
    allocations = CONFIG.get("budget_allocation", {})
    
    # Dynamic occasion logic
    is_fancy = False
    casual_types = set()
    preferred_categories = ["tops", "bottoms", "shoes"] # Default
    
    # Check occasions
    occasions_rules = CONFIG.get("occasions", {})
    if "fancy" in style.lower() or any(k in style.lower() for k in ["date", "formal", "wedding", "party", "dinner"]):
        rule = occasions_rules.get("fancy", {})
        is_fancy = True
        casual_types = set(rule.get("excluded_types", []))
        preferred_categories = rule.get("preferred_categories", ["dress", "shoes", "outerwear"])
        
    elif "casual" in style.lower():
         rule = occasions_rules.get("casual", {})
         casual_types = set(rule.get("excluded_types", []))
         preferred_categories = rule.get("preferred_categories", ["tops", "bottoms", "shoes"])

    # Determine outfit plan
    # If fancy and female/unisex, we might use dress
    use_dress = is_fancy and gender not in ["men", "male"] and "dress" in preferred_categories
    
    current_categories = preferred_categories if use_dress else ["tops", "bottoms", "shoes"]
    
    # Calculate budgets for chosen categories
    # Normalize if categories changed (e.g. dress vs separates)
    current_budgets = {}
    total_weight = sum(allocations.get(cat, 0.3) for cat in current_categories)
    
    for cat in current_categories:
        weight = allocations.get(cat, 0.3)
        normalized_weight = weight / total_weight if total_weight > 0 else (1.0 / len(current_categories))
        current_budgets[cat] = budget_max * normalized_weight

    log.info(f"   💰 Budget allocation: {current_budgets}")
    
    all_outfit_items = []
    global_used_slugs = set()  # Track used items across all outfits
    missing_categories = []
    
    for outfit_idx in range(num_outfits):
        outfit_id = f"outfit_{outfit_idx + 1}"
        outfit_items = []
        outfit_total = 0.0
        
        log.info(f"\n   👔 Building {outfit_id} (Mode: {'Dress' if use_dress else 'Separates'})...")
        
        for category in current_categories:
            budget_for_category = current_budgets.get(category, budget_max * 0.3)
            
            # Fetch candidates (fetch more to allow filtering)
            candidates = await search_by_outfit_category(
                outfit_category=category,
                style_query=style,
                gender=gender,
                price_max=budget_for_category,
                exclude_slugs=list(global_used_slugs),
                top_k=20, # Fetch more to filter casuals
            )
            
            # Filter casual items if fancy
            if is_fancy:
                filtered = [
                    c for c in candidates 
                    if (c.get("type") or "").lower() not in casual_types
                ]
                if filtered:
                    candidates = filtered
                else:
                    log.warning(f"   ⚠️ Only casual items found for {category} in fancy mode. Using best available.")
            
            if not candidates:
                log.warning(f"   ⚠️ No {category} found under €{budget_for_category:.2f}")
                missing_categories.append((outfit_id, category, budget_for_category))
                continue
            
            # Select best available item
            selected = candidates[0]
            try:
                item_price = float(selected.get("price") or 0)
            except (ValueError, TypeError):
                item_price = 0.0
            
            outfit_items.append({
                "outfit_id": outfit_id,
                "category": category,
                "slug": selected["slug"],
                "title": selected["title"],
                "type": selected["type"],
                "price": item_price,
                "imageUrl": selected.get("imageUrl"),
                "color": selected.get("color"),
                "url": selected.get("url"),
            })
            
            global_used_slugs.add(selected["slug"])
            outfit_total += item_price
            
            log.info(f"      ✅ {category}: {selected['title'][:30]} (€{item_price:.2f})")
        
        # Verify outfit is complete
        if len(outfit_items) == len(current_categories):
            log.info(f"   ✅ {outfit_id} complete: €{outfit_total:.2f}")
            all_outfit_items.extend(outfit_items)
        else:
            # If we tried dress and failed, maybe retry with separates? 
            # For now, just log incomplete.
            log.warning(f"   ⚠️ {outfit_id} incomplete")
            all_outfit_items.extend(outfit_items)
    
    # Build result
    result_data = {
        "outfit_items": all_outfit_items,
        "num_outfits": num_outfits,
        "total_items": len(all_outfit_items),
        "budget_max": budget_max,
    }
    
    # Add missing categories note if any
    if missing_categories:
        result_data["missing_categories"] = [
            {"outfit_id": oid, "category": cat, "budget": bud}
            for oid, cat, bud in missing_categories
        ]
    
    return AgentResult(
        success=True,
        data=result_data,
        reasoning=f"Generated {num_outfits} outfits with {len(all_outfit_items)} items for '{style}' style.",
        confidence=0.95 if not missing_categories else 0.7,
    )


# Register as alternative handler
async def execute(task, context, stream_callback=None):
    """Entry point for orchestrator."""
    return await outfit_builder_v2_handler(task, context, stream_callback)
