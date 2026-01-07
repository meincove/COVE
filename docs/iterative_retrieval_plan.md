# Implementation Plan: Iterative Retrieval (CRAG)

## Goal
Upgrade the Verifier from a passive critic (correcting text) to an active agent (correcting search).
If search results are poor, the Verifier can trigger a re-search with optimized parameters.

## User Flow
1.  **User**: "Show me dark blue hoodies."
2.  **Agent (Pass 1)**: Searches "dark blue hoodies". Finds "Blue Hoodie".
3.  **Verifier**: Checks "Blue Hoodie".
    *   Old Behavior: "Refined Answer: I found a Blue Hoodie."
    *   **New Behavior**: `Action: RETRY`. `New Query: "navy OR midnight blue hoodies"`.
4.  **Agent (Pass 2)**: Searches "navy OR midnight blue hoodies". Finds "Navy Hoodie".
5.  **Verifier**: Checks "Navy Hoodie".
    *   Verdict: `PASS`.
6.  **Response**: "I found this Navy Hoodie for you."

## Proposed Changes

### 1. `app/mcp_agents/verifier/verifier.py`
- Update `VerifierResponse` (implicit) schema instructions.
- Add `action` field: `FIX` (default) or `RETRY`.
- Add `retry_params` field: `{ "query": "..." }`.
- Update Prompt:
    - "If no items found OR items are irrelevant, suggest a RETRY with better keywords."
    - "If 'dark blue' requested but 'blue' found, retry with 'navy'."

### 2. `app/routes/agent.py`
- Wrap the Search + Answer generation in a `while retry_count < MAX_RETRIES` loop.
- **Recommendations Branch**:
    - Current: Search -> Build Context -> Generate Answer -> Verify.
    - New:
        ```python
        for attempt in range(2):
            items = search(q)
            answer = generate_answer(items)
            verification = verify(q, answer, items)
            
            if verification.status == "RETRY" and attempt == 0:
                q = verification.retry_query
                continue (loop)
            else:
                final_answer = verification.refined_answer
                break
        ```
- **RAG Branch**: Similar loop.

## Architecture Risks & Mitigations
- **Latency**: Each retry adds ~2s (Search + LLM).
    - *Mitigation*: Max 1 retry. Only retry if strictly necessary (0 items or severe mismatch).
- **Infinite Loops**:
    - *Mitigation*: Hard loop limit (range(2)).

## Verification Plan
1.  **Unit Test**: Mock `verify` returning `RETRY` and ensure loop triggers.
2.  **Integration Test**: Extend `stress_test.py` with "Dark Blue" scenario expecting a RETRY.
