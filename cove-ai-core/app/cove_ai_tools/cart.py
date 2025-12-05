# app/cove_ai_tools/cart.py
from __future__ import annotations

from typing import Any, Dict, List, Optional, TypedDict
import logging

import httpx

from app.config import DJANGO_BASE_URL

log = logging.getLogger("cove.tools.cart")


class CartAddInput(TypedDict, total=False):
    """
    Input contract for adding an item to cart via Django.

    Mirrors what your frontend already sends to /tools/cart.add.
    """
    variantId: str
    size: str
    quantity: int
    cartId: str
    clerkUserId: str
    guestSessionId: str
    email: str
    idempotencyKey: str


class CartItem(TypedDict, total=False):
    """
    Shape of one cart line item, following Django's CartSerializer.
    """
    variantId: Optional[str]
    size: Optional[str]
    quantity: Optional[int]
    price: Optional[float]
    name: Optional[str]
    tier: Optional[str]
    type: Optional[str]
    color: Optional[str]
    subtotal: Optional[float]


class CartAddOutput(TypedDict, total=False):
    ok: bool
    message: str
    cartId: Optional[str]
    cart: Dict[str, Any]
    items: List[CartItem]


class CartGetInput(TypedDict, total=False):
    """
    How we identify a cart from AI side.
    """
    cartId: str
    clerkUserId: str
    guestSessionId: str


class CartGetOutput(TypedDict, total=False):
    ok: bool
    message: str
    cartId: Optional[str]
    items: List[CartItem]
    total: float
    currency: str


async def cart_add(body: CartAddInput) -> CartAddOutput:
    """
    Tool-style wrapper for Django /tools/cart.add.

    Later, MCP will expose this as `cove.cart_add`.
    """
    payload: Dict[str, Any] = {
        "variantId": body["variantId"],
        "size": body["size"],
        "quantity": body.get("quantity", 1),
    }

    # Optional fields
    for key in ("cartId", "clerkUserId", "guestSessionId", "email"):
        if key in body and body[key]:
            payload[key] = body[key]

    headers: Dict[str, str] = {"Content-Type": "application/json"}
    if "idempotencyKey" in body and body["idempotencyKey"]:
        headers["Idempotency-Key"] = body["idempotencyKey"]

    base = DJANGO_BASE_URL.rstrip("/")
    url = f"{base}/tools/cart.add"

    async with httpx.AsyncClient(timeout=10) as cx:
        resp = await cx.post(url, json=payload, headers=headers)

    try:
        data = resp.json()
    except Exception:
        data = {"raw": resp.text}

    cart_id: Optional[str] = None
    items: List[CartItem] = []

    if isinstance(data, dict):
        cart_id = data.get("id") or data.get("cartId")
        raw_items = data.get("items")
        if isinstance(raw_items, list):
            items = raw_items  # type: ignore[assignment]

    ok = 200 <= resp.status_code < 300

    if ok:
        message = "Item added to cart."
    else:
        message = "Failed to add item to cart."
        if isinstance(data, dict) and data.get("error"):
            message = str(data["error"])

    return {
        "ok": ok,
        "message": message,
        "cartId": cart_id,
        "cart": data if isinstance(data, dict) else {},
        "items": items,
    }


async def cart_get(params: CartGetInput) -> CartGetOutput:
    """
    Tool-style wrapper for 'get current cart'.

    Adjust the URL to match your actual Django endpoint for reading a cart.
    """
    base = DJANGO_BASE_URL.rstrip("/")
    url = f"{base}/tools/cart.get"  # TODO: confirm real path

    async with httpx.AsyncClient(timeout=10) as cx:
        resp = await cx.get(url, params=params)

    try:
        data = resp.json()
    except Exception:
        data = {"raw": resp.text}

    cart_id: Optional[str] = None
    items: List[CartItem] = []
    total = 0.0
    currency = "EUR"

    if isinstance(data, dict):
        cart_id = data.get("id") or data.get("cartId")
        items = data.get("items") or []
        total = data.get("total") or 0.0
        currency = data.get("currency") or "EUR"

    ok = 200 <= resp.status_code < 300
    message = "Cart fetched." if ok else f"Cart fetch failed ({resp.status_code})"

    return {
        "ok": ok,
        "message": message,
        "cartId": cart_id,
        "items": items,
        "total": total,
        "currency": currency,
    }
