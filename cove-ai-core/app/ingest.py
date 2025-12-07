# # cove-ai-core/app/ingest.py
# from __future__ import annotations
# import os, json, math, argparse, itertools, time
# from typing import Iterable, List, Tuple, Dict, Any

# import httpx
# from psycopg import Connection
# from psycopg.rows import tuple_row

# from app.vector.store import connect
# from app.core.config import OPENAI_API_KEY, EMBED_MODEL

# DOCS_TABLE = "ai_core.docs"

# # ----------------------------- utils ---------------------------------

# def chunks(seq: List[Any], n: int) -> Iterable[List[Any]]:
#     for i in range(0, len(seq), n):
#         yield seq[i:i+n]

# async def embed_texts(texts: List[str]) -> List[List[float]]:
#     """
#     Provider-aware embeddings:
#       - EMBED_MODEL starts with 'openrouter:' -> OpenRouter endpoint
#       - starts with 'cohere:'               -> Cohere embed
#       - otherwise                           -> OpenAI direct
#     """
#     if not texts:
#         return []

#     model = EMBED_MODEL or ""
#     async with httpx.AsyncClient(timeout=30) as cx:
#         if model.startswith("openrouter:"):
#             m = model.split("openrouter:", 1)[1]
#             r = await cx.post(
#                 "https://openrouter.ai/api/v1/embeddings",
#                 headers={
#                     "Authorization": f"Bearer {os.getenv('OPENROUTER_API_KEY','')}",
#                     "Content-Type": "application/json",
#                 },
#                 json={"model": m, "input": texts},
#             )
#             r.raise_for_status()
#             data = r.json()
#             # OpenRouter returns OpenAI-shape: {data:[{embedding:[]},...]}
#             return [d["embedding"] for d in data["data"]]

#         elif model.startswith("cohere:"):
#             m = model.split("cohere:", 1)[1]
#             r = await cx.post(
#                 "https://api.cohere.ai/v1/embed",
#                 headers={
#                     "Authorization": f"Bearer {os.getenv('COHERE_API_KEY','')}",
#                     "Content-Type": "application/json",
#                 },
#                 json={"model": m, "texts": texts},
#             )
#             r.raise_for_status()
#             data = r.json()
#             return data["embeddings"]  # Cohere shape

#         else:
#             # default: OpenAI direct (expects OPENAI_API_KEY and an OpenAI model id)
#             m = model.split("openai:", 1)[1] if model.startswith("openai:") else (model or "text-embedding-3-small")
#             r = await cx.post(
#                 "https://api.openai.com/v1/embeddings",
#                 headers={
#                     "Authorization": f"Bearer {os.getenv('OPENAI_API_KEY','')}",
#                     "Content-Type": "application/json",
#                 },
#                 json={"model": m, "input": texts},
#             )
#             r.raise_for_status()
#             data = r.json()
#             return [d["embedding"] for d in data["data"]]

# def upsert_doc(conn: Connection, *, kind: str, title: str, text: str,
#                url: str | None, meta: Dict[str, Any] | None) -> None:
#     """
#     Inserts a row if not exists (by (kind, title, url, text) hash),
#     else updates text/meta. Embedding is left null initially.
#     """
#     meta = meta or {}
#     with conn.cursor() as cur:
#         cur.execute(
#             f"""
#             insert into {DOCS_TABLE}(kind, title, text, url, meta)
#             values (%s, %s, %s, %s, %s)
#             on conflict do nothing
#             """,
#             (kind, title or "", text or "", url, json.dumps(meta))
#         )

# def backfill_embeddings_sync(conn: Connection, limit: int = 512) -> int:
#     """
#     Selects rows with NULL embedding, fetches embeddings in batches,
#     and updates those rows.
#     Returns number of rows updated.
#     """
#     # NOTE: we pull (id, text) and embed in batches
#     with conn.cursor(row_factory=tuple_row) as cur:
#         cur.execute(
#             f"select id, text from {DOCS_TABLE} where embedding is null limit %s",
#             (limit,)
#         )
#         rows = cur.fetchall()

#     if not rows:
#         return 0

#     # Batch embed to avoid very long payloads. 128 is a good sweet spot.
#     batch_size = 128
#     all_updated = 0
#     for batch in chunks(rows, batch_size):
#         ids = [r[0] for r in batch]
#         texts = [r[1] or "" for r in batch]

#         # lazy import for asyncio to keep this file simple to run as script
#         import asyncio
#         embs: List[List[float]] = asyncio.run(embed_texts(texts))

#         with conn.cursor() as cur:
#             for _id, vec in zip(ids, embs):
#                 cur.execute(
#                     f"update {DOCS_TABLE} set embedding = %s where id = %s",
#                     (vec, _id)
#                 )
#         conn.commit()
#         all_updated += len(batch)

#     return all_updated

# # ----------------------- loaders for your JSONs -----------------------

# def load_json(path: str) -> Any:
#     with open(path, "r", encoding="utf-8") as f:
#         return json.load(f)

# def normalize_text(s: str | None) -> str:
#     s = s or ""
#     # collapse huge whitespace
#     return " ".join(s.split())

# def add_product_docs(conn: Connection, catalog: Dict[str, Any], meta: Dict[str, Any]) -> int:
#     """
#     Walks your catalogData.json structure and writes product-level docs.
#     Expects the same shape you use on the site (tiers -> products -> variants).
#     """
#     n = 0
#     # catalog likely has tiers like {"casual":[...], "originals":[...]}
#     for _, products in catalog.items():
#         for p in products:
#             name = p.get("name", "")
#             base_price = p.get("base_price")
#             tier = p.get("tier", "")
#             pslug = p.get("slug", "")
#             variants = p.get("variants", []) or []

#             # Combine a short product text. You can make this richer later.
#             base_txt = normalize_text(
#                 f"{name}. Tier: {tier}. Base price: {base_price}. "
#                 f"Material: {p.get('material','')}. Type: {p.get('type','')}."
#             )

#             for v in variants:
#                 vid = v.get("variantId")
#                 color = v.get("color_name", "")
#                 price = v.get("price")
#                 stock = v.get("stock")
#                 title = f"{name} — {color}".strip(" —")
#                 url = f"/product/{pslug}" if pslug else None

#                 # enrich from meta if present
#                 mrow = meta.get(vid, {}) if isinstance(meta, dict) else {}
#                 extra = {
#                     "product_id": p.get("product_id"),
#                     "variantId": vid,
#                     "color": color,
#                     "hex": v.get("color_hex"),
#                     "images": v.get("images", []),
#                     "price": price,
#                     "stock": stock,
#                     "meta": mrow,
#                 }
#                 text = normalize_text(
#                     base_txt + " " +
#                     f"Variant {vid}. Price {price}. Stock {stock}. "
#                     f"Additional: {mrow.get('material','') or ''}."
#                 )
#                 upsert_doc(conn, kind="product", title=title, text=text, url=url, meta=extra)
#                 n += 1
#     conn.commit()
#     return n

# def add_size_policy_docs(conn: Connection) -> int:
#     """
#     Quick seed for size/fit guidance. Replace with your canonical policy later.
#     """
#     examples = [
#         {
#             "title": "Size & Fit — Hoodies",
#             "text": "Hoodies are regular fit: choose your usual size; size up for a relaxed/oversized look.",
#             "url": "/policies/size-fit",
#             "meta": {"category": "hoodie"}
#         },
#         {
#             "title": "Size & Fit — Bombers",
#             "text": "Bombers are regular fit; if you're between sizes, choose the larger.",
#             "url": "/policies/size-fit",
#             "meta": {"category": "bomber"}
#         }
#     ]
#     for ex in examples:
#         upsert_doc(conn, kind="size_policy", title=ex["title"], text=ex["text"], url=ex["url"], meta=ex["meta"])
#     conn.commit()
#     return len(examples)

# # ------------------------------- CLI ---------------------------------

# def main():
#     parser = argparse.ArgumentParser(description="Cove AI — ingest catalog/policies into pgvector.")
#     parser.add_argument("--catalog", help="Path to catalogData.json")
#     parser.add_argument("--meta", help="Path to clothingMeta.json")
#     parser.add_argument("--embed-missing", action="store_true", help="Backfill embeddings for rows with NULL embeddings")
#     args = parser.parse_args()

#     # Connect DB
#     conn = connect()
#     print("[ingest] Connected to DB.")

#     total_inserted = 0

#     # Load catalog if provided
#     if args.catalog:
#         catalog = load_json(args.catalog)
#         m = load_json(args.meta) if args.meta else {}
#         n = add_product_docs(conn, catalog, m)
#         print(f"[ingest] Inserted/updated product docs: {n}")
#         total_inserted += n

#     # Always seed a tiny size policy set (safe & idempotent)
#     n = add_size_policy_docs(conn)
#     print(f"[ingest] Inserted/updated size policy docs: {n}")
#     total_inserted += n

#     if args.embed_missing:
#         updated = backfill_embeddings_sync(conn, limit=2000)
#         print(f"[ingest] Backfilled embeddings for rows: {updated}")

#     print(f"[ingest] Done. Rows touched (insert/update attempts): {total_inserted}")

# if __name__ == "__main__":
#     main()

# cove-ai-core/app/ingest.py
from __future__ import annotations
import os, json, math, argparse, itertools, time
from typing import Iterable, List, Tuple, Dict, Any

import httpx
from psycopg import Connection
from psycopg.rows import tuple_row

from app.vector.store import connect
from app.core.config import OPENAI_API_KEY, EMBED_MODEL

DOCS_TABLE = "ai_core.docs"

# ----------------------------- utils ---------------------------------

def chunks(seq: List[Any], n: int) -> Iterable[List[Any]]:
    for i in range(0, len(seq), n):
        yield seq[i:i+n]

async def embed_texts(texts: List[str]) -> List[List[float]]:
    """
    Provider-aware embeddings:
      - EMBED_MODEL starts with 'openrouter:' -> OpenRouter endpoint
      - starts with 'cohere:'               -> Cohere embed
      - otherwise                           -> OpenAI direct
    """
    if not texts:
        return []

    model = EMBED_MODEL or ""
    async with httpx.AsyncClient(timeout=30) as cx:
        if model.startswith("openrouter:"):
            m = model.split("openrouter:", 1)[1]
            r = await cx.post(
                "https://openrouter.ai/api/v1/embeddings",
                headers={
                    "Authorization": f"Bearer {os.getenv('OPENROUTER_API_KEY','')}",
                    "Content-Type": "application/json",
                },
                json={"model": m, "input": texts},
            )
            r.raise_for_status()
            data = r.json()
            # OpenRouter returns OpenAI-shape: {data:[{embedding:[]},...]}
            return [d["embedding"] for d in data["data"]]

        elif model.startswith("cohere:"):
            m = model.split("cohere:", 1)[1]
            r = await cx.post(
                "https://api.cohere.ai/v1/embed",
                headers={
                    "Authorization": f"Bearer {os.getenv('COHERE_API_KEY','')}",
                    "Content-Type": "application/json",
                },
                json={"model": m, "texts": texts},
            )
            r.raise_for_status()
            data = r.json()
            return data["embeddings"]  # Cohere shape

        else:
            # default: OpenAI direct (expects OPENAI_API_KEY and an OpenAI model id)
            m = model.split("openai:", 1)[1] if model.startswith("openai:") else (model or "text-embedding-3-small")
            r = await cx.post(
                "https://api.openai.com/v1/embeddings",
                headers={
                    "Authorization": f"Bearer {os.getenv('OPENAI_API_KEY','')}",
                    "Content-Type": "application/json",
                },
                json={"model": m, "input": texts},
            )
            r.raise_for_status()
            data = r.json()
            return [d["embedding"] for d in data["data"]]

def upsert_doc(conn: Connection, *, kind: str, title: str, text: str,
               url: str | None, meta: Dict[str, Any] | None) -> None:
    """
    Inserts a row if not exists (by (kind, title, url, text) hash),
    else updates text/meta. Embedding is left null initially.
    """
    meta = meta or {}
    with conn.cursor() as cur:
        cur.execute(
            f"""
            insert into {DOCS_TABLE}(kind, title, text, url, meta)
            values (%s, %s, %s, %s, %s)
            on conflict do nothing
            """,
            (kind, title or "", text or "", url, json.dumps(meta))
        )

def backfill_embeddings_sync(conn: Connection, limit: int = 512) -> int:
    """
    Selects rows with NULL embedding, fetches embeddings in batches,
    and updates those rows.
    Returns number of rows updated.
    """
    # NOTE: we pull (id, text) and embed in batches
    with conn.cursor(row_factory=tuple_row) as cur:
        cur.execute(
            f"select id, text from {DOCS_TABLE} where embedding is null limit %s",
            (limit,)
        )
        rows = cur.fetchall()

    if not rows:
        return 0

    # Batch embed to avoid very long payloads. 128 is a good sweet spot.
    batch_size = 128
    all_updated = 0
    for batch in chunks(rows, batch_size):
        ids = [r[0] for r in batch]
        texts = [r[1] or "" for r in batch]

        # lazy import for asyncio to keep this file simple to run as script
        import asyncio
        embs: List[List[float]] = asyncio.run(embed_texts(texts))

        with conn.cursor() as cur:
            for _id, vec in zip(ids, embs):
                cur.execute(
                    f"update {DOCS_TABLE} set embedding = %s where id = %s",
                    (vec, _id)
                )
        conn.commit()
        all_updated += len(batch)

    return all_updated

# ----------------------- loaders for your JSONs -----------------------

def load_json(path: str) -> Any:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)

def normalize_text(s: str | None) -> str:
    s = s or ""
    # collapse huge whitespace
    return " ".join(s.split())

# ---------- OLD (LEGACY) NESTED CATALOG FORMAT INGEST ----------------

def add_product_docs(conn: Connection, catalog: Dict[str, Any], meta: Dict[str, Any]) -> int:
    """
    LEGACY: Walks your old catalogData.json structure and writes product-level docs.
    Expects tiers -> products -> variants.
    """
    n = 0
    # catalog likely has tiers like {"casual":[...], "originals":[...]}
    for _, products in catalog.items():
        for p in products:
            name = p.get("name", "")
            # legacy may use base_price or basePrice
            base_price = p.get("base_price", p.get("basePrice"))
            tier = p.get("tier", "")
            pslug = p.get("slug", "")
            variants = p.get("variants", []) or p.get("colors", []) or []

            base_txt = normalize_text(
                f"{name}. Tier: {tier}. Base price: {base_price}. "
                f"Material: {p.get('material','')}. Type: {p.get('type','')}."
            )

            for v in variants:
                vid = v.get("variantId")
                color = v.get("color_name", v.get("colorName", ""))
                price = v.get("price", p.get("price"))
                # legacy: either `stock` or per-size dict
                stock = v.get("stock")
                if stock is None and isinstance(v.get("sizes"), dict):
                    stock = sum(v["sizes"].values())
                title = f"{name} — {color}".strip(" —")
                url = f"/product/{pslug}" if pslug else None

                # enrich from meta if present
                mrow = meta.get(vid, {}) if isinstance(meta, dict) else {}
                extra = {
                    "product_id": p.get("product_id", p.get("id")),
                    "variantId": vid,
                    "colorName": color,
                    "hex": v.get("color_hex", v.get("hex")),
                    "images": v.get("images", []),
                    "price": price,
                    "stock": stock,
                    "sizes": v.get("sizes", {}),
                    "tier": tier,
                    "type": p.get("type"),
                    "material": p.get("material"),
                    "meta": mrow,
                }
                text = normalize_text(
                    base_txt + " " +
                    f"Variant {vid}. Price {price}. Stock {stock}. "
                    f"Additional: {mrow.get('material','') or ''}."
                )
                upsert_doc(conn, kind="product", title=title, text=text, url=url, meta=extra)
                n += 1
    conn.commit()
    return n

# ---------- NEW FLAT VARIANT FORMAT INGEST (productVariantsFlat.json) ---------

def add_product_docs_flat(conn: Connection, variants: List[Dict[str, Any]], meta: Dict[str, Any]) -> int:
    """
    NEW: Ingests flat per-variant records (productVariantsFlat.json).
    Each item is a single variant with rich fabric/style/fit data.
    """
    n = 0

    for v in variants:
        vid = v.get("variantId")
        if not vid:
            continue

        name = v.get("name", "")
        tier = v.get("tier", "")
        ptype = v.get("type", "")
        material = v.get("material", "")
        gender = v.get("gender", "")
        fit = v.get("fit", "")
        color_name = v.get("colorName", "")
        hex_color = v.get("hex", "")
        price = v.get("price")
        sizes = v.get("sizes", {}) or {}
        images = v.get("images", []) or []
        description = v.get("description", "")

        fabric = v.get("fabric") or {}
        style = v.get("style") or {}
        fit_profile = v.get("fitProfile") or {}
        care = v.get("care") or {}

        title = f"{name} — {color_name}".strip(" —")
        group_slug = v.get("groupSlug") or v.get("slug")
        url = f"/product/{group_slug}" if group_slug else None

        # ------------------ build rich text for embeddings ------------------
        base_parts: List[str] = [
            name,
            f"Tier: {tier}.",
            f"Type: {ptype}.",
            f"Material: {material}.",
            f"Fit: {fit}.",
            f"Gender: {gender}.",
            f"Color: {color_name} ({hex_color}).",
        ]
        if price is not None:
            base_parts.append(f"Price: {price} EUR.")

        if description:
            base_parts.append(description)

        # Fabric info
        if fabric:
            fb = []
            blend = fabric.get("materialBlend")
            gsm = fabric.get("gsm")
            stretch = fabric.get("stretchLevel")
            thickness = fabric.get("thickness")
            warmth = fabric.get("warmth")
            breathability = fabric.get("breathability")
            softness = fabric.get("softness")

            if blend:
                fb.append(f"Fabric blend: {blend}.")
            if gsm:
                fb.append(f"Weight: {gsm} GSM.")
            if stretch:
                fb.append(f"Stretch level: {stretch}.")
            if thickness:
                fb.append(f"Thickness: {thickness}.")
            if warmth:
                fb.append(f"Warmth: {warmth}.")
            if breathability:
                fb.append(f"Breathability: {breathability}.")
            if softness:
                fb.append(f"Softness: {softness}.")
            base_parts.append(" ".join(fb))

        # Style info
        if style:
            st = []
            dress = style.get("dressCode")
            tags = style.get("styleTags") or []
            uses = style.get("useCases") or []
            pattern = style.get("pattern")
            logo_placement = style.get("logoPlacement")

            if dress:
                st.append(f"Dress code: {dress}.")
            if tags:
                st.append("Style tags: " + ", ".join(tags) + ".")
            if uses:
                st.append("Use cases: " + ", ".join(uses) + ".")
            if pattern:
                st.append(f"Pattern: {pattern}.")
            if logo_placement:
                st.append(f"Logo placement: {logo_placement}.")
            base_parts.append(" ".join(st))

        # Fit profile info
        if fit_profile:
            fp = []
            fp_fit = fit_profile.get("fit")
            length = fit_profile.get("length")
            shapes = fit_profile.get("bodyShapes") or []
            rec_gender = fit_profile.get("recommendedGender")
            stretch_helps = fit_profile.get("stretchHelpsFit")

            if fp_fit:
                fp.append(f"Fit profile: {fp_fit}.")
            if length:
                fp.append(f"Length: {length}.")
            if shapes:
                fp.append("Recommended for body shapes: " + ", ".join(shapes) + ".")
            if rec_gender:
                fp.append(f"Recommended gender: {rec_gender}.")
            if stretch_helps:
                fp.append("Stretch helps the garment adapt to different body shapes.")
            base_parts.append(" ".join(fp))

        # Care info
        if care:
            cparts = []
            wash = care.get("washTemp")
            if wash:
                cparts.append(f"Wash temperature: {wash}.")
            # add other care fields as needed
            if cparts:
                base_parts.append(" ".join(cparts))

        # Add a summary of size availability
        if sizes:
            available_sizes = ", ".join(sorted(sizes.keys()))
            base_parts.append(f"Available sizes: {available_sizes}.")

        text = normalize_text(" ".join([p for p in base_parts if p]))

        # ------------------ metadata JSON ------------------
        mrow = meta.get(vid, {}) if isinstance(meta, dict) else {}

        extra = {
            "variantId": vid,
            "groupId": v.get("groupId"),
            "groupSlug": group_slug,
            "sizingKey": v.get("sizingKey"),
            "name": name,
            "tier": tier,
            "type": ptype,
            "material": material,
            "gender": gender,
            "fit": fit,
            "colorName": color_name,
            "hex": hex_color,
            "price": price,
            "sizes": sizes,
            "images": images,
            "fabric": fabric,
            "style": style,
            "fitProfile": fit_profile,
            "care": care,
            "meta": mrow,
        }

        upsert_doc(conn, kind="product", title=title, text=text, url=url, meta=extra)
        n += 1

    conn.commit()
    return n

# ---------------------- simple size policy seeds ---------------------

def add_size_policy_docs(conn: Connection) -> int:
    """
    Quick seed for size/fit guidance. Replace with your canonical policy later.
    """
    examples = [
        {
            "title": "Size & Fit — Hoodies",
            "text": "Hoodies are regular fit: choose your usual size; size up for a relaxed/oversized look.",
            "url": "/policies/size-fit",
            "meta": {"category": "hoodie"}
        },
        {
            "title": "Size & Fit — Bombers",
            "text": "Bombers are regular fit; if you're between sizes, choose the larger.",
            "url": "/policies/size-fit",
            "meta": {"category": "bomber"}
        }
    ]
    for ex in examples:
        upsert_doc(conn, kind="size_policy", title=ex["title"], text=ex["text"], url=ex["url"], meta=ex["meta"])
    conn.commit()
    return len(examples)

def add_general_policy_docs(conn: Connection) -> int:
    """
    Seed general policies (shipping, returns).
    """
    examples = [
        {
            "title": "Shipping & Delivery Policy",
            "text": "Standard delivery takes 3-5 business days. Express delivery takes 1-2 business days. We ship to most European countries.",
            "url": "/policies/shipping",
            "meta": {"category": "shipping"}
        },
        {
            "title": "Return & Refund Policy",
            "text": "You can return any item within 30 days of receipt if it is unworn and in original condition. We offer free returns for store credit, or a refund to original payment method (minus shipping).",
            "url": "/policies/returns",
            "meta": {"category": "returns"}
        }
    ]
    for ex in examples:
        upsert_doc(conn, kind="policy", title=ex["title"], text=ex["text"], url=ex["url"], meta=ex["meta"])
    conn.commit()
    return len(examples)

# ------------------------------- CLI ---------------------------------

def main():
    parser = argparse.ArgumentParser(description="Cove AI — ingest catalog/policies into pgvector.")
    parser.add_argument(
        "--catalog",
        help="Path to catalog JSON. Supports legacy nested catalogData.json OR new flat productVariantsFlat.json."
    )
    parser.add_argument("--meta", help="Path to clothingMeta.json (optional, used if present)")
    parser.add_argument("--embed-missing", action="store_true", help="Backfill embeddings for rows with NULL embeddings")
    args = parser.parse_args()

    # Connect DB
    conn = connect()
    print("[ingest] Connected to DB.")

    total_inserted = 0

    # Load catalog if provided
    if args.catalog:
        data = load_json(args.catalog)
        m = load_json(args.meta) if args.meta else {}

        if isinstance(data, list):
            # New flat variant format
            print("[ingest] Detected flat variant catalog (list).")
            n = add_product_docs_flat(conn, data, m)
        elif isinstance(data, dict):
            # Legacy nested format
            print("[ingest] Detected legacy nested catalog (dict).")
            n = add_product_docs(conn, data, m)
        else:
            raise ValueError("Unsupported catalog JSON structure (expected list or dict).")

        print(f"[ingest] Inserted/updated product docs: {n}")
        total_inserted += n

    # Always seed a tiny size policy set (safe & idempotent)
    n = add_size_policy_docs(conn)
    print(f"[ingest] Inserted/updated size policy docs: {n}")
    total_inserted += n

    n = add_general_policy_docs(conn)
    print(f"[ingest] Inserted/updated general policy docs: {n}")
    total_inserted += n

    if args.embed_missing:
        updated = backfill_embeddings_sync(conn, limit=2000)
        print(f"[ingest] Backfilled embeddings for rows: {updated}")

    print(f"[ingest] Done. Rows touched (insert/update attempts): {total_inserted}")

if __name__ == "__main__":
    main()
