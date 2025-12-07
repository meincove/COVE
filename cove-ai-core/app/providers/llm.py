# app/providers/llm.py
import os
import httpx
import anyio
import logging
import time

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "").strip()
GEN_MODEL = os.getenv("GEN_MODEL", "openrouter:openai/gpt-4o-mini")
LLM_BACKEND = os.getenv("LLM_BACKEND", "openrouter")

log = logging.getLogger("cove.llm")


class LLMClient:
    def __init__(self, model: str | None = None):
        # If caller doesn't override, use GEN_MODEL
        self.model = model or GEN_MODEL

    def generate_sync(self, messages):
        return anyio.run(self.generate, messages)

    async def generate(self, messages):
        """
        Main entrypoint for LLM calls.

        - Builds provider-specific payload (OpenRouter for now).
        - Measures latency_ms for the HTTP call.
        - Logs token usage if the provider returns a `usage` block.
        - Returns the assistant's message content as before.
        """
        model = self.model

        # --- Build provider-specific request (OpenRouter by default) ---
        if LLM_BACKEND == "openrouter":
            # Guard: fail clearly if key is missing
            if not OPENROUTER_API_KEY:
                raise RuntimeError(
                    "OPENROUTER_API_KEY is not set. "
                    "Export it in your shell or .env before calling LLMClient."
                )

            # strip "openrouter:" prefix before sending
            if model.startswith("openrouter:"):
                model_name = model.split("openrouter:", 1)[1]
            else:
                model_name = model

            url = "https://openrouter.ai/api/v1/chat/completions"
            headers = {
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json",
            }
            payload = {
                "model": model_name,     # e.g. "openai/gpt-4o-mini"
                "messages": messages,
                "stream": False,
            }
        else:
            # You can extend this block later for other backends.
            raise RuntimeError(f"Unsupported LLM_BACKEND: {LLM_BACKEND}")

        # --- Call provider with timing ---
        t0 = time.perf_counter()
        async with httpx.AsyncClient(timeout=20) as cx:
            r = await cx.post(url, headers=headers, json=payload)
        t1 = time.perf_counter()

        latency_ms = int((t1 - t0) * 1000)

        # Raise if HTTP error
        r.raise_for_status()
        data = r.json()

        # --- Extract token usage if available ---
        usage = data.get("usage") or {}

        def _get_usage_field(name: str):
            if isinstance(usage, dict):
                return usage.get(name)
            # If some future backend returns an object instead of dict
            return getattr(usage, name, None)

        prompt_tokens = _get_usage_field("prompt_tokens")
        completion_tokens = _get_usage_field("completion_tokens")
        total_tokens = _get_usage_field("total_tokens")

        log.info(
            "llm_call",
            extra={
                "model": model,
                "latency_ms": latency_ms,
                "prompt_tokens": prompt_tokens,
                "completion_tokens": completion_tokens,
                "total_tokens": total_tokens,
            },
        )

        # --- Normalize output (unchanged behaviour) ---
        # OpenRouter-style: choices[0].message.content
        content = (
            data.get("choices", [{}])[0]
            .get("message", {})
            .get("content", "")
        )

        return content
