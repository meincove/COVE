import asyncio
from app.vector.store import get_conn, catalog_vocab

def check_vocab():
    try:
        with get_conn() as conn:
            vocab = catalog_vocab(conn)
            print("--- CATALOG VOCABULARY ---")
            print(f"Total Types: {len(vocab.get('types', []))}")
            print(f"Types: {', '.join(sorted(vocab.get('types', [])))}")
            print(f"Colors: {', '.join(sorted(vocab.get('colors', [])))}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_vocab()
