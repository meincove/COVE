"""
History and context management for the AI Agent.
Handles fetching conversation history, summarization, and context window optimization.
"""
import os
import sys
import re
import logging
import httpx
from typing import Any, Dict, List, Optional, Tuple

from app.providers.llm import LLMClient
from app.core.rules import get_regex_rules, get_prompt
from app.config import DJANGO_BASE_URL

log = logging.getLogger("cove.history")

# Configuration for context window management



class HistoryManager:
    """
    Manages conversation history fetching, summarization, and formatting.
    """
    # Configuration for context window management
    MAX_HISTORY_MESSAGES = int(os.getenv("AGENT_MAX_HISTORY_MESSAGES", "15"))
    HISTORY_SUMMARY_THRESHOLD = int(os.getenv("AGENT_HISTORY_SUMMARY_THRESHOLD", "30"))
    MAX_HISTORY_SUMMARY_CHARS = int(os.getenv("AGENT_MAX_HISTORY_SUMMARY_CHARS", "600"))

    @staticmethod
    async def fetch_history(
        clerk_user_id: Optional[str],
        guest_session_id: Optional[str],
        limit: int = 20,
    ) -> List[Dict[str, Any]]:
        """
        Pull recent chat history from Django backend.
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
            # log.debug(f"Requesting {url} with params={params}")
            async with httpx.AsyncClient(timeout=10) as cx:
                r = await cx.get(url, params=params)
            
            if r.status_code != 200:
                log.warning(f"History fetch non-200 {r.status_code}: {r.text}")
                return []
            
            data = r.json()
            msgs = data.get("items") or data.get("messages") or []
            if isinstance(msgs, list):
                return msgs
                
        except Exception as e:
            log.warning(f"History fetch failed: {e}")

        return []

    @staticmethod
    async def summarise_chunk(history_chunk: List[Dict[str, Any]]) -> Optional[str]:
        """
        Summarise a chunk of conversation history using an LLM.
        """
        if not history_chunk:
            return None

        # Convert to text format for summarization
        lines = []
        for msg in history_chunk:
            role = msg.get("role", "unknown")
            content = msg.get("content", "")
            lines.append(f"{role}: {content}")
        
        conversation_text = "\n".join(lines)
        
        prompt = (
            f"Summarise the following conversation segment in diverse but concise bullet points. "
            f"Focus on user preferences, key decisions, and items discussed.\n\n"
            f"{conversation_text}\n\nSUMMARY:"
        )

        messages = [{"role": "user", "content": prompt}]
        client = LLMClient() 

        try:
            text = await client.generate(messages)
            if not text:
                return None
            text = text.strip()
            if len(text) > HistoryManager.MAX_HISTORY_SUMMARY_CHARS:
                text = text[:HistoryManager.MAX_HISTORY_SUMMARY_CHARS]
            return text or None
        except Exception as e:
            log.warning("History summarisation failed: %s", e, exc_info=True)
            return None

    @classmethod
    async def prepare_history_for_llm(
        cls,
        history: List[Dict[str, Any]],
    ) -> Tuple[Optional[str], List[Dict[str, Any]]]:
        """
        Apply 'context diet': keep recent tail, summarise older parts.
        """
        if not history:
            return None, []

        if len(history) <= cls.MAX_HISTORY_MESSAGES:
            return None, history

        tail_count = cls.MAX_HISTORY_MESSAGES
        older = history[:-tail_count]
        tail = history[-tail_count:]

        summary: Optional[str] = None

        if len(history) >= cls.HISTORY_SUMMARY_THRESHOLD:
            summary = await cls.summarise_chunk(older)

        return summary, tail

    @staticmethod
    def is_short_smalltalk(msg: str, intent_kind: str) -> bool:
        """
        Detect very short, non-question messages that are likely casual smalltalk.
        """
        q = (msg or "").strip()
        if not q:
            return False

        if intent_kind not in ("generic", "unknown"):
            return False

        rules = get_regex_rules().get("smalltalk", {})
        max_len = rules.get("max_length", 40)
        max_tokens = rules.get("max_tokens", 4)

        if len(q) > max_len:
            return False

        if "?" in q:
            return False

        tokens = re.findall(r"\w+", q.lower())
        if len(tokens) == 0:
            return False
        if len(tokens) > max_tokens:
            return False

        return True

    @staticmethod
    def format_messages(
        history: List[Dict[str, Any]],
        user_message: str,
        *,
        smalltalk: bool = False,
        summary: Optional[str] = None,
        conversation_facts: Optional[Dict[str, Any]] = None,
    ) -> List[Dict[str, str]]:
        """
        Convert history rows into OpenAI-style messages, prepending summary/facts.
        """
        is_first_turn = len(history) == 0

        system_content = get_prompt(
            "agent_chat",
            default="You are Cove AI, a helpful assistant."
        )

        if smalltalk:
            system_content += (
                "\n\nThe user's current message is a very short, non-question smalltalk message. "
                "Reply with a warm, brief greeting that fits a premium fashion brand vibe. "
                "Do NOT list services or be robotic. Just say hello and offer to help style them "
                "or find the perfect piece."
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
            
        # Add summary if available
        if summary:
            system_content += f"\n\nPREVIOUS CONVERSATION SUMMARY:\n{summary}"

        messages = [{"role": "system", "content": system_content}]

        # Inject conversation facts if available (as an extra system message)
        if conversation_facts:
            from app.services.fact_extractor import get_fact_extractor
            fact_extractor = get_fact_extractor()
            # Note: Assuming get_context_for_llm is synchronous, but if async it needs await.
            facts_context = fact_extractor.get_context_for_llm(conversation_facts)

            if facts_context:
                messages.append({
                    "role": "system",
                    "content": (
                        "📋 CONVERSATION CONTEXT - USE THIS TO PROVIDE PERSONALIZED RESPONSES:\n\n"
                        "IMPORTANT: When the user asks about products, preferences, or references earlier conversation:\n"
                        "- Check this context FIRST before responding\n"
                        "- Reference specific products by name when relevant\n"
                        "- Use their stated preferences to personalize recommendations\n"
                        "- If they say 'go back to X', look for X in the products below\n\n"
                        + facts_context
                    )
                })
        
        # Add history messages
        for msg in history:
            role = msg.get("role")
            content = msg.get("content")
            if role in ("user", "assistant") and content:
                messages.append({"role": role, "content": str(content)})
                
        # Add current user message
        messages.append({"role": "user", "content": user_message})
        
        return messages
