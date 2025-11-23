# backend/tests/canary/run_agent_canary.py
import asyncio
import json
import sys
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

import httpx
import yaml


@dataclass
class CaseResult:
  id: str
  label: str
  passed: bool
  notes: List[str]
  kind: Optional[str] = None
  answer: Optional[str] = None


async def seed_history(
    django_base_url: str,
    seed_cfg: Dict[str, Any],
) -> None:
  """
  Seed chat history into Django's /ai_profiles/log_chat/ for a given case.

  seed_cfg example:
    {
      "guestSessionId": "canary-history-001",
      "turns": [
        {"role": "user", "content": "..."},
        {"role": "assistant", "content": "..."}
      ]
    }
  """
  guest_id = seed_cfg.get("guestSessionId")
  clerk_id = seed_cfg.get("clerkUserId")
  turns = seed_cfg.get("turns") or []

  if not guest_id and not clerk_id:
    # nothing to do
    return

  url = django_base_url.rstrip("/") + "/ai_profiles/log_chat/"

  async with httpx.AsyncClient(timeout=5.0) as cx:
    for t in turns:
      role = t.get("role") or "user"
      content = t.get("content") or ""
      if not content:
        continue

      payload = {
        "guestSessionId": guest_id,
        "clerkUserId": clerk_id,
        "role": role,
        "content": content,
        "agent_kind": "cove_ai",
        "cartId": None,
        "meta": {
          "source": "agent_canary",
          "case_seed": True,
        },
      }

      try:
        await cx.post(url, json=payload)
      except Exception as e:
        # Don't crash the whole suite if seeding fails; just log and continue.
        print(f"[seed_history] warning: failed to seed turn ({role}): {e}")


async def run_case(
    base_url: str,
    endpoint: str,
    method: str,
    top_k_default: int,
    django_base_url: Optional[str],
    case: Dict[str, Any],
) -> CaseResult:
  cid = case.get("id", "unknown")
  label = case.get("label", cid)
  expect = case.get("expect", {}) or {}
  assert_plan = case.get("assert_plan") or {}
  history_seed_cfg = case.get("history_seed")

  url = base_url.rstrip("/") + endpoint

  payload = case.get("payload", {}) or {}
  if "top_k" not in payload and "topK" not in payload:
    payload["top_k"] = top_k_default

  notes: List[str] = []
  passed = True

  # --- optional history seeding ---
  if history_seed_cfg and django_base_url:
    await seed_history(django_base_url, history_seed_cfg)

  async with httpx.AsyncClient(timeout=20.0) as cx:
    if method.upper() == "POST":
      resp = await cx.post(url, json=payload)
    else:
      resp = await cx.get(url, params=payload)

  try:
    data = resp.json()
  except Exception:
    notes.append(f"Non-JSON response: {resp.text[:200]!r}")
    return CaseResult(id=cid, label=label, passed=False, notes=notes)

  kind = data.get("kind")
  answer = (data.get("answer") or "").strip()
  items = data.get("items") or []
  citations = data.get("citations") or []
  debug_plan = data.get("debug_plan") or {}

  # --- Basic expectations ---
  exp_kind = expect.get("kind")
  if exp_kind and kind != exp_kind:
    passed = False
    notes.append(f"kind mismatch: expected {exp_kind!r}, got {kind!r}")

  min_items = expect.get("min_items")
  if isinstance(min_items, int) and len(items) < min_items:
    passed = False
    notes.append(f"items length < {min_items} (got {len(items)})")

  min_citations = expect.get("min_citations")
  if isinstance(min_citations, int) and len(citations) < min_citations:
    passed = False
    notes.append(f"citations < {min_citations} (got {len(citations)})")

  # history length via debug_plan.llm_history_len
  exp_history_len = expect.get("min_history_len")
  if isinstance(exp_history_len, int):
    actual_hist = int(debug_plan.get("llm_history_len", 0))
    if actual_hist < exp_history_len:
      passed = False
      notes.append(
        f"llm_history_len < {exp_history_len} (got {actual_hist})"
      )

  # Substring checks (case-insensitive)
  lower_answer = answer.lower()

  for s in expect.get("answer_contains") or []:
    if s.lower() not in lower_answer:
      passed = False
      notes.append(f"missing substring in answer: {s!r}")

  for s in expect.get("forbid_substrings") or []:
    if s.lower() in lower_answer:
      passed = False
      notes.append(f"forbidden substring present in answer: {s!r}")

  # --- debug_plan assertions ---
  if assert_plan:
    plan = debug_plan or {}
    for key, exp_value in assert_plan.items():
      if key not in plan:
        passed = False
        notes.append(f"debug_plan missing key: {key!r}")
        continue
      if exp_value is not None and plan.get(key) != exp_value:
        notes.append(
          f"debug_plan[{key!r}] = {plan.get(key)!r}, expected {exp_value!r}"
        )
        passed = False

  return CaseResult(
    id=cid,
    label=label,
    passed=passed,
    notes=notes,
    kind=kind,
    answer=answer,
  )


async def main(path: str) -> int:
  with open(path, "r", encoding="utf-8") as f:
    cfg = yaml.safe_load(f)

  defaults = cfg.get("defaults", {}) or {}
  base_url = defaults.get("base_url", "http://127.0.0.1:8000")
  endpoint = defaults.get("endpoint", "/ai/agent/query")
  method = defaults.get("method", "POST")
  top_k_default = int(defaults.get("top_k", 6))
  django_base_url = defaults.get("django_base_url")

  cases = cfg.get("cases") or []

  results: List[CaseResult] = []
  for case in cases:
    res = await run_case(
      base_url,
      endpoint,
      method,
      top_k_default,
      django_base_url,
      case,
    )
    results.append(res)

  # Summary
  total = len(results)
  passed = sum(1 for r in results if r.passed)
  failed = total - passed

  print("=" * 60)
  print(f"Agent canary results: {passed}/{total} passed, {failed} failed")
  print("=" * 60)

  for r in results:
    status = "✅ PASS" if r.passed else "❌ FAIL"
    print(f"[{status}] {r.id} – {r.label}")
    if r.notes:
      for note in r.notes:
        print(f"   - {note}")
    # optional: very short answer preview
    if r.answer:
      preview = r.answer.replace("\n", " ")[:120]
      print(f"   answer: {preview!r}")
    print()

  return 0 if failed == 0 else 1


if __name__ == "__main__":
  path = "tests/canary/agent_canary.yaml"
  if len(sys.argv) > 1:
    path = sys.argv[1]
  exit_code = asyncio.run(main(path))
  sys.exit(exit_code)
