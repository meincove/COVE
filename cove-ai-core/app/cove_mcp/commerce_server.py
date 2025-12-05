# app/cove_mcp/commerce_server.py
from __future__ import annotations

import asyncio
import logging
from typing import Any, Dict, Optional

from mcp.server.fastmcp import FastMCP

from app.cove_ai_tools import recommendations, size_fit, cart

log = logging.getLogger("cove.mcp.commerce")

mcp = FastMCP("Cove Commerce MCP")


async def _maybe_await(value: Any) -> Any:
    if asyncio.iscoroutine(value) or asyncio.isfuture(value):
        return await value
    return value


# -------------------- Tools --------------------


@mcp.tool(name="recommend_products")
async def cove_recommend_products(
    query: str,
    filters: Dict[str, Any],
    top_k: int = 4,
) -> Dict[str, Any]:
    """
    Recommend products based on a query + filters.

    This signature becomes the MCP tool schema:
      {
        "query": string,
        "filters": object,
        "top_k": integer (default 4)
      }
    Internally we forward the dict into cove_ai_tools.recommendations.
    """
    payload: Dict[str, Any] = {
        "query": query,
        "filters": filters,
        "top_k": top_k,
    }
    log.info("MCP call: recommend_products payload=%s", payload)
    result = await _maybe_await(recommendations.recommend_products(payload))
    return result


@mcp.tool(name="get_size_fit_advice")
async def cove_get_size_fit_advice(
    message: str,
    attrs: Optional[Dict[str, Any]] = None,
    profile: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Get size & fit advice based on:
      - message   (raw user text)
      - attrs     (parsed colors/types/sizes)
      - profile   (optional AI profile dict)

    All three are explicit MCP arguments; we pass them through as a dict
    to cove_ai_tools.size_fit.get_size_fit_advice.
    """
    payload: Dict[str, Any] = {
        "message": message,
        "attrs": attrs or {},
        "profile": profile,
    }
    log.info("MCP call: get_size_fit_advice payload=%s", payload)
    result = await _maybe_await(size_fit.get_size_fit_advice(payload))
    return result


@mcp.tool(name="cart_add")
async def cove_cart_add(
    variantId: str,
    size: str,
    quantity: int = 1,
    cartId: Optional[str] = None,
    clerkUserId: Optional[str] = None,
    guestSessionId: Optional[str] = None,
    email: Optional[str] = None,
    idempotencyKey: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Add an item to the cart.

    Arguments mirror your existing cart_add tool contract; MCP schema
    will surface these as named fields.
    """
    payload: Dict[str, Any] = {
        "variantId": variantId,
        "size": size,
        "quantity": quantity,
        "cartId": cartId,
        "clerkUserId": clerkUserId,
        "guestSessionId": guestSessionId,
        "email": email,
        "idempotencyKey": idempotencyKey,
    }
    log.info("MCP call: cart_add payload=%s", payload)
    result = await _maybe_await(cart.cart_add(payload))
    return result


@mcp.tool(name="cart_get")
async def cove_cart_get(
    cartId: Optional[str] = None,
    clerkUserId: Optional[str] = None,
    guestSessionId: Optional[str] = None,
    email: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Fetch the current cart state.

    Again, arguments match your cart_get contract, but we stay generic.
    """
    payload: Dict[str, Any] = {
        "cartId": cartId,
        "clerkUserId": clerkUserId,
        "guestSessionId": guestSessionId,
        "email": email,
    }
    log.info("MCP call: cart_get payload=%s", payload)
    result = await _maybe_await(cart.cart_get(payload))
    return result


if __name__ == "__main__":
    mcp.run(transport="stdio")
