# cove_ai_tools/orders.py
"""
Order management tools for AI agent.

Provides order history querying and status checking.
"""
import logging
from typing import List, Dict, Any

from .config import ToolsConfig
from .types import (
    OrderGetStatusInput,
    OrderGetStatusOutput,
    OrderGetStatusData,
    Order,
    OrderItem
)
from .http_client import get_http_client, ToolsHTTPError

logger = logging.getLogger(__name__)


async def order_get_status(payload: OrderGetStatusInput) -> OrderGetStatusOutput:
    """
    Query order history for a user.
    
    Fetches recent orders with full details including items, totals, and status.
    Supports multiple identification methods with priority:
    clerkUserId > guestSessionId > email > paymentIntentId
    
    Args:
        payload: Query parameters with at least one identification method
        
    Returns:
        OrderGetStatusOutput with list of orders or error
        
    Example:
        >>> result = await order_get_status({
        ...     "clerkUserId": "user_123",
        ...     "limit": 5
        ... })
        >>> for order in result["data"]["orders"]:
        ...     print(f"Order #{order['orderId']}: {order['status']}, €{order['total']}")
    
    Notes:
        - Returns most recent orders first
        - Default limit: 3 orders
        - Maximum limit enforced by backend: 20 orders
        - Includes full order items for order analysis
    """
    # Validate at least one identifier is provided
    if not any([
        payload.get("clerkUserId"),
        payload.get("guestSessionId"),
        payload.get("email"),
        payload.get("paymentIntentId")
    ]):
        return {
            "ok": False,
            "data": None,
            "error": "At least one identifier required (clerkUserId, guestSessionId, email, or paymentIntentId)"
        }
    
    logger.info("Querying order history", extra={
        "clerk_user": payload.get("clerkUserId"),
        "limit": payload.get("limit", 3)
    })
    
    # Build query parameters
    params: Dict[str, Any] = {
        "limit": payload.get("limit", 3)
    }
    
    # Add identifier (priority order)
    if payload.get("clerkUserId"):
        params["clerkUserId"] = payload["clerkUserId"]
    elif payload.get("guestSessionId"):
        params["guestSessionId"] = payload["guestSessionId"]
    elif payload.get("email"):
        params["email"] = payload["email"]
    elif payload.get("paymentIntentId"):
        params["paymentIntentId"] = payload["paymentIntentId"]
    
    client = get_http_client()
    
    try:
        # Call Django orders/mine endpoint
        response = await client.get(
            ToolsConfig.ORDERS_MINE_URL,
            params=params
        )
        
        # Transform Django response to our normalized format
        orders: List[Order] = []
        
        for order_data in response:
            # Extract order items
            items: List[OrderItem] = []
            for item in order_data.get("items", []):
                items.append({
                    "productId": item.get("product_id", ""),
                    "variantId": item.get("variant_id", ""),
                    "name": item.get("name", "Unknown Product"),
                    "size": item.get("size", ""),
                    "color": item.get("color", ""),
                    "quantity": item.get("quantity", 0),
                    "price": str(item.get("price", "0.00"))
                })
            
            # Build order object
            order: Order = {
                "orderId": order_data.get("id", 0),
                "status": order_data.get("status", "unknown"),
                "createdAt": order_data.get("created_at", ""),
                "currency": order_data.get("currency", "EUR"),
                "total": str(order_data.get("total_price", "0.00")),
                "paymentIntentId": order_data.get("payment_intent_id", ""),
                "itemCount": len(items),
                "items": items,
                "shippingAddress": {
                    "name": order_data.get("shipping_name"),
                    "line1": order_data.get("shipping_address_line1"),
                    "line2": order_data.get("shipping_address_line2"),
                    "city": order_data.get("shipping_city"),
                    "state": order_data.get("shipping_state"),
                    "postalCode": order_data.get("shipping_postal_code"),
                    "country": order_data.get("shipping_country"),
                } if order_data.get("shipping_country") else None
            }
            
            orders.append(order)
        
        logger.info(f"Found {len(orders)} orders")
        
        return {
            "ok": True,
            "data": {"orders": orders},
            "error": None
        }
        
    except ToolsHTTPError as e:
        logger.error(f"Order query failed: {e}", extra={"status_code": e.status_code})
        return {
            "ok": False,
            "data": None,
            "error": f"Failed to fetch orders: {str(e)}"
        }
    
    except Exception as e:
        logger.exception("Unexpected order query error")
        return {
            "ok": False,
            "data": None,
            "error": f"Unexpected error: {str(e)}"
        }
