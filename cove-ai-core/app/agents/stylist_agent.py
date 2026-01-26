"""
Stylist Agent - Recommends outfits for occasions and style preferences.

First specialized agent for Phase 2.
Handles outfit building, style coordination, and product selection.
"""

from app.agents.base_agent import BaseAgent, AgentResult
from app.core.agent_registry import Agent, registry
from typing import Dict, Any, List, Optional
import logging
import json
import os
import asyncio
import litellm
from pathlib import Path
from app.core.vibe_translator import VibeTranslator
from app.vector.store import get_conn, catalog_vocab

log = logging.getLogger("cove.agents.stylist")

# Load stylist config from file (NO HARDCODING!)
_config_path = Path(__file__).parent.parent.parent / "data" / "stylist_config.json"
try:
    with open(_config_path, "r") as f:
        _STYLIST_CONFIG = json.load(f)
    log.info(f"✓ Loaded stylist config from {_config_path}")
except Exception as e:
    log.warning(f"Failed to load stylist config: {e}, using minimal defaults")
    _STYLIST_CONFIG = {
        "occasions": {},
        "styles": {},
        "selection_reasons": {},
        "default_occasion": "casual",
        "default_style": "casual"
    }
# Load outfit config (for category mappings and constraints)
_outfit_config_path = Path(__file__).parent.parent.parent / "data" / "outfit_config.json"
try:
    with open(_outfit_config_path, "r") as f:
        _OUTFIT_CONFIG = json.load(f)
    log.info(f"✓ Loaded outfit config from {_outfit_config_path}")
except Exception as e:
    log.warning(f"Failed to load outfit config: {e}")
    _OUTFIT_CONFIG = {"category_mappings": {}}

class StylistAgent(BaseAgent):
    """
    Stylist Agent: Builds complete outfits based on occasion and style.
    
    ALL RULES LOADED FROM data/stylist_config.json - NO HARDCODING!
    
    Capabilities:
    - Parse occasion/style from natural language
    - Search products by category (tops, bottoms, shoes, accessories)
    - Apply style compatibility rules
    - Budget-aware selection
    
    Example:
        task = {
            "query": "business casual for meeting",
            "budget_max": 300,
            "categories": ["top", "bottom", "shoes"]
        }
        
        result = await stylist.execute(task, context)
        # Returns outfit items with reasoning
    """
    
    async def execute(
        self, 
        task: Dict[str, Any], 
        context: Dict[str, Any],
        stream_callback: Optional[Any] = None  # ✨ PHASE 6: Callback for streaming events
    ) -> AgentResult:
        """
        Build outfit based on query using real product search.
        
        Args:
            task: {
                "query": str,  # e.g., "date night outfit"
                "budget_max": int,  # optional, from config default
                "categories": List[str]  # optional, from config default
            }
            context: {
                "user_id": str,  # optional, for personalization
                "session_id": str,  # optional
                "guest_session_id": str  # optional
            }
        
        Returns:
            AgentResult with outfit_items list
        """
        query = task.get("query", "")
        # ✨ PHASE 4: Detect Vibe Keywords
        vibe_keywords = VibeTranslator.translate(query)
        if vibe_keywords:
            log.info(f"🔮 Detected Vibe Keywords: {vibe_keywords}")

        budget = task.get("budget_max", _STYLIST_CONFIG.get("default_budget", 500))
        categories = task.get("categories", _STYLIST_CONFIG.get("default_categories", ["top", "bottom"]))
        
        # 🐛 DEBUG STREAMING
        if stream_callback:
            log.info(f"✅ STYLIST: stream_callback RECEIVED. Type: {type(stream_callback)}")
        else:
            log.warning("⚠️ STYLIST: stream_callback is NONE! Streaming events will be skipped.")
            
        # Parse occasion and style from query (using config)
        occasion, style = self._parse_query(query)
        
        log.info(f"Building outfit for: {occasion} ({style} style), budget: €{budget}")
        
        # Search products per category
        # Search products per category
        candidates = {}
        remaining_budget = budget
        errors = []
        tools_used = []
        
        # Import here to avoid circular dependency
        
        # Import here to avoid circular dependency
        from app.routes.agent import _call_recs_suggest
        
        # ✨ WEEK 2 DAY 4: Recall user preferences for personalization
        user_preferences = {"dislikes": [], "likes": [], "colors": [], "recalled_memories": []}
        user_id = context.get("user_id")
        
        if user_id:
            try:
                from app.services.user_preference_manager import get_preference_manager
                pref_manager = await get_preference_manager()
                
                # Recall relevant memories for this context
                recalled = await pref_manager.recall_for_context(
                    user_id=user_id,
                    context=f"building {query}",
                    top_k=5
                )
                
                # Get full preference summary
                summary = await pref_manager.get_user_preferences_summary(user_id)
                
                user_preferences = {
                    "dislikes": summary.get("dislikes", []),
                    "likes": summary.get("likes", []),
                    "colors": summary.get("colors", []),
                    "recalled_memories": recalled
                }
                
                if recalled:
                    log.info(f"💭 Recalled {len(recalled)} user preferences for outfit building")
                    for mem in recalled:
                        log.info(f"  - [{mem['similarity']:.2f}] {mem['content'][:60]}")
                        
            except Exception as e:
                log.warning(f"Failed to recall user preferences: {e}")

        
        # ✨ WEEK 3 DAY 2: Intelligent Analysis (LLM)
        # Replaces simple config parsing with full reasoning
        visual_context = task.get("visual_context")
        analysis = await self._analyze_request_with_llm(query, budget, categories, user_preferences, vibe_keywords, visual_context)
        occasion = analysis.get("occasion", occasion) # Override heuristic
        style = analysis.get("style", style) # Override heuristic
        
        # ✨ CRITICAL: Gender Detection / Clarification
        # FIRST: Check if gender was already extracted by conversation flow
        context_gender = context.get("gender")
        if context_gender:
            log.info(f"👤 Using gender from context: {context_gender}")
            # Override LLM's gender detection with context-provided gender
            analysis["gender"] = context_gender
            detected_gender = context_gender
        else:
            detected_gender = analysis.get("gender")
        
        # Use original_query for gender detection (preserves "boyfriend", "girlfriend" etc.)
        original_query = context.get("original_query", "") or query

        # FALLBACK: If LLM didn't detect gender, use keyword matching on ORIGINAL query
        # We do this BEFORE halting to avoid unnecessary "ask_gender" stops
        if not detected_gender or detected_gender == "ask_gender":
            query_lower = original_query.lower()
            if any(kw in query_lower for kw in ["boyfriend", "husband", "for him", "for men", "men's", "mens", "male"]):
                detected_gender = "male"
                log.info(f"   👤 Gender detected via keyword fallback: male")
            elif any(kw in query_lower for kw in ["girlfriend", "wife", "for her", "for women", "women's", "womens", "female"]):
                detected_gender = "female"
                log.info(f"   👤 Gender detected via keyword fallback: female")
            
            # Update analysis with inferred gender
            if detected_gender and detected_gender != "ask_gender":
                 analysis["gender"] = detected_gender

        # If STILL ambiguous, DEFAULT TO UNISEX instead of halting.
        # If STILL ambiguous (or None), STOP AND ASK.
        
        # Normalize for check
        g_check = str(detected_gender).lower().strip() if detected_gender else ""
        
        if not detected_gender or g_check in ["ask_gender", "none", "null", "unknown", ""]:
            log.info(f"⚠️ Gender ambiguous ('{detected_gender}'). Requesting user clarification.")
            return AgentResult(
                success=True,
                data={
                    "needs_confirmation": True,
                    "confirmation_type": "gender",
                    "question": "To find the best fit, is this outfit for Men or Women?",
                    "options": [
                        {"label": "Women", "value": "women"},
                        {"label": "Men", "value": "men"},
                        {"label": "Unisex", "value": "unisex"}
                    ],
                    "candidates": {} # Ensure next agents don't crash
                },
                reasoning="Asking for gender clarification.",
                confidence=1.0
            )
        
        # KEY CHANGE: Allow LLM to expand categories (e.g. add shoes)
        # If LLM returns a specific list of categories, use it.
        # This breaks the reliance on static "default_categories"
        if analysis.get("categories"):
            categories = analysis["categories"]
            log.info(f"📋 LLM defined structure: {categories}")
            
        cat_queries = analysis.get("category_queries", {})
        
        log.info(f"🤖 Stylist Plan: {analysis.get('reasoning', 'No reasoning')}")

        try:
            for idx, category in enumerate(categories):
                try:
                    # ✨ PHASE 6: Emit category_start event for live exploration
                    if stream_callback:
                        log.info(f"📤 STYLIST emitting category_start for: {category}")
                        await stream_callback({
                            "event_type": "category_start",
                            "category": category,
                            "index": idx,
                            "total_categories": len(categories),
                            "status": f"Searching for {category}..."
                        })
                    else:
                        log.warning(f"⚠️ STYLIST: No stream_callback for category {category}")
                    
                    # ✨ HYBRID SEARCH IMPLEMENTATION
                    
                    # 1. Get Plan (Query + Filters)
                    cat_plan = analysis.get("category_plans", {}).get(category) or {}
                    category_query = cat_plan.get("query")
                    hard_filters = cat_plan.get("filters", {})
                    
                    # Fallback to simple query logic if no plan
                    if not category_query:
                         if cat_queries.get(category):
                             category_query = cat_queries[category]
                         else:
                             category_query = f"{style} {category} for {occasion}"
                    
                    # ✨ QUERY KEYWORD EXPANSION: Boost search with actual product type names
                    # e.g., "casual shoes" -> "casual shoes sneakers boots"
                    expanded_types = self._expand_type_filter(category.lower())
                    if expanded_types and len(expanded_types) > 1:
                        # Add product type keywords to improve vector search recall
                        type_keywords = " ".join(t for t in expanded_types if t.lower() != category.lower())
                        if type_keywords:
                            category_query += f" {type_keywords}"
                            log.info(f"   🔍 Query expanded with types: {type_keywords}")
                    
                    # ✨ PHASE 4: Vibe Injection
                    if vibe_keywords:
                        vibe_boost = " ".join(vibe_keywords)
                        category_query += f" {vibe_boost}"
                        log.info(f"   🔮 Boosting based on Vibe: {vibe_boost}")
                    
                    # ✨ WEEK 2 DAY 4: Inject Preferences into Query (The Picky Client Check)
                    # Even with hard filters, keeping this helps the Vector Search rank better
                    if user_preferences.get("colors"):
                        color_boost = " ".join(user_preferences["colors"])
                        category_query += f" {color_boost}"
                        log.info(f"   🎨 Boosting colors in query: {color_boost}")
                    
                    if user_preferences.get("likes"):
                        relevant_likes = [
                            like for like in user_preferences["likes"] 
                            if like in category_query or len(like.split()) > 1
                        ]
                        if relevant_likes:
                            like_boost = " ".join(relevant_likes)
                            category_query += f" {like_boost}"
                            log.info(f"   👍 Boosting likes in query: {like_boost}")
                        
                    # Build Search Payload
                    search_payload = {
                        "query": category_query,
                        "clerkUserId": context.get("user_id"),
                        "guestSessionId": context.get("guest_session_id"),
                        "filters": {
                            "price_max": remaining_budget
                        },
                        "top_k": 20
                    }
                    
                    # ✨ APPLY HARD FILTERS FROM LLM
                    if hard_filters:
                        # Only apply valid filters
                        if hard_filters.get("type"):
                            type_value = hard_filters["type"]
                            
                            # ✨ FIX: Handle comma-separated LLM output (e.g. "pants, skirt")
                            if isinstance(type_value, str) and "," in type_value:
                                type_list = [t.strip() for t in type_value.split(",")]
                                search_payload["filters"]["type"] = type_list
                                log.info(f"   🔄 SPLIT types to list: {type_list}")
                            
                            # ✨ TYPE EXPANSION: Map generic categories to actual product types
                            elif isinstance(type_value, str):
                                # e.g., "shoes" -> ["sneakers", "boots", "loafers", "heels"]
                                expanded_types = self._expand_type_filter(type_value)
                                if expanded_types and len(expanded_types) > 1:
                                    # Use list of types for OR matching
                                    search_payload["filters"]["type"] = expanded_types
                                    log.info(f"   🔄 Expanded type '{type_value}' -> {expanded_types}")
                                else:
                                    search_payload["filters"]["type"] = type_value
                        if hard_filters.get("color"):
                            search_payload["filters"]["color"] = hard_filters["color"]
                        
                        # ✨ APPLY BRAND FILTER
                        brand_val = hard_filters.get("brand") or analysis.get("brand_filter")
                        if brand_val:
                            search_payload["filters"]["brand"] = brand_val
                            log.info(f"   🏷️ Applied Brand Filter: {brand_val}")
                            
                        log.info(f"   🛡️ Applied Hard Filters for {category}: {search_payload['filters']}")
                    
                    # ✨ CRITICAL: Apply gender from LLM analysis
                    # Gender is already determined at the start of execute() (Context > LLM > Keyword Fallback > Unisex)
                    detected_gender = analysis.get("gender")
                    
                    # Use original_query for gender detection (preserves "boyfriend", "girlfriend" etc.)
                    original_query = context.get("original_query", "") or query
                    # log.info(f"   🔍 Gender Check - Original Query: '{original_query[:100]}'")
                    
                    # (Redundant fallback removed - already handled at start of execute)
                    
                    if detected_gender and detected_gender not in ["unisex", None]:
                        # Normalize LLM gender output to database values
                        gender_map = {
                            "male": "men",
                            "female": "women",
                            "men": "men",
                            "women": "women"
                        }
                        normalized_gender = gender_map.get(detected_gender.lower(), detected_gender)
                        search_payload["filters"]["gender"] = normalized_gender
                        log.info(f"   👤 Enforcing gender filter: {detected_gender} -> {normalized_gender}")
                    
                    # result = await _call_recs_suggest(search_payload)
                    # items = result.get("items", [])
                    
                    # ✨ DIRECT DB SEARCH (Avoids HTTP overhead and sync issues)
                    from app.vector.store import _search_hybrid_rrf_sync
                    from app.vector.store import async_embed_query, run_in_threadpool
                    
                    q_emb = await async_embed_query(search_payload["query"])
                    items = await run_in_threadpool(
                        _search_hybrid_rrf_sync,
                        query=search_payload["query"],
                        q_emb=q_emb,
                        kind="product",
                        top_k=search_payload.get("top_k", 20),
                        filters=search_payload.get("filters")
                    )
                    
                    # ✨ FALLBACK LOGIC (Retry strategies)
                    if not items:
                        # Strategy 1: Remove Color Filter
                        if search_payload["filters"].get("color"):
                            log.info(f"   ⚠️ No items found for {category} with color={search_payload['filters']['color']}. Retrying without color...")
                            del search_payload["filters"]["color"]
                            # Add simple boost
                            if hard_filters.get("color"):
                                search_payload["query"] += f" {hard_filters['color']}"
                            
                            result = await _call_recs_suggest(search_payload)
                            items = result.get("items", [])

                        # Strategy 2: Remove Type Filter (Extreme Fallback) - ONLY if still 0 items
                        if not items and search_payload["filters"].get("type"):
                            log.info(f"   ⚠️ Still no items for {category}. Retrying without strict type filter...")
                            del search_payload["filters"]["type"]
                             # The query usually contains the type (e.g. "hoodie"), so we just rely on semantic search
                            
                            result = await _call_recs_suggest(search_payload)
                            items = result.get("items", [])
                            log.info(f"   🔄 Extreme fallback found {len(items)} items for {category}")

                    # ✨ PHASE 6: Emit category_candidates event with discovered products
                    # First, filter candidates strictly for this category to prevent leakage (e.g. shoes in tops)
                    filtered_candidates = [
                        item for item in items 
                        if self._validate_category_relevance(category, item)
                    ]

                    if stream_callback and filtered_candidates:
                        # Send top 5 candidates with essential info for UI
                        preview_candidates = []
                        for item in filtered_candidates[:5]:
                            try:
                                candidate_data = self._extract_product_data(item)
                                if candidate_data:
                                    preview_candidates.append(candidate_data)
                            except Exception as exc:
                                log.warning(f"Error parsing item for candidates: {exc}")

                        await stream_callback({
                            "event_type": "category_candidates",
                            "category": category,
                            "candidates": preview_candidates,
                            "total_found": len(filtered_candidates),
                            "status": f"Found {len(filtered_candidates)} options for {category}"
                        })
                    elif stream_callback:
                        # Emit empty candidates validation
                        await stream_callback({
                            "event_type": "category_candidates",
                            "category": category,
                            "candidates": [],
                            "total_found": 0,
                            "status": f"No valid {category} found matching your criteria"
                        })
                    
                    if items:
                        # ✨ WEEK 2 DAY 4: Filter based on user preferences
                        # Remove items user explicitly dislikes
                        if user_preferences.get("dislikes"):
                            original_count = len(items)
                            
                            # Check if user dislikes this product type
                            disliked_types = []
                            for dislike_statement in user_preferences["dislikes"]:
                                statement_lower = dislike_statement.lower()
                                # Extract product types from dislike statements
                                if category.lower() in statement_lower or category.replace("_", " ").lower() in statement_lower:
                                    disliked_types.append(category)
                                    log.info(f"   🚫 User dislikes {category}: '{dislike_statement[:60]}'")
                            
                            # Skip this category entirely if user dislikes it
                            if category in disliked_types:
                                log.info(f"   ⏭️  Skipping {category} - user preference")
                                continue
                            
                            # Filter out specific disliked items (colors, patterns, etc.)
                            items = [
                                item for item in items
                                if not any(
                                    dislike_keyword in (item.get("title") or "").lower()
                                    or dislike_keyword in (item.get("color") or "").lower()
                                    for dislike_statement in user_preferences["dislikes"]
                                    for dislike_keyword in ["bright", "pattern", "flashy"]
                                    if dislike_keyword in dislike_statement.lower()
                                )
                            ]
                            
                            if len(items) < original_count:
                                log.info(f"   Filtered out {original_count - len(items)} items based on preferences")

                        # ✨ RETRIEVAL ONLY - Hand off to Outfit Builder
                        valid_items = []
                        for item in items:
                            clean = self._extract_product_data(item)
                            if clean and self._validate_category_relevance(category, clean):
                                valid_items.append(clean)
                        
                        candidates[category] = valid_items
                        log.info(f"   Stored {len(valid_items)} candidates for {category}")

                except Exception as e:
                    log.error(f"Search failed for {category}: {e}")
                    candidates[category] = []
                    continue
            
            # Return Candidates for Builder
            found_count = len(candidates)
            if found_count == 0:
                user_msg = "I looked through our catalog but couldn't find items matching your exact criteria. Try broadening your style or budget preferences."
            else:
                user_msg = f"I've found some great options for your {occasion} outfit across {found_count} categories. Take a look!"

            return AgentResult(
                success=True,
                data={
                    "candidates": candidates,
                    "intent": analysis,
                    "#debug_info": "Candidates retrieved, passed to OutfitBuilder",
                    "user_preferences": user_preferences or {}
                },
                reasoning=user_msg,
                confidence=1.0,
                tools_used=["hybrid_search"]
            )
            
        except Exception as e:
            log.error(f"Stylist execution failed: {e}")
            return AgentResult(
                success=False,
                errors=[str(e)],
                data={"candidates": {}},
                reasoning="Failed to retrieve candidates",
                confidence=0.0
            )

            # ✨ WEEK 3 DAY 1: Visual Validation (GPT-4o)
            if len(outfit_items) >= 2:
                try:
                    from app.agents.visual_validator import VisualValidator
                    validator = VisualValidator()
                    
                    log.info("🎨 Validating outfit visual harmony...")
                    validation = await validator.validate_outfit(outfit_items)
                    
                    if validation:
                        reasoning_parts.append(f"Stylist Check: {validation.get('critique')}")
                        
                        # Check Harmony
                        if validation.get("score", 1.0) < 0.6:
                            log.warning(f"⚠️ Outfit visual clash: {validation.get('issues')}")
                            
                        # Check Completeness
                        comp = validation.get("completeness_check", {})
                        if not comp.get("is_complete", True):
                            missing = comp.get("missing", [])
                            log.warning(f"⚠️ Outfit incomplete: Missing {', '.join(missing)}")
                            reasoning_parts.append(f"Note: Missing {', '.join(missing)}")
                        
                except Exception as e:
                    log.error(f"Visual validation failed (skipping): {e}")

        except Exception as e:
            errors.append(f"Error building outfit: {str(e)}")
            success = False
        
        reasoning = ". ".join(reasoning_parts) if reasoning_parts else "No items found"
        
        return AgentResult(
            success=success,
            data={
                "outfit_items": outfit_items,
                "total": total_cost,
                "within_budget": within_budget,
                "occasion": occasion,
                "style": style,
                "budget_remaining": remaining_budget,
                # Include validation data if available
                "visual_validation": validation if 'validation' in locals() else None
            },
            reasoning=reasoning,
            confidence=min(confidence, 1.0),
            tools_used=tools_used,
            errors=errors if errors else []
        )
    
    def _parse_query(self, query: str) -> tuple[str, str]:
        """
        Extract occasion and style from natural language query.
        Uses config file - NO HARDCODING!
        
        Args:
            query: User's outfit request
            
        Returns:
            (occasion, style) tuple
        """
        query_lower = query.lower()
        
        # Load occasion map from config
        occasions = _STYLIST_CONFIG.get("occasions", {})
        default_occasion = _STYLIST_CONFIG.get("default_occasion", "casual")
        
        occasion = default_occasion
        for occ_name, occ_data in occasions.items():
            keywords = occ_data.get("keywords", [])
            if any(kw in query_lower for kw in keywords):
                occasion = occ_name
                break
        
        # Load style map from config
        styles = _STYLIST_CONFIG.get("styles", {})
        
        # Get default style for this occasion
        occasion_data = occasions.get(occasion, {})
        style = occasion_data.get("default_style", _STYLIST_CONFIG.get("default_style", "casual"))
        
        # Override if style explicitly mentioned
        for style_name, style_data in styles.items():
            keywords = style_data.get("keywords", [])
            if any(kw in query_lower for kw in keywords):
                style = style_name
                break
        
        return occasion, style
    
    async def _analyze_request_with_llm(
        self, 
        query: str, 
        budget: float, 
        provided_categories: List[str], 
        user_preferences: Dict[str, Any] = None,
        vibe_keywords: List[str] = None,
        visual_context: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Use LLM to interpret style/occasion and generate Hybrid Search plans (Query + Filters).
        """
        try:
            raw_model = os.getenv("LLM_REASONING_MODEL", "openrouter/openai/gpt-4o-mini")
            # LiteLLM uses forward slash, not colon for providers
            model = raw_model.replace("openrouter:", "openrouter/")
            
            # ✨ HYBRID SEARCH: Fetch valid vocab to enforce valid filters
            vocab = await asyncio.to_thread(self._get_vocab)
            valid_types = ", ".join(vocab.get("types", []))
            valid_colors = ", ".join(vocab.get("colors", []))
            
            # Context regarding user preferences
            prefs_text = ""
            if user_preferences:
                if user_preferences.get("likes"):
                    prefs_text += f"\nUser Likes: {', '.join(user_preferences['likes'])}"
                if user_preferences.get("dislikes"):
                    prefs_text += f"\nUser Dislikes: {', '.join(user_preferences['dislikes'])}"
                if user_preferences.get("colors"):
                    prefs_text += f"\nPreferred Colors: {', '.join(user_preferences['colors'])}"

            # Vibe Context
            vibe_context = ""
            if vibe_keywords:
                 vibe_context = f"DETECTED AESTHETIC VIBE: This query matches specific visual styles. You MUST prioritize items with these attributes: {', '.join(vibe_keywords)}"
            
            category_constraint = ""
            if provided_categories and provided_categories != ["top", "bottom"] and provided_categories != ["sweatshirt", "sweater"]:
                 category_constraint = f"CONSTRAINT: You MUST generate plans for EXACTLY these categories: {', '.join(provided_categories)}. Do not add or remove."
            else:
                 category_constraint = "CONSTRAINT: You are the stylist. Decide what items make a COMPLETE outfit for this occasion. usually Top + Bottom + Shoes."

            # Visual DNA Context
            dna_context = ""
            if visual_context:
                dna_context = f"\nVISUAL SEARCH DNA (FROM IMAGE):\n{json.dumps(visual_context, indent=2)}\nUse this silhouette, vibe, and color as your PRIMARY STYLE GUIDE."

            # ✨ DYNAMIC RULES LOADING (Refactor: No Hardcoding)
            occasion_rules_text = "FASHION EXPERTISE - OCCASION RULES (STRICTLY FOLLOW THESE CONSTRAINTS):\n"
            # Get brands list for extraction
            brands_list = ", ".join(vocab.get("brands", []))
            
            occasions_config = _STYLIST_CONFIG.get("occasions", {})
            
            for occ_name, occ_data in occasions_config.items():
                # specific rules for this occasion
                rules = occ_data.get("rules", {})
                desc = occ_data.get("description", "")
                
                if rules:
                    occasion_rules_text += f"\n{occ_name.upper()} ({desc}) REQUIRES:\n"
                    for cat, rule in rules.items():
                        allowed = ", ".join(rule.get("allowed", []))
                        excluded = ", ".join(rule.get("excluded", []))
                        
                        rule_str = ""
                        if allowed:
                            rule_str += f"MUST BE [{allowed}]"
                        if excluded:
                            if rule_str: rule_str += " AND "
                            rule_str += f"NEVER [{excluded}]"
                            
                        if rule_str:
                            occasion_rules_text += f"   - {cat.title()}: {rule_str}\n"

            prompt = f"""You are an Expert Fashion Stylist AI using HYBRID SEARCH.
User Request: "{query}"
Budget: €{budget}
{category_constraint}
{prefs_text}
{vibe_context}
{dna_context}

DATABASE VOCABULARY (Use these EXACT values for filters):
- Allowed Types: {valid_types}
- Allowed Colors: {valid_colors}
- Allowed Brands: {brands_list}
- Allowed Genders: women, men, unisex

{occasion_rules_text}

CRITICAL: If the user asks for a specific occasion, you MUST apply its corresponding ALLOWED/EXCLUDED rules from the list above.
- Example: If occasion is FORMAL, you MUST NOT include shorts or tees.
- Example: If occasion is GYM, you MUST NOT include blazers or heels.

CRITICAL RULES FOR BANS:
1. **Formal/Wedding/Elegant:** MUST BAN: ["tee", "t-shirt", "hoodie", "sweatshirt", "graphic", "logo", "polo", "short", "denim", "sneaker", "runner", "sandal", "slide"].
2. **Gym/Active:** MUST BAN: ["denim", "jeans", "boot", "loafer", "leather", "formal", "dress shoe", "heel"].
3. **Streetwear/Casual:** DO NOT BAN sneakers, hoodies, or tees. These are essential.
4. **Be Precise:** Only ban items that truly clash with the requested style.

Task:
1. Analyze Occasion/Style - REASON about formality level first.
2. CRITICAL: Detect Gender.
   - If user says "men", "boyfriend", "him" -> "male"
   - If user says "women", "girlfriend", "her" -> "female"
   - If completely ambiguous (e.g. "I need a hoodie"), set gender to "ask_gender".
   - If phrasing implies self (e.g. "for me") and no profile, set "ask_gender".
3. Decide categories based on occasion appropriateness.
4. For EACH category, generate a search PLAN:
   - "query": VIBE and AESTHETIC description (e.g., "minimalist luxury", "aggressive techwear"). 
     - **CRITICAL**: Do NOT include generic category names (like "tops" or "shoes") in the query, as these are handled by filters.
     - **CRITICAL**: Focus on style/vibe keywords that would appear in descriptions.
   - "filters": Strict metadata constraints.
     - "type": MUST be occasion-appropriate from Allowed Types. This is the PRIMARY key for relevance.
     - "color": MUST be one of Allowed Colors if specified.
     - "brand": MUST be one of Allowed Brands if specified.

Response JSON Format:
{{
    "gender": "detected gender (women/men/unisex/ask_gender)",
    "brand_filter": "extracted brand name or null",
    "occasion": "detected occasion",
    "formality": "formal/smart_casual/casual/evening (important!)",
    "style": "detected style",
    "reasoning": "EXPLAIN why you chose these product types for this occasion",
    "categories": ["list", "of", "categories"],
    "category_plans": {{
        "CategoryName": {{
            "query": "semantic text with formality context",
            "filters": {{ "type": "occasion_appropriate_type", "color": "valid_color_or_null", "brand": "valid_brand_or_null" }}
        }}
    }}
}}
DO NOT output markdown. Just the JSON object.
"""
            response = await litellm.acompletion(
                model=model,
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"},
                temperature=0.2
            )
            
            return json.loads(response.choices[0].message.content)
            
        except Exception as e:
            log.error(f"LLM analysis failed: {e}")
            # Fallback
            occ, style = self._parse_query(query)
            return {
                "occasion": occ,
                "style": style,
                "categories": provided_categories,
                "category_plans": {}
            }

    def _get_selection_reason(self, category: str, occasion: str, style: str) -> str:
        """
        Generate explanation for why this item was selected.
        Uses config file - NO HARDCODING!
        
        Args:
            category: Product category
            occasion: Occasion type
            style: Style preference
            
        Returns:
            Human-readable reason
        """
        reasons = _STYLIST_CONFIG.get("selection_reasons", {})
        template = reasons.get(occasion, f"Matches {style} style")
        return template.format(category=category)

    def _extract_product_data(self, item: Any) -> Optional[Dict[str, Any]]:
        """Safe extraction of product data handling various formats (dict, Pydantic, etc)."""
        try:
            # Helper to get value from dict or object
            def get_val(obj, key, default=None):
                if isinstance(obj, dict):
                    return obj.get(key, default)
                return getattr(obj, key, default)

            # DEBUG RAW ITEM
            if "vortex" in str(get_val(item, "title", "")).lower():
                 import json
                 try:
                     # Try to dump if dict
                     if isinstance(item, dict):
                         log.info(f"📦 RAW VORTEX ITEM (DICT): {json.dumps(item, default=str)[:500]}...")
                     else:
                         log.info(f"📦 RAW VORTEX ITEM (OBJ): {item}")
                 except:
                     pass

            # Handle price (float, int, or string like "$100")
            raw_price = get_val(item, "price", 0)
            price = 0.0
            if isinstance(raw_price, (int, float)):
                price = float(raw_price)
            elif isinstance(raw_price, str):
                import re
                nums = re.findall(r"[\d\.]+", raw_price)
                if nums:
                    price = float(nums[0])
            
            # Handle image (imageUrl, image_url, image, images[])
            image_url = get_val(item, "imageUrl") or get_val(item, "image_url") or get_val(item, "image")
            
            # ✨ PREFER META IMAGE (CLOUDINARY) over local paths
            meta = get_val(item, "meta") or {}
            meta_img = meta.get("imageUrl") or meta.get("image_url") or meta.get("image")
            
            # If current is local/missing but meta has Cloudinary/Remote, swap immediately
            if meta_img and ("cloudinary" in str(meta_img) or "http" in str(meta_img)):
                 image_url = meta_img

            # Check if we have an array of images and pick the first one if empty
            if not image_url or "/static/" in str(image_url):
                images = get_val(item, "images", [])
                if not images:
                    images = meta.get("images", [])

                if images and isinstance(images, list) and len(images) > 0:
                    img_candidate = images[0]
                    # Handle dict vs string in images list
                    img_path = img_candidate if isinstance(img_candidate, str) else get_val(img_candidate, "url")
                    
                    # If found a remote image, use it
                    if img_path and "http" in str(img_path):
                        image_url = img_path

            # Fallback for brand/gender from meta dictionary if missing at top level
            brand = get_val(item, "brand")
            if not brand:
                meta = get_val(item, "meta")
                if isinstance(meta, dict):
                    brand = meta.get("brand")
            
            gender = get_val(item, "gender")
            if not gender:
                meta = get_val(item, "meta")
                if isinstance(meta, dict):
                    gender = meta.get("gender")

            # ✨ FORCE PRIORITIZE META PRICE if top-level is 0
            if price == 0:
                 meta_price = get_val(get_val(item, "meta", {}), "price") or get_val(get_val(item, "meta", {}), "base_price")
                 if meta_price:
                     try:
                         # Handle string price "$100" or just numbers
                         import re
                         nums = re.findall(r"[\d\.]+", str(meta_price))
                         if nums:
                             price = float(nums[0])
                     except:
                         pass

            # Ensure absolute image URL for frontend compatibility (only for local paths)
            final_image_url = image_url
            s_url = str(final_image_url) if final_image_url else ""
            if s_url and (s_url.startswith("/static/") or s_url.startswith("static/")):
                base_url = os.getenv("COVE_CORE_BASE_URL", "http://localhost:8000")
                final_image_url = f"{base_url.rstrip('/')}/{s_url.lstrip('/')}"
                log.info(f"   🔄 Fixed relative URL: {final_image_url}")

            # ✨ Populate outfit_category from type mapping if missing
            outfit_category = get_val(item, "outfit_category") or (get_val(item, "meta") or {}).get("outfit_category")
            
            # ✨ PREFER META TYPE if top-level is generic "product"
            sku_type = get_val(item, "type", "product")
            if sku_type == "product":
                 meta_type = (get_val(item, "meta") or {}).get("type")
                 if meta_type:
                     sku_type = meta_type
            
            if not outfit_category and sku_type:
                 mappings = _OUTFIT_CONFIG.get("category_mappings", {})
                 type_val = str(sku_type).lower().strip()
                 outfit_category = mappings.get(type_val)

            return {
                "title": get_val(item, "title", "Unknown Product"),
                "price": price,
                "imageUrl": final_image_url,
                "slug": get_val(item, "slug", ""),
                "type": sku_type,
                "outfit_category": outfit_category, # ✨ Added for UI grouping
                "color": get_val(item, "color"),  # For compatibility matching
                "brand": brand,
                "gender": gender,
                "variantId": get_val(item, "variantId") or (get_val(item, "meta") or {}).get("variantId"),
                "productId": get_val(item, "productId") or (get_val(item, "meta") or {}).get("productId") or get_val(item, "id"),
                "meta": get_val(item, "meta", {})
            }
        except Exception as e:
            log.warning(f"Failed to extract product data: {e}")
            return None

        return True

    def _validate_category_relevance(self, category: str, item: Dict[str, Any]) -> bool:
        """
        Configuration-driven category check. STRICTLY title-independent.
        Uses category_mappings from outfit_config.json and explicit metadata.
        """
        category = category.lower().strip()
        # Handle singular/plural mismatch (heuristic)
        if category.endswith("s") and category != "shoes" and category != "jeans":
             pass # keep plural
        elif category in ["top", "shoe", "bottom"]:
             # Map singular to standard plural config keys
             if category == "top": category = "tops"
             if category == "shoe": category = "shoes"
             if category == "bottom": category = "bottoms"
        
        meta = item.get("meta") or {}
        
        # 1. Metadata Field Check (outfit_category)
        item_category = (item.get("outfit_category") or meta.get("outfit_category") or "").lower().strip()
        if item_category and item_category != category:
            log.info(f"   🚫 Metadata rejection: '{item.get('title')}' is tagged '{item_category}', but we need '{category}'")
            return False
            
        # 2. Type-to-Category Mapping Check (from outfit_config.json)
        item_type = (item.get("type") or "").lower().strip()
        
        # ✨ FIX: If top-level type is generic "product", ignore it and look in meta
        if not item_type or item_type == "product":
             item_type = (meta.get("type") or "").lower().strip()

        if item_type and item_type != "product":
            mappings = _OUTFIT_CONFIG.get("category_mappings", {})
            mapped_category = mappings.get(item_type)
            
            if mapped_category and mapped_category != category:
                log.info(f"   🚫 Mapping rejection: Type '{item_type}' maps to '{mapped_category}', but we need '{category}'")
                return False
        
        # 3. Decision
        if not item_category and (not item_type or item_type == "product"):
            log.warning(f"   ⚠️ Ambiguous item: '{item.get('title')}' has no outfit_category or specific type. Allowing.")
            
        # ✨ ANTI-LEAKAGE: Title Keyword Check
        # Sometimes vector search returns semantically similar items (e.g. "tops" -> "high-tops")
        # We must explicitly reject them if the category is clearly wrong.
        title = (item.get("title") or "").lower()
        
        # Block Shoes in Tops
        if category in ["tops", "top", "shirt", "hoodie", "sweater"]:
            if any(x in title for x in ["shoe", "sneaker", "boot", "high-top", "footwear", "runner", "slide", "sandal"]):
                log.info(f"   🚫 Anti-leakage: Rejected '{title}' for Tops")
                return False
                
        # Block Tops in Shoes
        if category in ["shoes", "shoe", "footwear", "sneakers", "boots"]:
            # Be careful with "high-top" which contains "top"
            if any(x in title for x in ["shirt", "hoodie", "tee", "sweatshirt", "jacket", "vest"]):
                log.info(f"   🚫 Anti-leakage: Rejected '{title}' for Shoes")
                return False
            # If title has "top" but NOT "high-top" or "low-top"
            if "top" in title and "high-top" not in title and "low-top" not in title:
                 log.info(f"   🚫 Anti-leakage: Rejected '{title}' for Shoes (ambiguous 'top')")
                 return False

        # Block Bottoms in Tops
        if category in ["tops", "top"]:
             if any(x in title for x in ["pant", "jean", "trouser", "short", "skirt", "legging"]):
                 log.info(f"   🚫 Anti-leakage: Rejected '{title}' for Tops")
                 return False

        return True

    def _expand_type_filter(self, type_value: str) -> List[str]:
        """
        Expand a generic type filter to include all specific product types.
        Uses reverse mapping from outfit_config.json category_mappings.
        
        e.g., "shoes" -> ["sneakers", "boots", "loafers", "heels", "shoes"]
              "top" -> ["tee", "shirt", "blouse", "sweater", "hoodie", "sweatshirt", "top"]
        """
        try:
            from pathlib import Path
            import json
            
            config_path = Path(__file__).parent.parent.parent / "data" / "outfit_config.json"
            with open(config_path) as f:
                outfit_config = json.load(f)
            
            # Use 'category_mappings' (plural) as per the fixed JSON
            category_mappings = outfit_config.get("category_mappings", {})
            
            # Build reverse mapping: generic -> [specific types]
            reverse_map = {}
            for specific_type, generic_category in category_mappings.items():
                if generic_category not in reverse_map:
                    reverse_map[generic_category] = []
                # Ensure we capture all specific types for a category
                if specific_type not in reverse_map[generic_category]:
                    reverse_map[generic_category].append(specific_type)
            
            # Return expanded types if mapping exists
            type_lower = type_value.lower()
            if type_lower in reverse_map:
                expanded = reverse_map[type_lower]
                # Also include the type itself if not present
                if type_lower not in expanded:
                     expanded.append(type_lower)
                return expanded
            
            # No expansion needed
            return [type_value]
            
        except Exception as e:
            log.warning(f"Failed to expand type filter: {e}")
            return [type_value]

    def _get_vocab(self):
        """
        Helper to fetch catalog vocabulary for LLM prompt.
        Runs synchronously in thread.
        """
        try:
            with get_conn() as conn:
                v = catalog_vocab(conn)
                return {
                    "types": sorted(list(v.get("types", []))),
                    "colors": sorted(list(v.get("colors", []))),
                    "brands": sorted(list(v.get("brands", [])))
                }
        except Exception as e:
            log.warning(f"Failed to load vocab for hybrid search prompt: {e}")
            return {"types": [], "colors": [], "brands": []}


# Auto-register agent in global registry
async def stylist_handler(task: dict, context: dict, stream_callback=None) -> dict:
    """Handler function for registry - wraps StylistAgent.execute()
    
    ✨ PHASE 6: Added stream_callback for live product exploration
    """
    agent = StylistAgent("stylist")
    result = await agent.execute(task, context, stream_callback=stream_callback)
    return result.to_dict()


# Register on module import
registry.register(Agent(
    name="stylist",
    description="Style expert - recommends outfits for occasions and preferences",
    capabilities=["style", "outfit", "occasion", "fashion", "wardrobe", "look", "wear"],
    handler=stylist_handler,
    priority=10,  # High priority for outfit building
    config={}
))

log.info("✓ Stylist agent registered")
