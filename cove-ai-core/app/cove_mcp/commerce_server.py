# app/cove_mcp/commerce_server.py
from __future__ import annotations

import asyncio
import logging
from typing import Any, Dict, Optional

from mcp.server.fastmcp import FastMCP

from app.cove_ai_tools import recommendations, size_fit, cart
# Week 4 - Phase 3: New commerce tools
from app.cove_ai_tools import checkout, orders, emails

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


# -------------------- Week 4 Phase 3: Commerce Flow Tools --------------------


@mcp.tool(name="checkout_start")
async def cove_checkout_start(
    clerkUserId: Optional[str] = None,
    guestSessionId: Optional[str] = None,
    email: Optional[str] = None,
    country: Optional[str] = "DE",
    shippingSpeed: Optional[str] = "standard",
) -> Dict[str, Any]:
    """
    Initiate standard checkout with Stripe Checkout Session.
    
    Creates a Stripe-hosted payment page for the user's current cart.
    Returns a payment URL that the user should visit to complete purchase.
    
    Args:
        clerkUserId: Clerk user ID for authenticated users
        guestSessionId: Session ID for guest users
        email: User's email address
        country: ISO 2-letter country code (default: "DE")
        shippingSpeed: "standard" or "express" (default: "standard")
    
    Returns:
        {
            "ok": bool,
            "data": {
                "checkoutId": str,
                "paymentUrl": str,
                "currency": str,
                "total": str
            } | None,
            "error": str | None
        }
    
    Notes:
        - User must have non-empty cart
        - Stock is reserved atomically during checkout creation
        - Actual payment processing happens via Stripe webhook
        - Returns error if cart is empty or user not identified
    """
    payload: Dict[str, Any] = {
        "clerkUserId": clerkUserId,
        "guestSessionId": guestSessionId,
        "email": email,
        "country": country,
        "shippingSpeed": shippingSpeed,
    }
    log.info("MCP call: checkout_start payload=%s", payload)
    result = await _maybe_await(checkout.checkout_start(payload))
    return result


@mcp.tool(name="order_get_status")
async def cove_order_get_status(
    clerkUserId: Optional[str] = None,
    guestSessionId: Optional[str] = None,
    email: Optional[str] = None,
    paymentIntentId: Optional[str] = None,
    limit: int = 3,
) -> Dict[str, Any]:
    """
    Query order history for a user.
    
    Fetches recent orders with full details including items, status, and totals.
    At least one identifier (clerkUserId, guestSessionId, email, or paymentIntentId) required.
    
    Priority order: clerkUserId > guestSessionId > email > paymentIntentId
    
    Args:
        clerkUserId: Clerk user ID
        guestSessionId: Guest session ID
        email: User's email address
        paymentIntentId: Specific Stripe payment intent ID
        limit: Maximum number of orders to return (default: 3, max: 20)
    
    Returns:
        {
            "ok": bool,
            "data": {
                "orders": [
                    {
                        "orderId": int,
                        "status": str,
                        "createdAt": str,
                        "currency": str,
                        "total": str,
                        "paymentIntentId": str,
                        "itemCount": int,
                        "items": [...],
                        "shippingAddress": {...} | None
                    }
                ]
            } | None,
            "error": str | None
        }
    
    Notes:
        - Returns most recent orders first
        - Includes full item details for each order
        - Shipping address included if available
    """
    payload: Dict[str, Any] = {
        "clerkUserId": clerkUserId,
        "guestSessionId": guestSessionId,
        "email": email,
        "paymentIntentId": paymentIntentId,
        "limit": limit,
    }
    log.info("MCP call: order_get_status payload=%s", payload)
    result = await _maybe_await(orders.order_get_status(payload))
    return result


@mcp.tool(name="email_send_order_confirmation")
async def cove_email_send_order_confirmation(
    orderId: int,
    forceResend: bool = False,
) -> Dict[str, Any]:
    """
    Resend order confirmation email.
    
    Triggers order confirmation email for a specific order.
    By default, emails are sent only once (idempotent).
    Use forceResend=True to send again even if previously sent.
    
    Args:
        orderId: Order ID to send confirmation for
        forceResend: If True, send even if already sent (default: False)
    
    Returns:
        {
            "ok": bool,
            "data": {
                "orderId": int,
                "sent": bool,
                "alreadySent": bool,
                "sentTo": str
            } | None,
            "error": str | None
        }
    
    Notes:
        - Idempotent by default (won't send duplicate emails)
        - Throttled to 5 requests/hour per IP
        - Returns error if order not found
    """
    payload: Dict[str, Any] = {
        "orderId": orderId,
        "forceResend": forceResend,
    }
    log.info("MCP call: email_send_order_confirmation payload=%s", payload)
    result = await _maybe_await(emails.email_send_order_confirmation(payload))
    return result


if __name__ == "__main__":
    mcp.run(transport="stdio")
