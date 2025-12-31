import os
import sys
import json
from app.vector.store import get_conn

def inspect_docs():
    print("--- Inspecting 'ai_core.docs' Metadata ---")
    try:
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT meta FROM ai_core.docs WHERE kind='product' LIMIT 5")
                rows = cur.fetchall()
                for i, r in enumerate(rows):
                    print(f"Item {i}: {json.dumps(r[0])}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    inspect_docs()
