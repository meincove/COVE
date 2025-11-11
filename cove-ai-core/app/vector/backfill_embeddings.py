# app/vector/backfill_embeddings.py
from __future__ import annotations
import os
import sys
import math
from typing import List, Tuple
import psycopg
from psycopg.rows import tuple_row

from app.vector.store import connect, _embed_sync  # uses your existing sync embedder

BATCH = 64

def fetch_batch(conn: psycopg.Connection) -> List[Tuple[str, str]]:
    with conn.cursor(row_factory=tuple_row) as cur:
        cur.execute(
            """
            SELECT id, coalesce(text, '') AS text
            FROM ai_core.docs
            WHERE kind = 'product' AND embedding IS NULL
            LIMIT %s
            """,
            (BATCH,),
        )
        return cur.fetchall()

def update_embeddings(conn: psycopg.Connection, rows: List[Tuple[str, List[float]]]) -> None:
    with conn.cursor() as cur:
        for _id, emb in rows:
            cur.execute(
                "UPDATE ai_core.docs SET embedding = %s WHERE id = %s",
                (emb, _id),
            )

def main():
    conn = connect()
    total = 0
    while True:
        batch = fetch_batch(conn)
        if not batch:
            break
        texts = [t for (_id, t) in batch]
        embs = _embed_sync(texts)  # same model/dim as your table (1536)
        to_update = [(batch[i][0], embs[i]) for i in range(len(batch))]
        update_embeddings(conn, to_update)
        total += len(batch)
        print(f"updated {total} embeddings...", flush=True)
    print("done", flush=True)

if __name__ == "__main__":
    main()
