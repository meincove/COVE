# Perf Baseline – Cove AI Agent

_Last updated: 2025-12-04_

## Setup

- Environment: (e.g. `local-dev` / `staging`)
- Main model: `${GEN_MODEL}` (from env)
- Backend: `${LLM_BACKEND}` (e.g. `openrouter`)
- Flags:
  - `DISABLE_EMBEDDING = false`
  - `DISABLE_RERANK = false`
  - `USE_MMR = true`
  - `LLM_OFFLINE = false`
  - `LLM_BYPASS_ON_FAIL = true`

## Sample Queries

Fill this table using:
- `agent_timing` logs (`total_ms`)
- `llm_call` logs (`latency_ms`, tokens)

| # | Kind            | Description                                | total_ms | llm_latency_ms | prompt_tokens | completion_tokens | total_tokens |
|---|-----------------|--------------------------------------------|---------:|---------------:|--------------:|------------------:|-------------:|
| 1 | answer          | “What’s your return policy?”               |         |                |               |                   |             |
| 2 | recommendations | “Show me black hoodies under 30 euro in M” |         |                |               |                   |             |
| 3 | cart_proposal   | “Add the second hoodie you showed to cart” |         |                |               |                   |             |
| 4 | size_fit        | “I am 175cm, 70kg, what size hoodie?”      |         |                |               |                   |             |

## Observations

- Example: “Most time is in LLM (~7s), retrieval ~1s, total ~9s.”
- Example: “Policy questions = low tokens but still slow → candidate for smaller model or caching.”
