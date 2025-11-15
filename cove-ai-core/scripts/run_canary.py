#!/usr/bin/env python3
import json, time, sys
import httpx

def run():
    ok = 0
    total = 0
    latencies = []
    with open("eval/canary.jsonl","r",encoding="utf-8") as f:
        lines = [json.loads(x) for x in f if x.strip()]
    for row in lines:
        q = row["q"]
        t0 = time.time()
        r = httpx.post("http://127.0.0.1:8000/ai/rag/query", json={"query": q, "top_k": 6}, timeout=20)
        dt = (time.time()-t0)*1000
        latencies.append(dt)
        total += 1
        if r.status_code != 200:
            print(f"FAIL {q} -> HTTP {r.status_code}")
            continue
        data = r.json()
        ans = data.get("answer","")
        exp = all(s.lower() in ans.lower() for s in row.get("expect",[]))
        allowed = row.get("allowed",[])
        cites = data.get("citations",[])
        # groundedness: all citations must be allowed (if list provided)
        grounded = True
        if allowed:
            grounded = all( any(slug in (c.get("url","") or "") for slug in allowed) for c in cites )
        if exp and grounded:
            ok += 1
        else:
            print(f"MISS: {q}\n  answer: {ans}\n  citations: {cites}\n")
    p95 = sorted(latencies)[int(0.95*len(latencies))-1] if latencies else 0
    print(f"Passed {ok}/{total}, p95 {p95:.1f} ms")

if __name__ == "__main__":
    run()
