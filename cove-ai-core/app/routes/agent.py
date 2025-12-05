# from __future__ import annotations

# import logging
# import os
# import re
# import json
# from typing import Any, Dict, List, Optional
# import time 
# import httpx
# from fastapi import APIRouter
# from pydantic import BaseModel, Field
# from typing_extensions import Literal

# from app.vector.store import connect
# from app.vector.store import get_conn
# from app.agent.orchestrator import classify
# from app.routes.rag import _parse_query_attrs  # reuse the same attrs logic as RAG
# from app.agent.filters import (
#     parse_numeric_filters,
#     build_filters,
#     is_structured_product_query,
#     build_rec_query,
# )
# from app.providers.llm import LLMClient  # history-aware chat LLM
# from app.config import DJANGO_BASE_URL, COVE_CORE_BASE_URL
# from app.cove_ai_tools import recommendations as tools_recs
# from app.cove_ai_tools import size_fit as tools_size_fit
# from app.cove_ai_tools import cart as tools_cart


# USE_TOOLS_LAYER = os.getenv("USE_TOOLS_LAYER", "true").lower() == "true"
# DISABLE_TOOLS_HTTP_FALLBACK = os.getenv("DISABLE_TOOLS_HTTP_FALLBACK", "false").lower() == "true"
# log = logging.getLogger("cove.agent")
# router = APIRouter()

# # How much history we send per LLM call (after trimming)
# MAX_HISTORY_MESSAGES = int(os.getenv("AGENT_MAX_HISTORY_MESSAGES", "8"))

# # Above this many messages, we try to summarise older turns
# HISTORY_SUMMARY_THRESHOLD = int(os.getenv("AGENT_HISTORY_SUMMARY_THRESHOLD", "16"))

# # Safety cap on summary length (characters)
# MAX_HISTORY_SUMMARY_CHARS = int(os.getenv("AGENT_MAX_HISTORY_SUMMARY_CHARS", "600"))

# #_conn = None  # shared read-only connection


# # ---------- I/O models ----------


# from typing_extensions import Literal
# # ...

# class AgentIn(BaseModel):
#     message: str
#     top_k: int = 6

#     # optional context for cart + user
#     cartId: Optional[str] = None
#     clerkUserId: Optional[str] = None
#     guestSessionId: Optional[str] = None
#     email: Optional[str] = None

#     # NEW: how much per-user history to use in the LLM fallback
#     # "user" = normal behavior, "none" = treat as fresh chat turn
#     historyScope: Literal["user", "none"] = "user"


# import re  # already imported at top, just make sure it's there

# async def _summarise_history_chunk(
#     history_chunk: List[Dict[str, Any]],
# ) -> Optional[str]:
#     """
#     Summarise older conversation turns into a compact text that
#     preserves only what matters for future shopping/size/policy questions.

#     We use the same LLMClient, but:
#       - only on long histories (see HISTORY_SUMMARY_THRESHOLD),
#       - we cap the characters to MAX_HISTORY_SUMMARY_CHARS.
#     """
#     if not history_chunk:
#         return None

#     # Keep only role + text content to avoid leaking extra fields.
#     simplified: List[Dict[str, str]] = []
#     for row in history_chunk:
#         role = (row.get("role") or "user").lower()
#         if role not in ("user", "assistant", "system"):
#             role = "user"
#         content = str(row.get("content") or "").strip()
#         if not content:
#             continue
#         simplified.append({"role": role, "content": content})

#     if not simplified:
#         return None

#     client = LLMClient()
#     messages = [
#         {
#             "role": "system",
#             "content": (
#                 "You summarise previous conversation turns for a fashion e-commerce assistant.\n"
#                 "Write a concise, neutral summary (2–4 short sentences) of what the user has asked "
#                 "and what the assistant answered so far.\n"
#                 "Focus ONLY on details that might matter for future product, size/fit, or policy questions.\n"
#                 "No markdown, no bullet symbols, under 80 words."
#             ),
#         },
#         {
#             "role": "user",
#             "content": json.dumps(simplified, ensure_ascii=False),
#         },
#     ]

#     try:
#         text = await client.generate(messages)
#         if not text:
#             return None
#         text = text.strip()
#         if len(text) > MAX_HISTORY_SUMMARY_CHARS:
#             text = text[:MAX_HISTORY_SUMMARY_CHARS]
#         return text or None
#     except Exception as e:
#         log.warning("history summarisation failed: %s", e, exc_info=True)
#         return None

# async def _prepare_history_for_llm(
#     history: List[Dict[str, Any]],
# ) -> tuple[Optional[str], List[Dict[str, Any]]]:
#     """
#     Apply the 'context diet':

#       - If history is short (<= MAX_HISTORY_MESSAGES):
#           → no summary, use history as-is.
#       - If history is longer:
#           → keep only the last MAX_HISTORY_MESSAGES entries as the tail,
#             and (optionally) summarise the older part into a short text.

#     Returns:
#       (summary_text_or_None, trimmed_tail_history)
#     """
#     if not history:
#         return None, []

#     # Short histories: no need for summarisation or trimming
#     if len(history) <= MAX_HISTORY_MESSAGES:
#         return None, history

#     # Split into "older stuff" and the latest tail we actually send
#     tail_count = MAX_HISTORY_MESSAGES
#     older = history[:-tail_count]
#     tail = history[-tail_count:]

#     summary: Optional[str] = None

#     # Only call the LLM summariser if we cross the threshold
#     if len(history) >= HISTORY_SUMMARY_THRESHOLD:
#         summary = await _summarise_history_chunk(older)

#     # If summarisation fails, we still have the tail, which is fine
#     return summary, tail


# def _is_short_smalltalk(msg: str, intent_kind: str) -> bool:
#     """
#     Detect very short, non-question messages that are likely just casual smalltalk.

#     Heuristics (no hard-coded greeting words):
#     - only for generic/unknown intents
#     - message length is short
#     - no question mark
#     - few tokens
#     """
#     q = (msg or "").strip()
#     if not q:
#         return False

#     # only consider for generic/unknown intents
#     if intent_kind not in ("generic", "unknown"):
#         return False

#     # very short text only
#     if len(q) > 40:
#         return False

#     # if it's a question, treat normally
#     if "?" in q:
#         return False

#     # token count heuristic: very few words → likely greeting / smalltalk
#     tokens = re.findall(r"\w+", q.lower())
#     if len(tokens) == 0:
#         return False
#     if len(tokens) > 4:
#         return False

#     return True


# class AgentItem(BaseModel):
#     title: str
#     url: str
#     slug: str
#     score: Optional[float] = None
#     reason: Optional[str] = None
#     type: Optional[str] = None
#     tier: Optional[str] = None
#     color: Optional[str] = None
#     size: Optional[str] = None
#     variantId: Optional[str] = None


# class AgentOut(BaseModel):
#     kind: Literal["answer", "recommendations", "cart_proposal"]
#     answer: str
#     citations: List[Dict[str, Any]] = Field(default_factory=list)
#     items: List[AgentItem] = Field(default_factory=list)
#     cart_payload: Optional[Dict[str, Any]] = None
#     debug_plan: Optional[Dict[str, Any]] = None


# class AgentCartAddIn(BaseModel):
#     variantId: str
#     size: str
#     quantity: int = 1

#     cartId: Optional[str] = None
#     clerkUserId: Optional[str] = None
#     guestSessionId: Optional[str] = None
#     email: Optional[str] = None
#     idempotencyKey: Optional[str] = None


# class AgentCartAddOut(BaseModel):
#     ok: bool
#     message: str

#     # full cart payload from Django (CartSerializer)
#     cart: Dict[str, Any]

#     # convenience fields for the frontend
#     cartId: Optional[str] = None
#     items: List[Dict[str, Any]] = Field(default_factory=list)


# # ---------- Small helpers ----------


# def _looks_like_cart_add(msg: str) -> bool:
#     """
#     Conservative detector for "add to cart" / "buy this" intents.
#     We keep this phrase-based because we really don't want false positives
#     that silently add items to the cart.
#     """
#     q = msg.lower()

#     # Clear "cart" phrases
#     if "cart" in q and any(kw in q for kw in ("add", "put", "into", "to my", "in my")):
#         return True

#     # Buy / purchase w/o the word "cart"
#     if re.search(r"\b(buy|purchase|order|checkout|i\'ll take|i will take)\b", q):
#         return True

#     # Short patterns like "add this", "add one" IF also mentioning a product type
#     if re.search(r"\badd (this|that|one|it)\b", q) and re.search(
#         r"\b(hoodie|bomber|jacket|jeans|t[- ]?shirt|shirt|cargo|pant|pants)\b",
#         q,
#     ):
#         return True

#     return False


# # ---------- AI profile integration ----------


# async def _load_ai_profile(clerk_user_id: str) -> Optional[Dict[str, Any]]:
#     """
#     Fetch AiUserProfile snapshot from Django.

#     Route (Django):
#       GET /ai_profiles/profile.get?clerkUserId=...

#     Returns:
#       - dict profile JSON if found
#       - None if profile does not exist (404)
#       - None on network / server error (with warning)
#     """
#     if not clerk_user_id:
#         return None

#     base = DJANGO_BASE_URL.rstrip("/")
#     url = f"{base}/ai_profiles/profile.get"

#     try:
#         async with httpx.AsyncClient(timeout=5) as cx:
#             r = await cx.get(url, params={"clerkUserId": clerk_user_id})

#         if r.status_code == 200:
#             return r.json()

#         if r.status_code == 404:
#             # Normal case for a new Clerk user: no AI profile row yet.
#             log.info(
#                 "ai_profile_get 404 (no profile yet) for clerkUserId=%s",
#                 clerk_user_id,
#             )
#             return None

#         # Anything else is an actual problem (500, 502, etc.)
#         log.warning(
#             "ai_profile_get non-200 %s for clerkUserId=%s: %s",
#             r.status_code,
#             clerk_user_id,
#             r.text,
#         )
#     except Exception as e:
#         log.warning("ai_profile_get failed for clerkUserId=%s: %s", clerk_user_id, e)

#     return None



# def _apply_profile_defaults_to_filters(
#     rec_filters: Dict[str, Any],
#     profile: Optional[Dict[str, Any]],
# ) -> Dict[str, Any]:
#     """
#     Use AiUserProfile as a *fallback* when the user didn't specify filters.

#     - color  → preferred_colors[0]
#     - size   → preferred_size_top (for tops / generic) if not explicitly set

#     Never override explicit user filters.
#     """
#     if not profile:
#         return rec_filters

#     merged = dict(rec_filters)

#     # Color personalization
#     if "color" not in merged:
#         colors = profile.get("preferred_colors") or []
#         if isinstance(colors, list) and colors:
#             merged["color"] = str(colors[0]).lower().strip()

#     # Size personalization (top is safest generic default)
#     if "size" not in merged:
#         sz_top = (profile.get("preferred_size_top") or "").upper().strip()
#         if sz_top:
#             merged["size"] = sz_top

#     return merged


# # ---------------------------------------------------------
# # Lightweight in-memory cache of last recommendations
# # keyed by cartId / clerkUserId / guestSessionId.
# # For multi-worker prod you'd swap this for Redis/DB.
# # ---------------------------------------------------------

# # ---------------------------------------------------------
# # Lightweight in-memory session caches.
# # For multi-worker prod you'd swap this for Redis/DB.
# # ---------------------------------------------------------

# _SESSION_RECS: Dict[str, List[Dict[str, Any]]] = {}
# _SESSION_LAST_USER_MSG: Dict[str, str] = {}




# def _session_key_from_body(body: AgentIn) -> Optional[str]:
#     if body.cartId:
#         return f"cart:{body.cartId}"
#     if body.clerkUserId:
#         return f"user:{body.clerkUserId}"
#     if body.guestSessionId:
#         return f"guest:{body.guestSessionId}"
#     return None


# def _store_session_recs(body: AgentIn, items: List[AgentItem]) -> None:
#     key = _session_key_from_body(body)
#     if not key:
#         return
#     _SESSION_RECS[key] = [it.dict() for it in items]


# def _get_session_recs(body: AgentIn) -> List[Dict[str, Any]]:
#     key = _session_key_from_body(body)
#     if not key:
#         return []
#     return _SESSION_RECS.get(key, [])

# def _update_last_user_message(body: AgentIn) -> None:
#     """
#     Remember the latest user message per logical session
#     (cartId / clerkUserId / guestSessionId).
#     """
#     key = _session_key_from_body(body)
#     if not key:
#         return
#     _SESSION_LAST_USER_MSG[key] = body.message


# def _get_last_user_message(body: AgentIn) -> Optional[str]:
#     """
#     Fetch the previous user message for this logical session,
#     if we have one.
#     """
#     key = _session_key_from_body(body)
#     if not key:
#         return None
#     return _SESSION_LAST_USER_MSG.get(key)


# async def _select_from_last_recs_via_llm(
#     message: str,
#     last_items: List[Dict[str, Any]],
#     prev_user_message: Optional[str] = None,
# ) -> Optional[List[int]]:
#     """
#     Use the LLM to choose which item indices (0-based) in last_items
#     the user is referring to, based on their free-text message and,
#     optionally, the previous user message.

#     Returns:
#       - list of indices [i, j, ...] if the model is confident that
#         the user refers to exactly one or several specific items
#       - None if ambiguous / no selection
#     """
#     if not last_items:
#         return None

#     # Expose only safe metadata to the model.
#     items_for_llm: List[Dict[str, Any]] = []
#     for idx, raw in enumerate(last_items):
#         items_for_llm.append(
#             {
#                 "index": idx,
#                 "title": raw.get("title"),
#                 "type": raw.get("type"),
#                 "color": raw.get("color"),
#                 "size": raw.get("size"),
#                 "slug": raw.get("slug"),
#                 "variantId": raw.get("variantId"),
#             }
#         )

#     system_prompt = """You are a helper that selects products from a list.

# You will receive:
# - 'items': a JSON array of visible products, each with an 'index' (0-based) and simple metadata.
# - 'user_message': the user's current message.
# - optionally 'previous_user_message': what the user said in the previous turn.

# Goals:
# - Decide whether the user is clearly referring to:
#     * exactly ONE item, or
#     * several specific items, or
#     * no clear subset.
# - The user may refer using:
#     * position ("the first hoodie", "item #2", "second and third"),
#     * descriptions (black hoodie, navy tee),
#     * colours,
#     * sizes,
#     * or pronouns ("this one", "that hoodie", "both of these").

# Output rules:
# - If they clearly refer to ONE item, respond:
#     {"mode": "one", "indices": [N]}
#   where N is the 0-based index from 'items'.
# - If they clearly refer to SEVERAL specific items, respond:
#     {"mode": "many", "indices": [N1, N2, ...]}
# - If it is ambiguous, or refers to a group like "all hoodies" without
#   specifying which of our items, respond:
#     {"mode": "none", "indices": []}

# Requirements:
# - Always respond with JSON ONLY, no explanations.
# - 'indices' must be a list of unique integers within the valid range of the items array.
# """

#     user_payload: Dict[str, Any] = {
#         "items": items_for_llm,
#         "user_message": message,
#     }
#     if prev_user_message:
#         user_payload["previous_user_message"] = prev_user_message

#     client = LLMClient()
#     raw = await client.generate(
#         [
#             {"role": "system", "content": system_prompt},
#             {
#                 "role": "user",
#                 "content": json.dumps(user_payload, ensure_ascii=False),
#             },
#         ]
#     )

#     try:
#         text = raw.strip()
#         # Some models may wrap JSON in ```...``` or ```json ...```
#         if text.startswith("```"):
#             text = text.strip("`").strip()
#             if text.lower().startswith("json"):
#                 text = text[4:].lstrip()
#         data = json.loads(text)
#     except Exception:
#         return None

#     mode = data.get("mode")
#     indices_raw = data.get("indices", [])

#     if not isinstance(indices_raw, list):
#         return None

#     # Normalise + validate indices
#     indices: List[int] = []
#     for x in indices_raw:
#         if isinstance(x, int) and 0 <= x < len(last_items):
#             if x not in indices:
#                 indices.append(x)

#     if not indices:
#         return None

#     if mode not in ("one", "many"):
#         return None

#     return indices



# # ---------- History → LLM helpers ----------


# async def _fetch_history_for_llm(
#     clerk_user_id: Optional[str],
#     guest_session_id: Optional[str],
#     limit: int = 20,
# ) -> List[Dict[str, Any]]:
#     """
#     Pull recent chat history from Django and return the raw message dicts.

#     We deliberately use the same history endpoint the frontend can hit:
#       GET /ai_profiles/history/?guestSessionId=...&clerkUserId=...&limit=...
#     """
#     if not clerk_user_id and not guest_session_id:
#         return []

#     base = DJANGO_BASE_URL.rstrip("/")
#     url = f"{base}/ai_profiles/history/"

#     params: Dict[str, str] = {"limit": str(max(1, min(limit, 100)))}
#     if clerk_user_id:
#         params["clerkUserId"] = clerk_user_id
#     else:
#         params["guestSessionId"] = guest_session_id or ""

#     try:
#         async with httpx.AsyncClient(timeout=5) as cx:
#             r = await cx.get(url, params=params)
#         if r.status_code != 200:
#             log.warning("history_get non-200 %s: %s", r.status_code, r.text)
#             return []
#         data = r.json()
#         msgs = data.get("messages") or []
#         if isinstance(msgs, list):
#             return msgs
#     except Exception as e:
#         log.warning("history_get failed: %s", e)

#     return []


# def _history_to_llm_messages(
#     history: List[Dict[str, Any]],
#     user_message: str,
#     *,
#     smalltalk: bool = False,
#     summary: Optional[str] = None,
# ) -> List[Dict[str, str]]:
#     """
#     Convert history rows (already trimmed) into OpenAI-style messages,
#     optionally prepending a summary of older turns.
#     """
#     is_first_turn = len(history) == 0

#     system_content = (
#         "You are Cove AI, a helpful assistant for the Cove streetwear brand.\n\n"
#         "Knowledge sources you may rely on in this mode:\n"
#         "- The conversation history you see below (previous user and assistant messages).\n"
#         "- The short summary of earlier turns (if provided).\n"
#         "- Your general reasoning skills.\n\n"
#         "Very important safety rules:\n"
#         "1. Do NOT invent concrete operational details about Cove that you have not been told "
#         "   explicitly in this conversation (or via structured tools, if present). This includes:\n"
#         "   - exact return policies or refund windows (e.g. '30 days')\n"
#         "   - shipping times, delivery dates, or regions\n"
#         "   - stock levels, sizes in stock, or availability of specific items\n"
#         "   - exact prices, discounts, promo codes, or taxes\n"
#         "   - addresses, phone numbers, or contact details\n"
#         "2. Only if the user explicitly asks about one of those, and you do NOT have explicit "
#         "   information from the messages so far, say clearly that this information is not configured yet "
#         "   and suggest checking the website or contacting support. Do NOT volunteer these limitations "
#         "   in casual greetings or unrelated answers.\n"
#         "3. When summarising or referring to past turns, be precise and faithful to what "
#         "   the user actually said earlier. If you are unsure, say you are not sure.\n"
#         "4. For general style, brand vibe, or non-operational questions, you may answer "
#         "   in a friendly, concise way, but stay plausible for a modern minimal streetwear brand.\n"
#         "5. Do NOT talk about what you *cannot* do (e.g. 'I can't add to cart in chat') unless the user "
#         "   explicitly asks about that capability. Focus on what you *can* help with instead.\n"
#     )

#     if smalltalk:
#         system_content += (
#             "\n\nThe user's current message is a very short, non-question smalltalk message. "
#             "Reply with a short friendly greeting and ONE short line about how you can help "
#             "with Cove products, sizes, or outfit ideas. "
#             "Do NOT mention stock configuration, availability, cart or checkout limitations, "
#             "or any specific past products in this reply. "
#             "Do NOT refer to earlier conversations unless the user explicitly mentions them "
#             "in this message."
#         )
#     elif is_first_turn:
#         system_content += (
#             "\n\nThis is the first message in the current chat session. "
#             "You only see the user's current message; do NOT assume they are still "
#             "asking about anything from a previous visit (such as specific hoodies, sizes, etc.). "
#             "Only bring up previous topics if the user clearly refers to them."
#         )
#     else:
#         system_content += (
#             "\n\nUse the conversation history below when it is clearly relevant to the user's "
#             "current message, but do not hallucinate topics that were never mentioned."
#         )

#     messages: List[Dict[str, str]] = [
#         {"role": "system", "content": system_content}
#     ]

#     # If we have a summary, add it as a separate system message
#     if summary:
#         messages.append(
#             {
#                 "role": "system",
#                 "content": (
#                     "Summary of earlier conversation (for context only; "
#                     "do not repeat verbatim unless the user asks): "
#                     + summary
#                 ),
#             }
#         )

#     for row in history:
#         role = row.get("role") or "user"
#         if role not in ("user", "assistant", "system"):
#             if role.lower() in ("bot", "assistant", "ai"):
#                 role = "assistant"
#             else:
#                 role = "user"

#         content = str(row.get("content") or "").strip()
#         if not content:
#             continue

#         messages.append({"role": role, "content": content})

#     messages.append({"role": "user", "content": user_message})
#     return messages




# async def _call_llm_with_history(
#     body: AgentIn,
#     intent_kind: str,
# ) -> Dict[str, Any]:
#     """
#     History-aware general chat fallback.

#     - If historyScope == "none": skip history entirely.
#     - Else: fetch recent history based on clerkUserId / guestSessionId,
#       then apply context diet:
#         * keep only last MAX_HISTORY_MESSAGES entries
#         * optionally summarise older turns if long enough.
#     """
#     raw_history_len = 0
#     summary: Optional[str] = None

#     if body.historyScope == "none":
#         history: List[Dict[str, Any]] = []
#     else:
#         raw_history = await _fetch_history_for_llm(
#             body.clerkUserId,
#             body.guestSessionId,
#             limit=20,
#         )
#         raw_history_len = len(raw_history)
#         summary, history = await _prepare_history_for_llm(raw_history)

#     # 1) Explicit greeting / small_talk labels
#     smalltalk = intent_kind in ("greeting", "small_talk")

#     # 2) Also allow heuristic detection for very short generic/unknown messages
#     if not smalltalk:
#         smalltalk = _is_short_smalltalk(body.message, intent_kind)

#     messages = _history_to_llm_messages(
#         history,
#         body.message,
#         smalltalk=smalltalk,
#         summary=summary,
#     )

#     client = LLMClient()
#     text = await client.generate(messages)

#     return {
#         "answer": text,
#         "history_len": raw_history_len,         # how many messages existed in total
#         "history_tail_len": len(history),       # how many we actually sent
#         "summary_used": bool(summary),
#         "history_scope": body.historyScope,
#     }





# # ---------- RAG / RECS / FIT delegates ----------


# async def _call_rag(query: str, top_k: int) -> Dict[str, Any]:
#     """
#     Delegate to /ai/rag/query via HTTP.
#     Keeps coupling loose: agent only knows the contract, not the internals.
#     """
#     try:
#         async with httpx.AsyncClient(timeout=12) as cx:
#             r = await cx.post(
#                 "http://127.0.0.1:8000/ai/rag/query",
#                 json={"query": query, "top_k": top_k},
#             )
#         if r.status_code == 200:
#             return r.json()
#         log.warning("rag.query non-200 %s: %s", r.status_code, r.text)
#     except Exception as e:
#         log.warning("rag.query failed: %s", e)

#     return {"answer": "Sorry—something went wrong fetching product info.", "citations": []}


# async def _call_recs_suggest(payload: Dict[str, Any]) -> Dict[str, Any]:
#     """
#     Wrapper around Cove's recommendations logic.

#     Priority:
#       1. If USE_TOOLS_LAYER=true → call cove_ai_tools.recommendations.recommend_products
#       2. If that fails and DISABLE_TOOLS_HTTP_FALLBACK=false → fall back to /ai/recs/suggest
#       3. Otherwise → return {} (no crash)
#     """
#     # -------- 1) Preferred path: tools layer --------
#     if USE_TOOLS_LAYER:
#         try:
#             # Normalise input for the tool contract
#             query = payload.get("query") or ""
#             filters = payload.get("filters") or {}
#             top_k = int(payload.get("top_k") or 4)

#             # If your tools contract defines a TypedDict, this matches:
#             tool_input: Dict[str, Any] = {
#                 "query": query,
#                 "filters": filters,
#                 "top_k": top_k,
#             }

#             # Call the tool (async)
#             tool_resp = await tools_recs.recommend_products(tool_input)

#             if isinstance(tool_resp, dict):
#                 return tool_resp

#             log.warning("recommend_products returned non-dict: %r", type(tool_resp))
#         except Exception:
#             log.exception("recommend_products tool failed")

#             # If we are not allowed to fall back, stop here
#             if DISABLE_TOOLS_HTTP_FALLBACK:
#                 return {}

#     # -------- 2) Fallback path: old HTTP endpoint --------
#     try:
#         async with httpx.AsyncClient(timeout=10) as cx:
#             r = await cx.post(
#                 "http://127.0.0.1:8000/ai/recs/suggest",
#                 json=payload,
#             )
#         if r.status_code == 200:
#             return r.json()
#         log.warning("recs.suggest non-200 %s: %s", r.status_code, r.text)
#     except Exception as e:
#         log.warning("recs.suggest failed: %s", e)

#     # -------- 3) Final fallback: empty result --------
#     return {}



# # --- FIT integration helpers -------------------------------------------------


# def _extract_body_metrics(msg: str) -> Optional[Dict[str, float]]:
#     """
#     Extract height (cm) and weight (kg) from free text.

#     Examples it should handle:
#       - "I'm 175cm and 70kg"
#       - "height 180 cm, weight 85 kg"
#       - "175 cm, 70 kg"
#     """
#     q = msg.lower()

#     # height: first number followed by 'cm'
#     h_match = re.search(r"(\d{2,3})\s*cm", q)
#     # weight: first number followed by 'kg'
#     w_match = re.search(r"(\d{2,3})\s*kg", q)

#     if not h_match or not w_match:
#         return None

#     try:
#         height_cm = float(h_match.group(1))
#         weight_kg = float(w_match.group(1))
#     except Exception:
#         return None

#     # sanity bounds: 140–210cm, 40–160kg
#     if not (140 <= height_cm <= 210 and 40 <= weight_kg <= 160):
#         return None

#     return {"height_cm": height_cm, "weight_kg": weight_kg}


# def _infer_fit_preference(msg: str) -> str:
#     """
#     Map free-text phrasing to one of:
#       tight, regular, loose, slim, oversized
#     Defaults to 'regular'.
#     """
#     q = msg.lower()

#     if any(k in q for k in ("oversize", "oversized", "baggy", "very loose")):
#         return "oversized"
#     if any(k in q for k in ("loose", "relaxed")):
#         return "loose"
#     if any(k in q for k in ("tight", "snug", "body fit", "slim fit", "slim")):
#         # prefer 'slim' to keep mapping stable
#         return "slim"
#     if any(k in q for k in ("regular fit", "standard fit", "normal fit")):
#         return "regular"

#     return "regular"


# async def _call_fit_recommend(
#     message: str,
#     attrs: Dict[str, Any],
#     profile: Optional[Dict[str, Any]] = None,
# ) -> Optional[Dict[str, Any]]:
#     """
#     Call Cove's size & fit engine if we can parse height+weight.

#     - product_type: from parsed attrs.types[0] if present, else None
#     - fit_preference: inferred from message text OR profile.preferred_fit
#     - slug: left None for now (generic type-level recommendation)
#     """
#     # 1) Extract numeric body metrics from the natural language
#     metrics = _extract_body_metrics(message)
#     if not metrics:
#         return None

#     # 2) Product type (e.g. "hoodie") from parsed attrs
#     product_type = None
#     if attrs.get("types"):
#         product_type = attrs["types"][0]

#     # 3) Fit preference from text, fallback to profile
#     fit_pref = _infer_fit_preference(message)
#     if fit_pref == "regular" and profile:
#         prof_pref = (profile.get("preferred_fit") or "").lower().strip()
#         if prof_pref in (
#             "tight",
#             "regular",
#             "loose",
#             "slim",
#             "oversized",
#             "relaxed",
#             "baggy",
#         ):
#             fit_pref = prof_pref

#     # 4) Canonical payload for the fit engine
#     payload: Dict[str, Any] = {
#         "gender": None,  # neutral for now
#         "height_cm": metrics["height_cm"],
#         "weight_kg": metrics["weight_kg"],
#         "fit_preference": fit_pref,
#         "product_type": product_type,
#         "slug": None,  # later can be wired to a specific product
#     }

#     # -------- 5) Preferred path: tools layer --------
#     if USE_TOOLS_LAYER:
#         try:
#             tool_input = dict(payload)  # shallow copy
#             resp = await tools_size_fit.get_size_fit_advice(tool_input)

#             if isinstance(resp, dict):
#                 return resp

#             log.warning("get_size_fit_advice returned non-dict: %r", type(resp))
#         except Exception:
#             log.exception("get_size_fit_advice tool failed")
#             if DISABLE_TOOLS_HTTP_FALLBACK:
#                 return None

#     # -------- 6) Fallback: direct HTTP to /ai/fit/recommend --------
#     try:
#         async with httpx.AsyncClient(timeout=8) as cx:
#             r = await cx.post(
#                 "http://127.0.0.1:8000/ai/fit/recommend",
#                 json=payload,
#             )
#         if r.status_code == 200:
#             return r.json()
#         log.warning("fit.recommend non-200 %s: %s", r.status_code, r.text)
#     except Exception:
#         log.exception("fit.recommend failed")

#     return None



# # ---------- Main agent endpoint ----------


# from app.vector.store import get_conn
# # ... other imports above ...


# @router.post("/ai/agent/query", response_model=AgentOut)
# async def agent_query(body: AgentIn) -> AgentOut:
#     """
#     Thin wrapper with timing around the main agent implementation.

#     This lets us measure end-to-end latency cleanly without touching
#     the branching logic inside _agent_query_impl.
#     """
#     t0 = time.perf_counter()

#     out: AgentOut = await _agent_query_impl(body)

#     t_end = time.perf_counter()
#     total_ms = int((t_end - t0) * 1000)

#     log.info(
#         "agent_timing",
#         extra={
#             "parse_ms": None,        # we'll split these later if we want
#             "retrieval_ms": None,
#             "llm_ms": None,
#             "total_ms": total_ms,
#             "kind": getattr(out, "kind", None),
#         },
#     )

#     return out


# async def _agent_query_impl(body: AgentIn) -> AgentOut:
#     """
#     Single entrypoint for Cove AI.

#     - Decides between:
#         * RAG answer ("answer")
#         * Product recommendations ("recommendations")
#         * Cart action plan ("cart_proposal")
#         * History-aware general chat (LLM)
#     - Pulls per-user AI profile (if signed in) to bias filters + fit.
#     - Returns a structured payload the frontend can execute.
#     """
#     q = body.message
#     prev_user_message = _get_last_user_message(body)
#     _update_last_user_message(body)

#     # 0) Optional AI profile lookup for signed-in users
#     ai_profile: Optional[Dict[str, Any]] = None
#     if body.clerkUserId:
#         ai_profile = await _load_ai_profile(body.clerkUserId)

#     # 1) DB-dependent parsing: use a *fresh* connection from the pool
#     with get_conn() as conn:
#         # 1a) Parse attributes (colors/types/sizes) using the same logic as RAG
#         attrs = _parse_query_attrs(conn, q)

#         # 1b) Parse numeric filters (price range etc.) in a generic way
#         numeric_filters = parse_numeric_filters(q)

#         # 1c) Merge into a unified filters dict for recs / tools
#         base_filters: Dict[str, Any] = build_filters(attrs, numeric_filters)

#     # 1d) Apply AI profile as fallback (never overriding explicit query filters)
#     rec_filters: Dict[str, Any] = _apply_profile_defaults_to_filters(
#         base_filters,
#         ai_profile,
#     )

#     # 2) Classify high-level intent (size_fit, policy, lookup_product, discover, etc.)
#     intent = await classify(q, attrs)
#     intent_kind = getattr(intent, "kind", "generic")
#     has_price_filter = getattr(intent, "has_price_filter", False)

#     # 3) Decide if user wants cart vs recs vs plain RAG / chat
#     wants_cart = _looks_like_cart_add(q)  # keep this conservative

#     # Only discovery intent should go to recommendations.
#     # All other intents (lookup_product, policy, care, unknown, history_meta)
#     # should be answered via RAG or LLM, not recs.
#     wants_recs = (not wants_cart) and (intent_kind == "discover")

#     debug_plan: Dict[str, Any] = {
#         "intent_kind": intent_kind,
#         "has_price_filter": has_price_filter,
#         "wants_cart": wants_cart,
#         "wants_recs": wants_recs,
#         "attrs": attrs,
#         "numeric_filters": numeric_filters or None,
#         "rec_filters": rec_filters or None,
#         "llm_used": False,
#         "history_scope": body.historyScope,
#     }

#     if ai_profile:
#         debug_plan["ai_profile_used"] = True
#         debug_plan["ai_profile_status"] = "loaded"
#         debug_plan["ai_profile_keys"] = sorted(ai_profile.keys())
#     else:
#         if body.clerkUserId:
#             debug_plan["ai_profile_used"] = False
#             debug_plan["ai_profile_status"] = "missing_for_clerk_user"
#         else:
#             debug_plan["ai_profile_used"] = False
#             debug_plan["ai_profile_status"] = "no_clerk_user"

#     # ------------- Branch 1: cart_proposal (plan only, no side-effects) -------------
#     if wants_cart:
#         # First try: resolve from the last recommendations (context-aware "this/second one")
#         last_recs = _get_session_recs(body)
#         debug_plan["last_recs_count"] = len(last_recs)

#         if last_recs:
#             indices = await _select_from_last_recs_via_llm(
#                 message=q,
#                 last_items=last_recs,
#                 prev_user_message=prev_user_message,
#             )
#             debug_plan["cart_source"] = "last_recs"
#             debug_plan["cart_selected_indices"] = indices
#             debug_plan["cart_prev_user_message"] = prev_user_message

#             # --- Case A: exactly ONE item resolved → normal cart_proposal ---
#             if indices and len(indices) == 1:
#                 chosen_raw = last_recs[indices[0]]
#                 top = AgentItem(**chosen_raw)

#                 # Prefer an explicit size from the current message (rec_filters)
#                 # but fall back to the size on the recommended item.
#                 chosen_size = rec_filters.get("size") or top.size
#                 nice_type = (top.type or rec_filters.get("type") or "item").lower()
#                 nice_color = (top.color or rec_filters.get("color") or "").lower()
#                 nice_size = (chosen_size or "").upper()

#                 parts: List[str] = ["Do you want me to add this"]
#                 if nice_color:
#                     parts.append(nice_color)
#                 parts.append(nice_type)
#                 if nice_size:
#                     parts.append(f"in size {nice_size}")
#                 parts.append("to your cart?")
#                 answer = " ".join(parts).replace("  ", " ").strip()

#                 cart_payload = {
#                     "variantId": top.variantId,
#                     "size": chosen_size,
#                     "quantity": 1,
#                     "cartId": body.cartId,
#                     "clerkUserId": body.clerkUserId,
#                     "guestSessionId": body.guestSessionId,
#                     "email": body.email,
#                 }

#                 return AgentOut(
#                     kind="cart_proposal",
#                     answer=answer,
#                     citations=[],
#                     items=[top],
#                     cart_payload=cart_payload,
#                     debug_plan=debug_plan,
#                 )

#             # --- Case B: several items resolved → list them, ask user to choose ---
#             if indices and len(indices) > 1:
#                 items: List[AgentItem] = []
#                 for i in indices:
#                     if 0 <= i < len(last_recs):
#                         raw = last_recs[i]
#                         if isinstance(raw, dict) and raw.get("slug"):
#                             items.append(AgentItem(**raw))

#                 debug_plan["cart_multi_candidates"] = [
#                     it.slug for it in items if it.slug
#                 ]

#                 if items:
#                     return AgentOut(
#                         kind="recommendations",
#                         answer=(
#                             "You mentioned more than one item. "
#                             "Please tap a specific product or tell me which number to add "
#                             "(for example: “add the first hoodie in size M”)."
#                         ),
#                         citations=[],
#                         items=items,
#                         cart_payload=None,
#                         debug_plan=debug_plan,
#                     )

#         # Second try: user message itself contains enough structured product info
#         structured_product = is_structured_product_query(attrs)
#         debug_plan["cart_structured_product"] = bool(structured_product)

#         if structured_product:
#             rec_query = build_rec_query(q, rec_filters)

#             rec_payload = {
#                 "query": rec_query,
#                 "filters": rec_filters,
#                 "top_k": max(1, min(body.top_k, 4)),
#             }
#             rec_resp = await _call_recs_suggest(rec_payload)

#             debug_plan["rec_query"] = rec_query

#             raw_items = rec_resp.get("items") or []

#             items: List[AgentItem] = [
#                 AgentItem(**it)
#                 for it in raw_items
#                 if isinstance(it, dict) and it.get("slug")
#             ]

#             debug_plan["rec_item_count"] = len(items)

#             if items:
#                 top = items[0]

#                 chosen_size = rec_filters.get("size") or top.size
#                 nice_type = (top.type or rec_filters.get("type") or "item").lower()
#                 nice_color = (top.color or rec_filters.get("color") or "").lower()
#                 nice_size = (top.size or rec_filters.get("size") or "").upper()

#                 parts = ["Do you want me to add this"]
#                 if nice_color:
#                     parts.append(nice_color)
#                 parts.append(nice_type)
#                 if nice_size:
#                     parts.append(f"in size {nice_size}")
#                 parts.append("to your cart?")
#                 answer = " ".join(parts).replace("  ", " ").strip()

#                 cart_payload = {
#                     "variantId": top.variantId,
#                     "size": chosen_size,
#                     "quantity": 1,
#                     "cartId": body.cartId,
#                     "clerkUserId": body.clerkUserId,
#                     "guestSessionId": body.guestSessionId,
#                     "email": body.email,
#                 }

#                 return AgentOut(
#                     kind="cart_proposal",
#                     answer=answer,
#                     citations=[],
#                     items=items,
#                     cart_payload=cart_payload,
#                     debug_plan=debug_plan,
#                 )

#             debug_plan["cart_add_note"] = "no_matching_item_from_recs"

#         # Third try: we have cart intent but no resolvable item → ask user
#         debug_plan["cart_add_note"] = "cart_intent_but_no_resolvable_item"
#         return AgentOut(
#             kind="answer",
#             answer=(
#                 "I’m not sure which item you want me to add. "
#                 "Please either click a specific product or say something like "
#                 "“Add the black hoodie in size M to my cart” or "
#                 "“Add the second hoodie to my cart.”"
#             ),
#             citations=[],
#             items=[],
#             cart_payload=None,
#             debug_plan=debug_plan,
#         )

#     # ------------- Branch 2: size & fit advisor --------------------------
#     # If user is clearly asking "which size?", prioritize FIT engine.
#     if intent_kind == "size_fit" and not wants_cart:
#         fit_resp = await _call_fit_recommend(q, attrs, profile=ai_profile)
#         if fit_resp:
#             size = fit_resp.get("size")
#             confidence = fit_resp.get("confidence")
#             notes = fit_resp.get("notes") or []
#             citations = fit_resp.get("citations") or []

#             size_part = (
#                 f"I’d recommend size {size}"
#                 if size
#                 else "I can’t confidently recommend a size"
#             )
#             if confidence is not None:
#                 size_part += f" (confidence ~{confidence:.0%})"

#             extra_note = ""
#             if notes:
#                 extra_note = " " + notes[0]
#                 if len(notes) > 1:
#                     extra_note += f" Also: {notes[1]}"

#             debug_plan["fit_used"] = True
#             debug_plan["fit_resp"] = fit_resp

#             return AgentOut(
#                 kind="answer",
#                 answer=f"{size_part}.{extra_note}".strip(),
#                 citations=citations,
#                 items=[],
#                 debug_plan=debug_plan,
#             )

#         # If fit call failed or metrics missing, fall through to recs/RAG/chat
#         debug_plan["fit_used"] = False

#     # ------------- Branch 3: recommendations (browse products) -------------
#     if wants_recs:
#         rec_query = build_rec_query(q, rec_filters)

#         rec_payload = {
#             "query": rec_query,
#             "filters": rec_filters,
#             "top_k": body.top_k,
#         }
#         rec_resp = await _call_recs_suggest(rec_payload)

#         debug_plan["rec_query"] = rec_query

#         raw_items = rec_resp.get("items") or []

#         items: List[AgentItem] = [
#             AgentItem(**it)
#             for it in raw_items
#             if isinstance(it, dict) and it.get("slug")
#         ]

#         debug_plan["rec_item_count"] = len(items)

#         if items:
#             # Remember this set for follow-up cart actions
#             _store_session_recs(body, items)

#             return AgentOut(
#                 kind="recommendations",
#                 answer="Here are some options that match what you asked for.",
#                 citations=[],
#                 items=items,
#                 debug_plan=debug_plan,
#             )

#         # if no items, we fall through to RAG / chat answer below

#     # ------------- Branch 4: generic fallback -----------------------------
#     # Decide between history-aware chat LLM vs RAG product answer.

#         # Decide between history-aware chat LLM vs RAG product answer.
#     use_llm_chat = intent_kind in (
#         "generic",
#         "policy",
#         "history_meta",
#         "unknown",
#         "greeting",
#         "small_talk",
#     )


#     if use_llm_chat and not wants_cart and not wants_recs:
#         llm_resp = await _call_llm_with_history(body, intent_kind=intent_kind)
#         debug_plan["llm_used"] = True
#         debug_plan["llm_history_len"] = llm_resp.get("history_len", 0)
#         debug_plan["llm_history_tail_len"] = llm_resp.get("history_tail_len", 0)
#         debug_plan["llm_history_summary_used"] = llm_resp.get("summary_used", False)
#         debug_plan["history_scope"] = llm_resp.get("history_scope", body.historyScope)

#         return AgentOut(
#             kind="answer",
#             answer=llm_resp.get("answer") or "Sorry, I couldn’t generate a response.",
#             citations=[],
#             items=[],
#             debug_plan=debug_plan,
#         )


#     debug_plan["llm_used"] = False

#     # Fallback: default to RAG answer
#     rag_resp = await _call_rag(q, body.top_k)
#     answer = rag_resp.get("answer") or "Sorry, I couldn’t find that."
#     citations = rag_resp.get("citations") or []

#     return AgentOut(
#         kind="answer",
#         answer=answer,
#         citations=citations,
#         items=[],
#         debug_plan=debug_plan,
#     )



# @router.post("/ai/agent/cart_add", response_model=AgentCartAddOut)
# async def agent_cart_add(body: AgentCartAddIn) -> AgentCartAddOut:
#     """
#     Thin wrapper for cart add that uses the tools layer first,
#     then falls back to Django /tools/cart.add if needed.

#     Frontend sends:
#       - variantId, size, quantity
#       - optional cartId, clerkUserId, guestSessionId, email, idempotencyKey
#     """

#     # Convenience extractor for final response shaping
#     def _shape_cart_response(data: Any) -> tuple[Optional[str], list[Dict[str, Any]]]:
#         cart_id: Optional[str] = None
#         items: list[Dict[str, Any]] = []
#         if isinstance(data, dict):
#             cart_id = data.get("id") or data.get("cartId")
#             raw_items = data.get("items")
#             if isinstance(raw_items, list):
#                 items = raw_items
#         return cart_id, items

#     payload: Dict[str, Any] = {
#         "variantId": body.variantId,
#         "size": body.size,
#         "quantity": body.quantity,
#     }
#     if body.cartId:
#         payload["cartId"] = body.cartId
#     if body.clerkUserId:
#         payload["clerkUserId"] = body.clerkUserId
#     if body.guestSessionId:
#         payload["guestSessionId"] = body.guestSessionId
#     if body.email:
#         payload["email"] = body.email

#     # -------- 1) Preferred path: tools layer --------
#     data: Any = None
#     status_ok: bool | None = None

#     if USE_TOOLS_LAYER:
#         try:
#             tool_input = dict(payload)  # shallow copy
#             if body.idempotencyKey:
#                 tool_input["idempotencyKey"] = body.idempotencyKey

#             tool_resp = await tools_cart.cart_add(tool_input)

#             # Expect tool_resp to either be:
#             #  - a dict with the same shape as Django's cart serializer, or
#             #  - a dict like {"ok": bool, "cart": {...}, ...}
#             if isinstance(tool_resp, dict) and "cart" in tool_resp:
#                 data = tool_resp["cart"]
#                 status_ok = bool(tool_resp.get("ok", True))
#             else:
#                 data = tool_resp
#                 status_ok = True  # assume success if no explicit flag

#         except Exception:
#             log.exception("tools_cart.cart_add failed")
#             if DISABLE_TOOLS_HTTP_FALLBACK:
#                 # Shape whatever we have (if any) into an error
#                 cart_id, items = _shape_cart_response(data or {})
#                 return AgentCartAddOut(
#                     ok=False,
#                     message="Cart tool failed.",
#                     cart=data or {},
#                     cartId=cart_id,
#                     items=items,
#                 )

#     # -------- 2) Fallback: direct Django HTTP if needed --------
#     if data is None or status_ok is None:
#         headers: Dict[str, str] = {"Content-Type": "application/json"}
#         if body.idempotencyKey:
#             headers["Idempotency-Key"] = body.idempotencyKey

#         url = f"{DJANGO_BASE_URL.rstrip('/')}/tools/cart.add"

#         try:
#             async with httpx.AsyncClient(timeout=10) as cx:
#                 resp = await cx.post(url, json=payload, headers=headers)

#             try:
#                 data = resp.json()
#             except Exception:
#                 data = {"raw": resp.text}

#             if 200 <= resp.status_code < 300:
#                 status_ok = True
#             else:
#                 status_ok = False
#         except Exception:
#             log.exception("Django cart.add HTTP call failed")
#             # Hard failure: no data to shape
#             return AgentCartAddOut(
#                 ok=False,
#                 message="Failed to reach cart backend.",
#                 cart={},
#                 cartId=None,
#                 items=[],
#             )

#     # -------- 3) Shape final response --------
#     cart_id, items = _shape_cart_response(data or {})

#     if status_ok:
#         return AgentCartAddOut(
#             ok=True,
#             message="Item added to cart.",
#             cart=data,
#             cartId=cart_id,
#             items=items,
#         )

#     # Non-2xx or tool error + data available
#     err_msg = "Failed to add item to cart."
#     if isinstance(data, dict) and data.get("error"):
#         err_msg = str(data["error"])

#     return AgentCartAddOut(
#         ok=False,
#         message=err_msg,
#         cart=data,
#         cartId=cart_id,
#         items=items,
#     )


from __future__ import annotations

import logging
import os
import re
import json
from typing import Any, Dict, List, Optional
import time
import httpx
from fastapi import APIRouter
from pydantic import BaseModel, Field
from typing_extensions import Literal

from app.vector.store import connect
from app.vector.store import get_conn
from app.agent.orchestrator import classify
from app.routes.rag import _parse_query_attrs  # reuse the same attrs logic as RAG
from app.agent.filters import (
    parse_numeric_filters,
    build_filters,
    is_structured_product_query,
    build_rec_query,
)
from app.providers.llm import LLMClient  # history-aware chat LLM
from app.config import DJANGO_BASE_URL, COVE_CORE_BASE_URL
from app.cove_ai_tools import recommendations as tools_recs
from app.cove_ai_tools import size_fit as tools_size_fit
from app.cove_ai_tools import cart as tools_cart

USE_TOOLS_LAYER = os.getenv("USE_TOOLS_LAYER", "true").lower() == "true"
DISABLE_TOOLS_HTTP_FALLBACK = os.getenv("DISABLE_TOOLS_HTTP_FALLBACK", "false").lower() == "true"
log = logging.getLogger("cove.agent")
router = APIRouter()

# How much history we send per LLM call (after trimming)
MAX_HISTORY_MESSAGES = int(os.getenv("AGENT_MAX_HISTORY_MESSAGES", "8"))

# Above this many messages, we try to summarise older turns
HISTORY_SUMMARY_THRESHOLD = int(os.getenv("AGENT_HISTORY_SUMMARY_THRESHOLD", "16"))

# Safety cap on summary length (characters)
MAX_HISTORY_SUMMARY_CHARS = int(os.getenv("AGENT_MAX_HISTORY_SUMMARY_CHARS", "600"))


class AgentIn(BaseModel):
    message: str
    top_k: int = 6

    # optional context for cart + user
    cartId: Optional[str] = None
    clerkUserId: Optional[str] = None
    guestSessionId: Optional[str] = None
    email: Optional[str] = None

    # how much per-user history to use in the LLM fallback
    # "user" = normal behavior, "none" = treat as fresh chat turn
    historyScope: Literal["user", "none"] = "user"


async def _summarise_history_chunk(
    history_chunk: List[Dict[str, Any]],
) -> Optional[str]:
    """
    Summarise older conversation turns into a compact text that
    preserves only what matters for future shopping/size/policy questions.
    """
    if not history_chunk:
        return None

    simplified: List[Dict[str, str]] = []
    for row in history_chunk:
        role = (row.get("role") or "user").lower()
        if role not in ("user", "assistant", "system"):
            role = "user"
        content = str(row.get("content") or "").strip()
        if not content:
            continue
        simplified.append({"role": role, "content": content})

    if not simplified:
        return None

    client = LLMClient()
    messages = [
        {
            "role": "system",
            "content": (
                "You summarise previous conversation turns for a fashion e-commerce assistant.\n"
                "Write a concise, neutral summary (2–4 short sentences) of what the user has asked "
                "and what the assistant answered so far.\n"
                "Focus ONLY on details that might matter for future product, size/fit, or policy questions.\n"
                "No markdown, no bullet symbols, under 80 words."
            ),
        },
        {
            "role": "user",
            "content": json.dumps(simplified, ensure_ascii=False),
        },
    ]

    try:
        text = await client.generate(messages)
        if not text:
            return None
        text = text.strip()
        if len(text) > MAX_HISTORY_SUMMARY_CHARS:
            text = text[:MAX_HISTORY_SUMMARY_CHARS]
        return text or None
    except Exception as e:
        log.warning("history summarisation failed: %s", e, exc_info=True)
        return None


async def _prepare_history_for_llm(
    history: List[Dict[str, Any]],
) -> tuple[Optional[str], List[Dict[str, Any]]]:
    """
    Apply the 'context diet':

      - If history is short (<= MAX_HISTORY_MESSAGES):
          → no summary, use history as-is.
      - If history is longer:
          → keep only the last MAX_HISTORY_MESSAGES entries as the tail,
            and (optionally) summarise the older part into a short text.
    """
    if not history:
        return None, []

    if len(history) <= MAX_HISTORY_MESSAGES:
        return None, history

    tail_count = MAX_HISTORY_MESSAGES
    older = history[:-tail_count]
    tail = history[-tail_count:]

    summary: Optional[str] = None

    if len(history) >= HISTORY_SUMMARY_THRESHOLD:
        summary = await _summarise_history_chunk(older)

    return summary, tail


def _is_short_smalltalk(msg: str, intent_kind: str) -> bool:
    """
    Detect very short, non-question messages that are likely just casual smalltalk.

    Heuristics (no hard-coded greeting words):
    - only for generic/unknown intents
    - message length is short
    - no question mark
    - few tokens
    """
    q = (msg or "").strip()
    if not q:
        return False

    if intent_kind not in ("generic", "unknown"):
        return False

    if len(q) > 40:
        return False

    if "?" in q:
        return False

    tokens = re.findall(r"\w+", q.lower())
    if len(tokens) == 0:
        return False
    if len(tokens) > 4:
        return False

    return True


class AgentItem(BaseModel):
    title: str
    url: str
    slug: str
    score: Optional[float] = None
    reason: Optional[str] = None
    type: Optional[str] = None
    tier: Optional[str] = None
    color: Optional[str] = None
    size: Optional[str] = None
    variantId: Optional[str] = None


class AgentOut(BaseModel):
    kind: Literal["answer", "recommendations", "cart_proposal"]
    answer: str
    citations: List[Dict[str, Any]] = Field(default_factory=list)
    items: List[AgentItem] = Field(default_factory=list)
    cart_payload: Optional[Dict[str, Any]] = None
    debug_plan: Optional[Dict[str, Any]] = None


class AgentCartAddIn(BaseModel):
    variantId: str
    size: str
    quantity: int = 1

    cartId: Optional[str] = None
    clerkUserId: Optional[str] = None
    guestSessionId: Optional[str] = None
    email: Optional[str] = None
    idempotencyKey: Optional[str] = None


class AgentCartAddOut(BaseModel):
    ok: bool
    message: str
    cart: Dict[str, Any]
    cartId: Optional[str] = None
    items: List[Dict[str, Any]] = Field(default_factory=list)


# ---------- Small helpers ----------


def _looks_like_cart_add(msg: str) -> bool:
    """
    Conservative detector for "add to cart" / "buy this" intents.
    """
    q = msg.lower()

    if "cart" in q and any(kw in q for kw in ("add", "put", "into", "to my", "in my")):
        return True

    if re.search(r"\b(buy|purchase|order|checkout|i\'ll take|i will take)\b", q):
        return True

    if re.search(r"\badd (this|that|one|it)\b", q) and re.search(
        r"\b(hoodie|bomber|jacket|jeans|joggers|t[- ]?shirt|shirt|cargo|pant|pants)\b",
        q,
    ):
        return True

    return False


# ---------- AI profile integration ----------


async def _load_ai_profile(clerk_user_id: str) -> Optional[Dict[str, Any]]:
    """
    Fetch AiUserProfile snapshot from Django.
    """
    if not clerk_user_id:
        return None

    base = DJANGO_BASE_URL.rstrip("/")
    url = f"{base}/ai_profiles/profile.get"

    try:
        async with httpx.AsyncClient(timeout=5) as cx:
            r = await cx.get(url, params={"clerkUserId": clerk_user_id})

        if r.status_code == 200:
            return r.json()

        if r.status_code == 404:
            log.info(
                "ai_profile_get 404 (no profile yet) for clerkUserId=%s",
                clerk_user_id,
            )
            return None

        log.warning(
            "ai_profile_get non-200 %s for clerkUserId=%s: %s",
            r.status_code,
            clerk_user_id,
            r.text,
        )
    except Exception as e:
        log.warning("ai_profile_get failed for clerkUserId=%s: %s", clerk_user_id, e)

    return None


def _apply_profile_defaults_to_filters(
    rec_filters: Dict[str, Any],
    profile: Optional[Dict[str, Any]],
) -> Dict[str, Any]:
    """
    Use AiUserProfile as a *fallback* when the user didn't specify filters.
    """
    if not profile:
        return rec_filters

    merged = dict(rec_filters)

    if "color" not in merged:
        colors = profile.get("preferred_colors") or []
        if isinstance(colors, list) and colors:
            merged["color"] = str(colors[0]).lower().strip()

    if "size" not in merged:
        sz_top = (profile.get("preferred_size_top") or "").upper().strip()
        if sz_top:
            merged["size"] = sz_top

    return merged


# ---------- In-memory session caches (single-process only) ----------

_SESSION_RECS: Dict[str, List[Dict[str, Any]]] = {}
_SESSION_LAST_USER_MSG: Dict[str, str] = {}


def _session_key_from_body(body: AgentIn) -> Optional[str]:
    if body.cartId:
        return f"cart:{body.cartId}"
    if body.clerkUserId:
        return f"user:{body.clerkUserId}"
    if body.guestSessionId:
        return f"guest:{body.guestSessionId}"
    return None


def _store_session_recs(body: AgentIn, items: List[AgentItem]) -> None:
    key = _session_key_from_body(body)
    if not key:
        return
    _SESSION_RECS[key] = [it.dict() for it in items]


def _get_session_recs(body: AgentIn) -> List[Dict[str, Any]]:
    key = _session_key_from_body(body)
    if not key:
        return []
    return _SESSION_RECS.get(key, [])


def _update_last_user_message(body: AgentIn) -> None:
    key = _session_key_from_body(body)
    if not key:
        return
    _SESSION_LAST_USER_MSG[key] = body.message


def _get_last_user_message(body: AgentIn) -> Optional[str]:
    key = _session_key_from_body(body)
    if not key:
        return None
    return _SESSION_LAST_USER_MSG.get(key)


async def _select_from_last_recs_via_llm(
    message: str,
    last_items: List[Dict[str, Any]],
    prev_user_message: Optional[str] = None,
) -> Optional[List[int]]:
    """
    Use the LLM to choose which item indices the user refers to,
    based on their free-text message + previous user message.
    """
    if not last_items:
        return None

    items_for_llm: List[Dict[str, Any]] = []
    for idx, raw in enumerate(last_items):
        items_for_llm.append(
            {
                "index": idx,
                "title": raw.get("title"),
                "type": raw.get("type"),
                "color": raw.get("color"),
                "size": raw.get("size"),
                "slug": raw.get("slug"),
                "variantId": raw.get("variantId"),
            }
        )

    system_prompt = """You are a helper that selects products from a list.

You will receive:
- 'items': a JSON array of visible products, each with an 'index' (0-based) and simple metadata.
- 'user_message': the user's current message.
- optionally 'previous_user_message': what the user said in the previous turn.

Goals:
- Decide whether the user is clearly referring to:
    * exactly ONE item, or
    * several specific items, or
    * no clear subset.
- The user may refer using positions, descriptions, colours, sizes, or pronouns.

Output rules:
- If they clearly refer to ONE item, respond:
    {"mode": "one", "indices": [N]}
- If they clearly refer to SEVERAL specific items, respond:
    {"mode": "many", "indices": [N1, N2, ...]}
- If it is ambiguous, respond:
    {"mode": "none", "indices": []}

Always respond with JSON only.
"""

    user_payload: Dict[str, Any] = {
        "items": items_for_llm,
        "user_message": message,
    }
    if prev_user_message:
        user_payload["previous_user_message"] = prev_user_message

    client = LLMClient()
    raw = await client.generate(
        [
            {"role": "system", "content": system_prompt},
            {
                "role": "user",
                "content": json.dumps(user_payload, ensure_ascii=False),
            },
        ]
    )

    try:
        text = raw.strip()
        if text.startswith("```"):
            text = text.strip("`").strip()
            if text.lower().startswith("json"):
                text = text[4:].lstrip()
        data = json.loads(text)
    except Exception:
        return None

    mode = data.get("mode")
    indices_raw = data.get("indices", [])

    if not isinstance(indices_raw, list):
        return None

    indices: List[int] = []
    for x in indices_raw:
        if isinstance(x, int) and 0 <= x < len(last_items):
            if x not in indices:
                indices.append(x)

    if not indices:
        return None

    if mode not in ("one", "many"):
        return None

    return indices


# ---------- History → LLM helpers ----------


async def _fetch_history_for_llm(
    clerk_user_id: Optional[str],
    guest_session_id: Optional[str],
    limit: int = 20,
) -> List[Dict[str, Any]]:
    """
    Pull recent chat history from Django and return the raw message dicts.
    """
    if not clerk_user_id and not guest_session_id:
        return []

    base = DJANGO_BASE_URL.rstrip("/")
    url = f"{base}/ai_profiles/history/"

    params: Dict[str, str] = {"limit": str(max(1, min(limit, 100)))}
    if clerk_user_id:
        params["clerkUserId"] = clerk_user_id
    else:
        params["guestSessionId"] = guest_session_id or ""

    try:
        async with httpx.AsyncClient(timeout=5) as cx:
            r = await cx.get(url, params=params)
        if r.status_code != 200:
            log.warning("history_get non-200 %s: %s", r.status_code, r.text)
            return []
        data = r.json()
        msgs = data.get("messages") or []
        if isinstance(msgs, list):
            return msgs
    except Exception as e:
        log.warning("history_get failed: %s", e)

    return []


def _history_to_llm_messages(
    history: List[Dict[str, Any]],
    user_message: str,
    *,
    smalltalk: bool = False,
    summary: Optional[str] = None,
) -> List[Dict[str, str]]:
    """
    Convert history rows (already trimmed) into OpenAI-style messages,
    optionally prepending a summary of older turns.
    """
    is_first_turn = len(history) == 0

    system_content = (
        "You are Cove AI, a helpful assistant for the Cove streetwear brand.\n\n"
        "Knowledge sources you may rely on in this mode:\n"
        "- The conversation history you see below (previous user and assistant messages).\n"
        "- The short summary of earlier turns (if provided).\n"
        "- Your general reasoning skills.\n\n"
        "Very important safety rules:\n"
        "1. Do NOT invent concrete operational details about Cove that you have not been told "
        "   explicitly in this conversation (or via structured tools, if present).\n"
        "2. Only if the user explicitly asks about such details and you do NOT have explicit "
        "   information, say clearly that this information is not configured yet and suggest "
        "   checking the website or contacting support.\n"
        "3. When summarising or referring to past turns, be precise and faithful.\n"
        "4. For general style, brand vibe, or non-operational questions, answer in a friendly, "
        "   concise way, plausible for a minimal streetwear brand.\n"
        "5. Do NOT talk about what you cannot do unless the user explicitly asks.\n"
    )

    if smalltalk:
        system_content += (
            "\n\nThe user's current message is a very short, non-question smalltalk message. "
            "Reply with a short friendly greeting and ONE short line about how you can help "
            "with Cove products, sizes, or outfit ideas today."
        )
    elif is_first_turn:
        system_content += (
            "\n\nThis is the first message in the current chat session. "
            "You only see the user's current message; do NOT assume they are still "
            "asking about anything from a previous visit."
        )
    else:
        system_content += (
            "\n\nUse the conversation history below when it is clearly relevant to the user's "
            "current message, but do not hallucinate topics that were never mentioned."
        )

    messages: List[Dict[str, str]] = [
        {"role": "system", "content": system_content}
    ]

    if summary:
        messages.append(
            {
                "role": "system",
                "content": (
                    "Summary of earlier conversation (for context only; "
                    "do not repeat verbatim unless the user asks): "
                    + summary
                ),
            }
        )

    for row in history:
        role = row.get("role") or "user"
        if role not in ("user", "assistant", "system"):
            if role.lower() in ("bot", "assistant", "ai"):
                role = "assistant"
            else:
                role = "user"

        content = str(row.get("content") or "").strip()
        if not content:
            continue

        messages.append({"role": role, "content": content})

    messages.append({"role": "user", "content": user_message})
    return messages


async def _call_llm_with_history(
    body: AgentIn,
    intent_kind: str,
) -> Dict[str, Any]:
    """
    History-aware general chat fallback.
    """
    raw_history_len = 0
    summary: Optional[str] = None

    if body.historyScope == "none":
        history: List[Dict[str, Any]] = []
    else:
        raw_history = await _fetch_history_for_llm(
            body.clerkUserId,
            body.guestSessionId,
            limit=20,
        )
        raw_history_len = len(raw_history)
        summary, history = await _prepare_history_for_llm(raw_history)

    smalltalk = intent_kind in ("greeting", "small_talk")
    if not smalltalk:
        smalltalk = _is_short_smalltalk(body.message, intent_kind)

    messages = _history_to_llm_messages(
        history,
        body.message,
        smalltalk=smalltalk,
        summary=summary,
    )

    client = LLMClient()
    text = await client.generate(messages)

    return {
        "answer": text,
        "history_len": raw_history_len,
        "history_tail_len": len(history),
        "summary_used": bool(summary),
        "history_scope": body.historyScope,
    }


# ---------- RAG / RECS / FIT delegates ----------


async def _call_rag(query: str, top_k: int) -> Dict[str, Any]:
    """
    Delegate to /ai/rag/query via HTTP.
    """
    try:
        async with httpx.AsyncClient(timeout=12) as cx:
            r = await cx.post(
                "http://127.0.0.1:8000/ai/rag/query",
                json={"query": query, "top_k": top_k},
            )
        if r.status_code == 200:
            return r.json()
        log.warning("rag.query non-200 %s: %s", r.status_code, r.text)
    except Exception as e:
        log.warning("rag.query failed: %s", e)

    return {"answer": "Sorry—something went wrong fetching product info.", "citations": []}


async def _call_recs_suggest(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Wrapper around Cove's recommendations logic (tools first, then HTTP).
    """
    if USE_TOOLS_LAYER:
        try:
            query = payload.get("query") or ""
            filters = payload.get("filters") or {}
            top_k = int(payload.get("top_k") or 4)

            tool_input: Dict[str, Any] = {
                "query": query,
                "filters": filters,
                "top_k": top_k,
            }

            tool_resp = await tools_recs.recommend_products(tool_input)

            if isinstance(tool_resp, dict):
                return tool_resp

            log.warning("recommend_products returned non-dict: %r", type(tool_resp))
        except Exception:
            log.exception("recommend_products tool failed")

            if DISABLE_TOOLS_HTTP_FALLBACK:
                return {}

    try:
        async with httpx.AsyncClient(timeout=10) as cx:
            r = await cx.post(
                "http://127.0.0.1:8000/ai/recs/suggest",
                json=payload,
            )
        if r.status_code == 200:
            return r.json()
        log.warning("recs.suggest non-200 %s: %s", r.status_code, r.text)
    except Exception as e:
        log.warning("recs.suggest failed: %s", e)

    return {}


# --- FIT integration helpers -------------------------------------------------


def _extract_body_metrics(msg: str) -> Optional[Dict[str, float]]:
    q = msg.lower()

    h_match = re.search(r"(\d{2,3})\s*cm", q)
    w_match = re.search(r"(\d{2,3})\s*kg", q)

    if not h_match or not w_match:
        return None

    try:
        height_cm = float(h_match.group(1))
        weight_kg = float(w_match.group(1))
    except Exception:
        return None

    if not (140 <= height_cm <= 210 and 40 <= weight_kg <= 160):
        return None

    return {"height_cm": height_cm, "weight_kg": weight_kg}


def _infer_fit_preference(msg: str) -> str:
    q = msg.lower()

    if any(k in q for k in ("oversize", "oversized", "baggy", "very loose")):
        return "oversized"
    if any(k in q for k in ("loose", "relaxed")):
        return "loose"
    if any(k in q for k in ("tight", "snug", "body fit", "slim fit", "slim")):
        return "slim"
    if any(k in q for k in ("regular fit", "standard fit", "normal fit")):
        return "regular"

    return "regular"


async def _call_fit_recommend(
    message: str,
    attrs: Dict[str, Any],
    profile: Optional[Dict[str, Any]] = None,
) -> Optional[Dict[str, Any]]:
    metrics = _extract_body_metrics(message)
    if not metrics:
        return None

    product_type = None
    if attrs.get("types"):
        product_type = attrs["types"][0]

    fit_pref = _infer_fit_preference(message)
    if fit_pref == "regular" and profile:
        prof_pref = (profile.get("preferred_fit") or "").lower().strip()
        if prof_pref in (
            "tight",
            "regular",
            "loose",
            "slim",
            "oversized",
            "relaxed",
            "baggy",
        ):
            fit_pref = prof_pref

    payload: Dict[str, Any] = {
        "gender": None,
        "height_cm": metrics["height_cm"],
        "weight_kg": metrics["weight_kg"],
        "fit_preference": fit_pref,
        "product_type": product_type,
        "slug": None,
    }

    if USE_TOOLS_LAYER:
        try:
            tool_input = dict(payload)
            resp = await tools_size_fit.get_size_fit_advice(tool_input)

            if isinstance(resp, dict):
                return resp

            log.warning("get_size_fit_advice returned non-dict: %r", type(resp))
        except Exception:
            log.exception("get_size_fit_advice tool failed")
            if DISABLE_TOOLS_HTTP_FALLBACK:
                return None

    try:
        async with httpx.AsyncClient(timeout=8) as cx:
            r = await cx.post(
                "http://127.0.0.1:8000/ai/fit/recommend",
                json=payload,
            )
        if r.status_code == 200:
            return r.json()
        log.warning("fit.recommend non-200 %s: %s", r.status_code, r.text)
    except Exception:
        log.exception("fit.recommend failed")

    return None


# ---------- NEW: LLM-based discover intro (Zalando-style) ----------


async def _build_discover_intro(
    body: AgentIn,
    items: List[AgentItem],
    attrs: Dict[str, Any],
    rec_filters: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Build a short intro sentence for a recommendations list.

    - Always returns some text.
    - If historyScope=='none' or no history exists → generic non-history intro.
    - If history exists → we pull history + summary and let the LLM decide
      whether to reference it (no magic phrase lists).
    """
    default_text = "Here are some options that match what you asked for."

    if not items:
        return {
            "text": default_text,
            "llm_used": False,
            "history_len": 0,
            "summary_used": False,
        }

    # If user explicitly disabled history, do not even fetch it.
    if body.historyScope == "none":
        return {
            "text": default_text,
            "llm_used": False,
            "history_len": 0,
            "summary_used": False,
        }

    # Pull history & summary (context diet) – we only need counts + summary text.
    raw_history = await _fetch_history_for_llm(
        body.clerkUserId,
        body.guestSessionId,
        limit=20,
    )
    history_len = len(raw_history)

    if history_len == 0:
        # No history to be clever with, stick to a generic line.
        return {
            "text": default_text,
            "llm_used": False,
            "history_len": 0,
            "summary_used": False,
        }

    summary, _tail = await _prepare_history_for_llm(raw_history)

    # Small preview of items (we don't need full cart payload).
    items_preview: List[Dict[str, Any]] = []
    for it in items[:6]:
        items_preview.append(
            {
                "title": it.title,
                "type": it.type,
                "color": it.color,
                "size": it.size,
                "tier": it.tier,
            }
        )

    system_prompt = """You write ONE short intro sentence for a product recommendation list.

Input JSON has:
- "message":   the user's current request (natural language).
- "attrs":     parsed attributes like colors/types/sizes from the query.
- "rec_filters": final filters (type, color, size, price filters, etc.).
- "items_preview": a few products that will be shown (title, type, color, size, tier).
- "history_len": how many prior messages exist in this chat.
- "summary":   a short summary of earlier conversation (may be empty).

Rules:
- If history_len == 0 OR summary is empty:
    → write a generic one-sentence intro that does NOT mention earlier conversation.
- If history_len > 0 AND summary is non-empty:
    → you MAY lightly reference the ongoing chat or style vibe
      (e.g. "Based on your style so far, here are...").
- Never mention "history_len" or "summary" explicitly.
- Do NOT list specific product names or numbers; the UI will show products below.
- Max 22 words. Friendly, concise, on-brand for a minimal modern streetwear shop.
- Output ONLY the sentence. No JSON, no quotes, no bullet points.
"""

    user_payload = {
        "message": body.message,
        "attrs": attrs,
        "rec_filters": rec_filters,
        "items_preview": items_preview,
        "history_len": history_len,
        "summary": summary or "",
    }

    client = LLMClient()
    try:
        text = await client.generate(
            [
                {"role": "system", "content": system_prompt},
                {
                    "role": "user",
                    "content": json.dumps(user_payload, ensure_ascii=False),
                },
            ]
        )
        text = (text or "").strip()
        if not text:
            raise ValueError("empty intro from LLM")

        if len(text) > 250:
            text = text[:250]

        return {
            "text": text,
            "llm_used": True,
            "history_len": history_len,
            "summary_used": bool(summary),
        }
    except Exception as e:
        log.warning("discover intro LLM failed: %s", e, exc_info=True)
        # Fallback to generic intro but still report history_len for debugging.
        return {
            "text": default_text,
            "llm_used": False,
            "history_len": history_len,
            "summary_used": bool(summary),
        }


# ---------- Main agent endpoint ----------


@router.post("/ai/agent/query", response_model=AgentOut)
async def agent_query(body: AgentIn) -> AgentOut:
    t0 = time.perf_counter()
    out: AgentOut = await _agent_query_impl(body)
    t_end = time.perf_counter()
    total_ms = int((t_end - t0) * 1000)

    log.info(
        "agent_timing",
        extra={
            "parse_ms": None,
            "retrieval_ms": None,
            "llm_ms": None,
            "total_ms": total_ms,
            "kind": getattr(out, "kind", None),
        },
    )

    return out


async def _agent_query_impl(body: AgentIn) -> AgentOut:
    q = body.message
    prev_user_message = _get_last_user_message(body)
    _update_last_user_message(body)

    ai_profile: Optional[Dict[str, Any]] = None
    if body.clerkUserId:
        ai_profile = await _load_ai_profile(body.clerkUserId)

    with get_conn() as conn:
        attrs = _parse_query_attrs(conn, q)
        numeric_filters = parse_numeric_filters(q)
        base_filters: Dict[str, Any] = build_filters(attrs, numeric_filters)

    rec_filters: Dict[str, Any] = _apply_profile_defaults_to_filters(
        base_filters,
        ai_profile,
    )

    intent = await classify(q, attrs)
    intent_kind = getattr(intent, "kind", "generic")
    has_price_filter = getattr(intent, "has_price_filter", False)

    wants_cart = _looks_like_cart_add(q)
    wants_recs = (not wants_cart) and (intent_kind == "discover")

    debug_plan: Dict[str, Any] = {
        "intent_kind": intent_kind,
        "has_price_filter": has_price_filter,
        "wants_cart": wants_cart,
        "wants_recs": wants_recs,
        "attrs": attrs,
        "numeric_filters": numeric_filters or None,
        "rec_filters": rec_filters or None,
        "llm_used": False,
        "history_scope": body.historyScope,
    }

    if ai_profile:
        debug_plan["ai_profile_used"] = True
        debug_plan["ai_profile_status"] = "loaded"
        debug_plan["ai_profile_keys"] = sorted(ai_profile.keys())
    else:
        if body.clerkUserId:
            debug_plan["ai_profile_used"] = False
            debug_plan["ai_profile_status"] = "missing_for_clerk_user"
        else:
            debug_plan["ai_profile_used"] = False
            debug_plan["ai_profile_status"] = "no_clerk_user"

    # --- Branch 1: cart_proposal -------------------------------------------------
    if wants_cart:
        last_recs = _get_session_recs(body)
        debug_plan["last_recs_count"] = len(last_recs)

        if last_recs:
            indices = await _select_from_last_recs_via_llm(
                message=q,
                last_items=last_recs,
                prev_user_message=prev_user_message,
            )
            debug_plan["cart_source"] = "last_recs"
            debug_plan["cart_selected_indices"] = indices
            debug_plan["cart_prev_user_message"] = prev_user_message

            if indices and len(indices) == 1:
                chosen_raw = last_recs[indices[0]]
                top = AgentItem(**chosen_raw)

                chosen_size = rec_filters.get("size") or top.size
                nice_type = (top.type or rec_filters.get("type") or "item").lower()
                nice_color = (top.color or rec_filters.get("color") or "").lower()
                nice_size = (chosen_size or "").upper()

                parts: List[str] = ["Do you want me to add this"]
                if nice_color:
                    parts.append(nice_color)
                parts.append(nice_type)
                if nice_size:
                    parts.append(f"in size {nice_size}")
                parts.append("to your cart?")
                answer = " ".join(parts).replace("  ", " ").strip()

                cart_payload = {
                    "variantId": top.variantId,
                    "size": chosen_size,
                    "quantity": 1,
                    "cartId": body.cartId,
                    "clerkUserId": body.clerkUserId,
                    "guestSessionId": body.guestSessionId,
                    "email": body.email,
                }

                return AgentOut(
                    kind="cart_proposal",
                    answer=answer,
                    citations=[],
                    items=[top],
                    cart_payload=cart_payload,
                    debug_plan=debug_plan,
                )

            if indices and len(indices) > 1:
                items: List[AgentItem] = []
                for i in indices:
                    if 0 <= i < len(last_recs):
                        raw = last_recs[i]
                        if isinstance(raw, dict) and raw.get("slug"):
                            items.append(AgentItem(**raw))

                debug_plan["cart_multi_candidates"] = [
                    it.slug for it in items if it.slug
                ]

                if items:
                    return AgentOut(
                        kind="recommendations",
                        answer=(
                            "You mentioned more than one item. "
                            "Please tap a specific product or tell me which number to add "
                            "(for example: “add the first hoodie in size M”)."
                        ),
                        citations=[],
                        items=items,
                        cart_payload=None,
                        debug_plan=debug_plan,
                    )

        structured_product = is_structured_product_query(attrs)
        debug_plan["cart_structured_product"] = bool(structured_product)

        if structured_product:
            rec_query = build_rec_query(q, rec_filters)

            rec_payload = {
                "query": rec_query,
                "filters": rec_filters,
                "top_k": max(1, min(body.top_k, 4)),
            }
            rec_resp = await _call_recs_suggest(rec_payload)

            debug_plan["rec_query"] = rec_query

            raw_items = rec_resp.get("items") or []

            items: List[AgentItem] = [
                AgentItem(**it)
                for it in raw_items
                if isinstance(it, dict) and it.get("slug")
            ]

            debug_plan["rec_item_count"] = len(items)

            if items:
                top = items[0]

                chosen_size = rec_filters.get("size") or top.size
                nice_type = (top.type or rec_filters.get("type") or "item").lower()
                nice_color = (top.color or rec_filters.get("color") or "").lower()
                nice_size = (chosen_size or "").upper()

                parts = ["Do you want me to add this"]
                if nice_color:
                    parts.append(nice_color)
                parts.append(nice_type)
                if nice_size:
                    parts.append(f"in size {nice_size}")
                parts.append("to your cart?")
                answer = " ".join(parts).replace("  ", " ").strip()

                cart_payload = {
                    "variantId": top.variantId,
                    "size": chosen_size,
                    "quantity": 1,
                    "cartId": body.cartId,
                    "clerkUserId": body.clerkUserId,
                    "guestSessionId": body.guestSessionId,
                    "email": body.email,
                }

                return AgentOut(
                    kind="cart_proposal",
                    answer=answer,
                    citations=[],
                    items=items,
                    cart_payload=cart_payload,
                    debug_plan=debug_plan,
                )

            debug_plan["cart_add_note"] = "no_matching_item_from_recs"

        debug_plan["cart_add_note"] = "cart_intent_but_no_resolvable_item"
        return AgentOut(
            kind="answer",
            answer=(
                "I’m not sure which item you want me to add. "
                "Please either click a specific product or say something like "
                "“Add the black hoodie in size M to my cart” or "
                "“Add the second hoodie to my cart.”"
            ),
            citations=[],
            items=[],
            cart_payload=None,
            debug_plan=debug_plan,
        )

    # --- Branch 2: size & fit advisor -------------------------------------------
    if intent_kind == "size_fit" and not wants_cart:
        fit_resp = await _call_fit_recommend(q, attrs, profile=ai_profile)
        if fit_resp:
            size = fit_resp.get("size")
            confidence = fit_resp.get("confidence")
            notes = fit_resp.get("notes") or []
            citations = fit_resp.get("citations") or []

            size_part = (
                f"I’d recommend size {size}"
                if size
                else "I can’t confidently recommend a size"
            )
            if confidence is not None:
                size_part += f" (confidence ~{confidence:.0%})"

            extra_note = ""
            if notes:
                extra_note = " " + notes[0]
                if len(notes) > 1:
                    extra_note += f" Also: {notes[1]}"

            debug_plan["fit_used"] = True
            debug_plan["fit_resp"] = fit_resp

            return AgentOut(
                kind="answer",
                answer=f"{size_part}.{extra_note}".strip(),
                citations=citations,
                items=[],
                debug_plan=debug_plan,
            )

        debug_plan["fit_used"] = False

    # --- Branch 3: recommendations (browse products) ---------------------------
    if wants_recs:
        rec_query = build_rec_query(q, rec_filters)

        rec_payload = {
            "query": rec_query,
            "filters": rec_filters,
            "top_k": body.top_k,
        }
        rec_resp = await _call_recs_suggest(rec_payload)

        debug_plan["rec_query"] = rec_query

        raw_items = rec_resp.get("items") or []

        items: List[AgentItem] = [
            AgentItem(**it)
            for it in raw_items
            if isinstance(it, dict) and it.get("slug")
        ]

        debug_plan["rec_item_count"] = len(items)

        if items:
            _store_session_recs(body, items)

            # NEW: Zalando-style context-aware intro (LLM decides if history matters)
            intro_info = await _build_discover_intro(
                body=body,
                items=items,
                attrs=attrs,
                rec_filters=rec_filters,
            )

            debug_plan["llm_discover_intro_used"] = intro_info.get("llm_used", False)
            debug_plan["llm_discover_intro_history_len"] = intro_info.get(
                "history_len", 0
            )
            debug_plan["llm_discover_intro_summary_used"] = intro_info.get(
                "summary_used", False
            )

            if intro_info.get("llm_used"):
                debug_plan["llm_used"] = True

            answer_text = intro_info.get(
                "text", "Here are some options that match what you asked for."
            )

            return AgentOut(
                kind="recommendations",
                answer=answer_text,
                citations=[],
                items=items,
                debug_plan=debug_plan,
            )

        # no items → fall through to RAG / chat below

    # --- Branch 4: generic fallback (LLM chat or RAG) --------------------------
    use_llm_chat = intent_kind in (
        "generic",
        "policy",
        "history_meta",
        "unknown",
        "greeting",
        "small_talk",
    )

    if use_llm_chat and not wants_cart and not wants_recs:
        llm_resp = await _call_llm_with_history(body, intent_kind=intent_kind)
        debug_plan["llm_used"] = True
        debug_plan["llm_history_len"] = llm_resp.get("history_len", 0)
        debug_plan["llm_history_tail_len"] = llm_resp.get("history_tail_len", 0)
        debug_plan["llm_history_summary_used"] = llm_resp.get("summary_used", False)
        debug_plan["history_scope"] = llm_resp.get("history_scope", body.historyScope)

        return AgentOut(
            kind="answer",
            answer=llm_resp.get("answer") or "Sorry, I couldn’t generate a response.",
            citations=[],
            items=[],
            debug_plan=debug_plan,
        )

    debug_plan["llm_used"] = debug_plan.get("llm_used", False)

    rag_resp = await _call_rag(q, body.top_k)
    answer = rag_resp.get("answer") or "Sorry, I couldn’t find that."
    citations = rag_resp.get("citations") or []

    return AgentOut(
        kind="answer",
        answer=answer,
        citations=citations,
        items=[],
        debug_plan=debug_plan,
    )


@router.post("/ai/agent/cart_add", response_model=AgentCartAddOut)
async def agent_cart_add(body: AgentCartAddIn) -> AgentCartAddOut:
    """
    Thin wrapper for cart add that uses the tools layer first,
    then falls back to Django /tools/cart.add if needed.
    """

    def _shape_cart_response(data: Any) -> tuple[Optional[str], list[Dict[str, Any]]]:
        cart_id: Optional[str] = None
        items: list[Dict[str, Any]] = []
        if isinstance(data, dict):
            cart_id = data.get("id") or data.get("cartId")
            raw_items = data.get("items")
            if isinstance(raw_items, list):
                items = raw_items
        return cart_id, items

    payload: Dict[str, Any] = {
        "variantId": body.variantId,
        "size": body.size,
        "quantity": body.quantity,
    }
    if body.cartId:
        payload["cartId"] = body.cartId
    if body.clerkUserId:
        payload["clerkUserId"] = body.clerkUserId
    if body.guestSessionId:
        payload["guestSessionId"] = body.guestSessionId
    if body.email:
        payload["email"] = body.email

    data: Any = None
    status_ok: bool | None = None

    if USE_TOOLS_LAYER:
        try:
            tool_input = dict(payload)
            if body.idempotencyKey:
                tool_input["idempotencyKey"] = body.idempotencyKey

            tool_resp = await tools_cart.cart_add(tool_input)

            if isinstance(tool_resp, dict) and "cart" in tool_resp:
                data = tool_resp["cart"]
                status_ok = bool(tool_resp.get("ok", True))
            else:
                data = tool_resp
                status_ok = True
        except Exception:
            log.exception("tools_cart.cart_add failed")
            if DISABLE_TOOLS_HTTP_FALLBACK:
                cart_id, items = _shape_cart_response(data or {})
                return AgentCartAddOut(
                    ok=False,
                    message="Cart tool failed.",
                    cart=data or {},
                    cartId=cart_id,
                    items=items,
                )

    if data is None or status_ok is None:
        headers: Dict[str, str] = {"Content-Type": "application/json"}
        if body.idempotencyKey:
            headers["Idempotency-Key"] = body.idempotencyKey

        url = f"{DJANGO_BASE_URL.rstrip('/')}/tools/cart.add"

        try:
            async with httpx.AsyncClient(timeout=10) as cx:
                resp = await cx.post(url, json=payload, headers=headers)

            try:
                data = resp.json()
            except Exception:
                data = {"raw": resp.text}

            if 200 <= resp.status_code < 300:
                status_ok = True
            else:
                status_ok = False
        except Exception:
            log.exception("Django cart.add HTTP call failed")
            return AgentCartAddOut(
                ok=False,
                message="Failed to reach cart backend.",
                cart={},
                cartId=None,
                items=[],
            )

    cart_id, items = _shape_cart_response(data or {})

    if status_ok:
        return AgentCartAddOut(
            ok=True,
            message="Item added to cart.",
            cart=data,
            cartId=cart_id,
            items=items,
        )

    err_msg = "Failed to add item to cart."
    if isinstance(data, dict) and data.get("error"):
        err_msg = str(data["error"])

    return AgentCartAddOut(
        ok=False,
        message=err_msg,
        cart=data,
        cartId=cart_id,
        items=items,
    )
