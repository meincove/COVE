# cove_ai_tools/checkout.py
"""
Checkout tools for AI agent.

Provides standard checkout functionality with Stripe Checkout Sessions.
"""
import logging
from typing import Dict, Any

from .config import ToolsConfig
from .types import CheckoutStartInput, CheckoutStartOutput, CheckoutStartData
from .http_client import get_http_client, ToolsHTTPError

logger = logging.getLogger(__name__)


async def checkout_start(payload: CheckoutStartInput) -> CheckoutStartOutput:
    """
    Initiate standard checkout flow with Stripe Checkout Session.
    
    This creates a Stripe Checkout Session and returns the payment URL.
    The user will be redirected to Stripe's hosted checkout page.
    
    Args:
        payload: Checkout request with user identification and optional preferences
        
    Returns:
        CheckoutStartOutput with payment URL or error
        
    Example:
        >>> result = await checkout_start({
        ...     "clerkUserId": "user_123",
        ...     "email": "user@example.com",
        ...     "country": "DE",
        ...     "shippingSpeed": "standard"
        ... })
        >>> print(result["data"]["paymentUrl"])
        "https://checkout.stripe.com/c/pay/..."
    
    Notes:
        - Requires non-empty cart in backend
        - Cart is fetched automatically by backend using clerkUserId/guestSessionId
        - Stock reservation happens in backend atomically
        - Actual payment processing occurs via Stripe webhook
    """
    logger.info("Initiating standard checkout", extra={
        "user_type": "clerk" if payload.get("clerkUserId") else "guest"
    })
    
    # Build request payload for Django backend
    request_data: Dict[str, Any] = {
        "items": [],  # Backend fetches cart automatically
        "clerkUserId": payload.get("clerkUserId"),
        "guestSessionId": payload.get("guestSessionId"),
        "customer_email": payload.get("email"),
        "country": payload.get("country", "DE"),
        "shippingSpeed": payload.get("shippingSpeed", "standard"),
    }
    
    client = get_http_client()
    
    try:
        # Call Django create-checkout-session endpoint
        response = await client.post(
            ToolsConfig.PAYMENTS_CHECKOUT_URL,
            json_data=request_data,
            headers={"Idempotency-Key": f"ai-checkout-{payload.get('clerkUserId') or payload.get('guestSessionId')}"}
        )
        
        # Normalize response
        checkout_data: CheckoutStartData = {
            "checkoutId": response.get("id", ""),
            "paymentUrl": response.get("url", ""),
            "currency": "EUR",  # From backend config
            "total": "0.00"  # Not returned by current endpoint, would need enhancement
        }
        
        logger.info("Checkout session created", extra={
            "checkout_id": checkout_data["checkoutId"]
        })
        
        return {
            "ok": True,
            "data": checkout_data,
            "error": None
        }
        
    except ToolsHTTPError as e:
        logger.error(f"Checkout failed: {e}", extra={
            "status_code": e.status_code,
            "response": e.response_data
        })
        
        # Parse backend error if available
        error_msg = "Checkout failed"
        if e.response_data:
            try:
                import json
                error_data = json.loads(e.response_data)
                error_msg = error_data.get("error", error_msg)
            except:
                pass
        
        return {
            "ok": False,
            "data": None,
            "error": error_msg
        }
    
    except Exception as e:
        logger.exception("Unexpected checkout error")
        return {
            "ok": False,
            "data": None,
            "error": f"Unexpected error: {str(e)}"
        }
