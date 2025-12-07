# cove_ai_tools/emails.py
"""
Email tools for AI agent.

Provides order confirmation email resending.
"""
import logging

from .config import ToolsConfig
from .types import EmailSendConfirmationInput, EmailSendConfirmationOutput, EmailSendConfirmationData
from .http_client import get_http_client, ToolsHTTPError

logger = logging.getLogger(__name__)


async def email_send_order_confirmation(payload: EmailSendConfirmationInput) -> EmailSendConfirmationOutput:
    """
    Resend order confirmation email.
    
    Triggers order confirmation email for a specific order.
    By default, emails are sent only once (idempotent).
    Use force_resend=True to override this behavior.
    
    Args:
        payload: Email request with orderId and optional forceResend flag
        
    Returns:
        EmailSendConfirmationOutput with send status or error
        
    Example:
        >>> # Normal resend (idempotent)
        >>> result = await email_send_order_confirmation({
        ...     "orderId": 123,
        ...     "forceResend": False
        ... })
        >>> print(result["data"]["sent"])
        True
        
        >>> # Force resend (even if already sent)
        >>> result = await email_send_order_confirmation({
        ...     "orderId": 123,
        ...     "forceResend": True
        ... })
    
    Notes:
        - Default behavior: email sent only once per order
        - forceResend=True: sends email again even if previously sent
        - Throttled to 5 requests per hour per IP (backend limit)
        - Email content generated from order data in backend
    """
    order_id = payload.get("orderId")
    force_resend = payload.get("forceResend", False)
    
    if not order_id:
        return {
            "ok": False,
            "data": None,
            "error": "orderId is required"
        }
    
    logger.info(f"Sending order confirmation for order {order_id}", extra={
        "force_resend": force_resend
    })
    
    request_data = {
        "orderId": order_id,
        "forceResend": force_resend
    }
    
    client = get_http_client()
    
    try:
        # Call Django send-receipt endpoint
        response = await client.post(
            ToolsConfig.ORDERS_SEND_RECEIPT_URL,
            json_data=request_data
        )
        
        # Extract response data
        data = response.get("data", {})
        
        result_data: EmailSendConfirmationData = {
            "orderId": data.get("orderId", order_id),
            "sent": data.get("sent", False),
            "alreadySent": data.get("alreadySent", False),
            "sentTo": data.get("sentTo", "unknown")
        }
        
        logger.info(f"Email send result", extra=result_data)
        
        return {
            "ok": True,
            "data": result_data,
            "error": None
        }
        
    except ToolsHTTPError as e:
        logger.error(f"Email send failed: {e}", extra={"status_code": e.status_code})
        
        # Parse backend error
        error_msg = "Failed to send email"
        if e.status_code == 404:
            error_msg = f"Order {order_id} not found"
        elif e.response_data:
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
        logger.exception("Unexpected email send error")
        return {
            "ok": False,
            "data": None,
            "error": f"Unexpected error: {str(e)}"
        }
