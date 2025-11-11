from typing import List, Dict, Optional
import os, httpx
from app.core.config import *

JSON_OK = {"type":"json_object"}

class LLMClient:
    def __init__(self, timeout: float = 25.0):
        self.timeout = timeout

    async def generate(self, messages: List[Dict], model: Optional[str]=None, **opts) -> str:
        backend = LLM_BACKEND
        model = model or GEN_MODEL
        if backend == "openrouter":
            return await self._openrouter(messages, model.split("openrouter:",1)[-1], **opts)
        raise ValueError(f"Unsupported backend: {backend}")

    async def _openrouter(self, messages, model, **opts):
        headers = {
            "Authorization": f"Bearer {OPENROUTER_API_KEY}",
            "HTTP-Referer": APP_URL,
            "X-Title": "Cove AI Core",
        }
        payload = {
            "model": model,
            "messages": messages,
            "temperature": opts.get("temperature", 0.2),
            "response_format": opts.get("response_format", JSON_OK),
        }
        async with httpx.AsyncClient(timeout=self.timeout) as cx:
            r = await cx.post("https://openrouter.ai/api/v1/chat/completions",
                              headers=headers, json=payload)
        r.raise_for_status()
        return r.json()["choices"][0]["message"]["content"]
