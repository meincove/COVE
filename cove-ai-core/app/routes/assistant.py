# app/routes/assistant.py
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel

from app.telemetry.trace import emit, new_trace_id
from app.providers.llm import LLMClient

router = APIRouter()
_llm = LLMClient()


class GreetingIn(BaseModel):
  userName: Optional[str] = None
  guestSessionId: Optional[str] = None
  clerkUserId: Optional[str] = None
  email: Optional[str] = None


class GreetingOut(BaseModel):
  answer: str


_GREETING_SYSTEM_PROMPT = """
You are Cove AI, the assistant for a premium fashion brand.

Your task: generate a SINGLE short greeting line for the chat widget.

Requirements:
- If userName is provided, address the user by that name once.
- Mention briefly what you can help with (finding products, sizes, fits, outfits).
- Be warm and concise (max ~25 words).
- Do NOT mention you're an AI model.
- Do NOT ask multiple questions. At most one question at the end.
- Output ONLY the greeting text, no JSON, no quotes.
""".strip()


@router.post("/ai/assistant/greeting", response_model=GreetingOut)
async def greeting(body: GreetingIn) -> GreetingOut:
  trace_id = new_trace_id()

  user_name = (body.userName or "").strip()
  user_fragment = (
      f"The user's name is {user_name}." if user_name else "The user did not provide a name."
  )

  messages = [
      {"role": "system", "content": _GREETING_SYSTEM_PROMPT},
      {
          "role": "user",
          "content": user_fragment,
      },
  ]

  try:
    raw = await _llm.generate(messages)
    text = (raw or "").strip()
    if not text:
      text = "Hey! I’m Cove AI. I can help you explore our products, sizes, and fits."
  except Exception as e:
    emit("assistant_greeting_llm_fail", trace_id, {"error": str(e)})
    text = "Hey! I’m Cove AI. I can help you explore our products, sizes, and fits."

  emit(
      "assistant_greeting_done",
      trace_id,
      {
          "has_name": bool(user_name),
      },
  )

  return GreetingOut(answer=text)
