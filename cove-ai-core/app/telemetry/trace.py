# app/telemetry/trace.py
from __future__ import annotations
import os, json, time, uuid
from typing import Any, Dict

TRACE_ENABLED = os.getenv("TRACE", "true").lower() == "true"

def new_trace_id() -> str:
    return uuid.uuid4().hex[:16]

def emit(event: str, trace_id: str, payload: Dict[str, Any]) -> None:
    if not TRACE_ENABLED:
        return
    row = {
        "ts": time.time(),
        "event": event,
        "trace_id": trace_id,
        **payload
    }
    print(json.dumps(row, ensure_ascii=False), flush=True)
