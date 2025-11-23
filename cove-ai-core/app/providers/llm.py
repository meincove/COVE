# app/providers/llm.py
import os
import httpx
import anyio 
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "").strip()
GEN_MODEL = os.getenv("GEN_MODEL", "openrouter:openai/gpt-4o-mini")
LLM_BACKEND = os.getenv("LLM_BACKEND", "openrouter")


class LLMClient:
    def __init__(self, model: str | None = None):
        # If caller doesn't override, use GEN_MODEL
        self.model = model or GEN_MODEL
    def generate_sync(self, messages):
        return anyio.run(self.generate, messages) 
    async def generate(self, messages):
        model = self.model
       

        # --- OpenRouter backend ---
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

        # (…other providers…)

        async with httpx.AsyncClient(timeout=20) as cx:
            r = await cx.post(url, headers=headers, json=payload)
            r.raise_for_status()
            data = r.json()

        # normalize output
        return data["choices"][0]["message"]["content"]
