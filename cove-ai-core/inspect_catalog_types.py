import os
import sys
import asyncio
from app.vector.store import get_conn, catalog_vocab

def inspect_vocab():
    print("--- Inspecting Catalog Vocabulary ---")
    try:
        with get_conn() as conn:
            vocab = catalog_vocab(conn)
            print("\nUnique Types:")
            for t in sorted(vocab.get("types", [])):
                print(f" - {t}")
            
            print("\nUnique Colors:")
            for c in sorted(vocab.get("colors", [])):
                print(f" - {c}")
                
            print("\nUnique Tiers:")
            for t in sorted(vocab.get("tiers", [])):
                print(f" - {t}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    inspect_vocab()
