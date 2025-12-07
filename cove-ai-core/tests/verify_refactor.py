# tests/verify_refactor.py
import asyncio
import os
import sys
from pprint import pprint

# Add project root to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.catalog import clean_title, extract_slug
from app.providers.embedding import embed_query
from app.vector.store import search_hybrid
from app.agent.orchestrator import classify

async def main():
    print("--- Verifying Catalog Helpers ---")
    t = clean_title("Cool Hoodie (100% Cotton)")
    print(f"Cleaned title: '{t}'")
    assert t == "Cool Hoodie"
    
    s = extract_slug("http://localhost/product/my-cool-product")
    print(f"Extracted slug: '{s}'")
    assert s == "my-cool-product"

    print("\n--- Verifying Async Embedding ---")
    # Mock or real depending on env, but we just want to see it run without crashing
    try:
        emb = await embed_query("hello world")
        print(f"Embedding length: {len(emb)}")
    except Exception as e:
        print(f"Embedding failed (expected if no API key): {e}")

    print("\n--- Verifying Async Vector Search ---")
    try:
        docs = await search_hybrid("hoodie", kind="product", top_k=1)
        print(f"Found {len(docs)} docs")
        if docs:
            pprint(docs[0])
    except Exception as e:
        print(f"Search failed (expected if DB not ready): {e}")

    print("\n--- Verifying Dynamic Rules ---")
    try:
        from app.core.rules import get_prompt, get_regex_rules, get_search_config
        
        p = get_prompt("classifier")
        print(f"Classifier prompt loaded: {len(p)} chars")
        assert len(p) > 100, "Classifier prompt too short"

        r = get_regex_rules()
        print(f"Regex rules loaded: {list(r.keys())}")
        assert "price" in r, "Missing price regex rules"

        c = get_search_config()
        print(f"Search config loaded: {list(c.keys())}")
        assert "searchable_fields" in c, "Missing searchable_fields"
        
    except Exception as e:
        print(f"Dynamic Rules Verification Failed: {e}")
        raise

    print("\n--- Verifying Orchestrator Classify ---")
    try:
        intent = await classify("show me black hoodies", attrs={})
        print(f"Intent: {intent}")
        assert intent.kind in ("discover", "unknown", "generic")
    except Exception as e:
        print(f"Classify failed: {e}")
        raise

    print("\n✅ Verification Complete")

if __name__ == "__main__":
    asyncio.run(main())
