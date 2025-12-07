# cove_ai_tools/types.py
"""
Type definitions for AI tools layer.

Provides strong typing for all tool inputs and outputs.
"""
from typing import TypedDict, Optional, List, Literal
from decimal import Decimal


# ============================================================================
# Checkout Types
# ============================================================================

class CheckoutStartInput(TypedDict, total=False):
    """Input schema for standard checkout initiation."""
    clerkUserId: str
    guestSessionId: str
    email: str
    country: Optional[str]  # ISO 2-letter code
    shippingSpeed: Optional[Literal["standard", "express"]]


class CheckoutStartOutput(TypedDict):
    """Output schema for standard checkout."""
    ok: bool
    data: Optional['CheckoutStartData']
    error: Optional[str]


class CheckoutStartData(TypedDict):
    """Checkout session data."""
    checkoutId: str
    paymentUrl: str
    currency: str
    total: str  # Decimal as string for JSON serialization


# ============================================================================
# Orders Types
# ============================================================================

class OrderGetStatusInput(TypedDict, total=False):
    """Input schema for querying order history."""
    clerkUserId: Optional[str]
    guestSessionId: Optional[str]
    email: Optional[str]
    paymentIntentId: Optional[str]
    limit: int


class OrderItem(TypedDict):
    """Individual order item."""
    productId: str
    variantId: str
    name: str
    size: str
    color: str
    quantity: int
    price: str  # Decimal as string


class Order(TypedDict):
    """Order details."""
    orderId: int
    status: str
    createdAt: str
    currency: str
    total: str
    paymentIntentId: str
    itemCount: int
    items: List[OrderItem]
    shippingAddress: Optional[dict]


class OrderGetStatusOutput(TypedDict):
    """Output schema for order history query."""
    ok: bool
    data: Optional['OrderGetStatusData']
    error: Optional[str]


class OrderGetStatusData(TypedDict):
    """Order history data."""
    orders: List[Order]


# ============================================================================
# Email Types
# ============================================================================

class EmailSendConfirmationInput(TypedDict):
    """Input schema for sending order confirmation email."""
    orderId: int
    forceResend: bool


class EmailSendConfirmationOutput(TypedDict):
    """Output schema for email send operation."""
    ok: bool
    data: Optional['EmailSendConfirmationData']
    error: Optional[str]


class EmailSendConfirmationData(TypedDict):
    """Email send result data."""
    orderId: int
    sent: bool
    alreadySent: bool
    sentTo: str
