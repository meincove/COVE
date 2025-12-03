# cove-ai-core/tests/canary/llm_ping.py
"""
Quick health check for the LLM backend used by Cove AI.

- Uses app.providers.llm.LLMClient (same as RAG / agent).
- Prints env flags (LLM_OFFLINE, LLM_BYPASS_ON_FAIL, MODEL).
- Sends one short test conversation.
- Exits with non-zero code if:
    * env is explicitly set to offline, or
    * the LLM call fails / returns empty text.
"""

import asyncio
import os
import sys
import time

from app.providers.llm import LLMClient


async def main() -> int:
    # ---- Read env flags exactly like your app does ----
    model = os.getenv("LLM_MODEL", "openrouter:openai/gpt-4o-mini")
    llm_offline = os.getenv("LLM_OFFLINE", "false").lower()
    llm_bypass = os.getenv("LLM_BYPASS_ON_FAIL", "false").lower()
    hard_timeout = int(os.getenv("LLM_HARD_TIMEOUT_SECS", "12"))

    print("=== Cove LLM ping ===")
    print(f"MODEL              : {model}")
    print(f"LLM_OFFLINE        : {llm_offline}")
    print(f"LLM_BYPASS_ON_FAIL : {llm_bypass}")
    print(f"HARD TIMEOUT (sec) : {hard_timeout}")
    print()

    # If you *explicitly* set offline, fail fast – you're in fallback mode.
    if llm_offline == "true":
        print("❌ LLM_OFFLINE=true → the app is configured to never hit the real model.")
        return 1

    client = LLMClient()

    messages = [
        {
            "role": "system",
            "content": "You are Cove AI's internal healthcheck. Answer in one short sentence.",
        },
        {
            "role": "user",
            "content": "Reply with a short sentence that includes the word 'Cove' and today's test status.",
        },
    ]

    print("Calling LLMClient.generate(...)")
    t0 = time.time()
    try:
        # Reuse the same timeout semantics as rag.py
        out = await asyncio.wait_for(client.generate(messages), timeout=hard_timeout)
    except Exception as e:
        dt = (time.time() - t0) * 1000
        print(f"❌ LLM call raised an exception after {dt:.0f} ms: {e!r}")
        return 1

    dt = (time.time() - t0) * 1000
    text = (out or "").strip()

    print(f"⏱  LLM latency: {dt:.0f} ms")
    print(f"🔁 Raw response (first 200 chars): {text[:200]!r}")
    print()

    if not text:
        print("❌ LLM returned empty text → something is wrong.")
        return 1

    if "cove" not in text.lower():
        print("⚠️ Response does not contain the word 'Cove' as expected. "
              "The call worked but content looks off.")
        # non-fatal, but you might want to fail hard:
        # return 1

    print("✅ LLM is reachable and returned a non-empty response (no offline fallback).")
    return 0


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
