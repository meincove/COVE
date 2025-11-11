# app/routes/tools.py
from fastapi import APIRouter, Query
from pydantic import BaseModel
from typing import Any, Optional
from uuid import UUID
from psycopg.rows import dict_row

from app.vector.store import connect

router = APIRouter()
_conn = None

class ProductOut(BaseModel):
    id: UUID
    title: str
    url: Optional[str] = None
    price: Optional[float] = None
    stock: Optional[dict] = None
    meta: dict = {}

def _get_conn():
    global _conn
    if _conn is None:
        _conn = connect()
    return _conn

@router.get("/ai/tools/product.get", response_model=ProductOut)
def product_get(slug: str = Query(..., description="product slug e.g. hoodie-casual-fleece-59.99")):
    """
    Lookup a product row stored in ai_core.docs where kind='product'
    and meta->>'slug' matches.
    """
    conn = _get_conn()
    with conn.cursor(row_factory=dict_row) as cur:
        cur.execute(
            """
            SELECT id, kind, title, text, url, meta
            FROM ai_core.docs
            WHERE kind = 'product' AND meta->>'slug' = %s
            LIMIT 1
            """,
            (slug,),
        )
        row = cur.fetchone()
        if not row:
            # FastAPI will render this as JSON automatically
            # (no jq parse error)
            return ProductOut(
                id=UUID("00000000-0000-0000-0000-000000000000"),
                title="NOT_FOUND",
                url=None,
                price=None,
                stock=None,
                meta={"error": f"no product for slug={slug}"}
            )

        meta = row.get("meta") or {}
        return ProductOut(
            id=row["id"],
            title=row.get("title") or meta.get("name") or "",
            url=row.get("url") or meta.get("url"),
            price=meta.get("price"),
            stock=meta.get("sizes") or meta.get("stock"),
            meta=meta,
        )

@router.get("/ai/tools/variant.get")
def variant_get(variantId: str = Query(...)):
    """
    Optional: fetch by variantId from meta (for verifier).
    """
    conn = _get_conn()
    with conn.cursor(row_factory=dict_row) as cur:
        cur.execute(
            """
            SELECT id, title, url, meta
            FROM ai_core.docs
            WHERE kind = 'product' AND meta @> %s::jsonb
            LIMIT 1
            """,
            ({"variantId": variantId},),
        )
        row = cur.fetchone()
        if not row:
            return {"ok": False, "error": f"variant {variantId} not found"}
        return {
            "ok": True,
            "id": str(row["id"]),
            "title": row.get("title") or "",
            "url": row.get("url"),
            "meta": row.get("meta") or {},
        }
