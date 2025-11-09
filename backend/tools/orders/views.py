from __future__ import annotations
from typing import Dict, Iterable

from django.apps import apps
from django.db.models import Sum
from rest_framework.decorators import api_view, permission_classes, renderer_classes
from rest_framework.permissions import AllowAny
from rest_framework.renderers import JSONRenderer
from rest_framework.response import Response
from rest_framework import status

from decimal import Decimal, ROUND_HALF_UP, InvalidOperation
from django.db.models import Q

from django.core.exceptions import FieldError

from .serializers import (
    OrderListQuery, OrderGetQuery,
    OrderItemOut, OrderOut, OrderListOut
)

def money(value) -> str:
    if value is None:
        return "0.00"
    try:
        d = Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    except (InvalidOperation, ValueError):
        d = Decimal("0.00")
    return f"{d:.2f}"

def get_model(app_label: str, *candidates: str):
    for name in candidates:
        try:
            return apps.get_model(app_label, name)
        except LookupError:
            continue
    raise LookupError(f"Could not find any of {candidates} in app '{app_label}'")

# Try to be tolerant to your real model names
OrderModel     = get_model("orders", "Order", "Orders", "Purchase")
OrderItemModel = get_model("orders", "OrderItem", "Item", "OrderLine")

def pick(obj, *names, default=None):
    for n in names:
        if hasattr(obj, n):
            v = getattr(obj, n)
            return v() if callable(v) else v
    return default

def order_items_qs(o) -> Iterable:
    for attr in ("items", "orderitem_set", "lines", "order_lines"):
        v = getattr(o, attr, None)
        if v is not None:
            return v.all() if hasattr(v, "all") else v
    return []

def assemble_item(it) -> Dict:
    qty   = int(pick(it, "quantity", "qty", default=0) or 0)
    unit  = money(pick(it, "unit_price", "price", default="0"))
    total = money(pick(it, "line_total", default=Decimal(qty) * Decimal(unit)))
    return {
        "variantId":  str(pick(it, "variant_id", "variantId", "sku", default="")),
        "size":       pick(it, "size", default="") or "",
        "qty":        qty,
        "unit_price": unit,
        "line_total": total,
    }

def assemble_order(o) -> Dict:
    items = [assemble_item(it) for it in order_items_qs(o)]

    # compute subtotal if not stored
    computed = sum(Decimal(i["line_total"]) for i in items) if items else Decimal("0.00")
    return {
        "order_id":   str(pick(o, "id", "order_id")),
        "created_at": pick(o, "created_at", "created", "timestamp"),
        "status":     pick(o, "status", default=""),
        "currency":   pick(o, "currency", default="EUR"),
        "subtotal":   money(pick(o, "subtotal", "total", default=computed)),
        "items":      items,
    }

def apply_identity_filter(qs, userId=None, email=None, guestSessionId=None):
    # Try common column names; ignore unknown ones
    if userId:
        try:
            qs = qs.filter(Q(user_id=userId) | Q(clerk_user_id=userId) | Q(customer_id=userId))
        except FieldError:
            pass
    if email:
        try:
            qs = qs.filter(
                Q(email__iexact=email) |
                Q(customer_email__iexact=email) |
                Q(billing_email__iexact=email)
            )
        except FieldError:
            pass
    if guestSessionId:
        try:
            qs = qs.filter(Q(guest_session_id=guestSessionId) | Q(guest_id=guestSessionId))
        except FieldError:
            pass
    return qs

@api_view(["GET"])
@permission_classes([AllowAny])
@renderer_classes([JSONRenderer])
def orders_list(request):
    q = OrderListQuery(data=request.query_params)
    q.is_valid(raise_exception=True)
    d = q.validated_data

    qs = OrderModel.objects.all().order_by("-created_at", "-id")
    qs = apply_identity_filter(qs, d.get("userId"), d.get("email"), d.get("guestSessionId"))

    total = qs.count()
    cursor, limit = d["cursor"], d["limit"]
    page = qs[cursor: cursor + limit]
    next_cursor = cursor + limit if (cursor + limit) < total else None

    items = [assemble_order(o) for o in page]
    out = OrderListOut(data={"total": total, "next_cursor": next_cursor, "items": items})
    out.is_valid(raise_exception=True)
    return Response(out.validated_data)

@api_view(["GET"])
@permission_classes([AllowAny])
@renderer_classes([JSONRenderer])
def orders_get(request):
    q = OrderGetQuery(data=request.query_params)
    q.is_valid(raise_exception=True)
    d = q.validated_data

    try:
        o = OrderModel.objects.get(pk=d["orderId"])
    except OrderModel.DoesNotExist:
        return Response({"detail": "order not found"}, status=status.HTTP_404_NOT_FOUND)

    # Optional ownership check (works if those columns exist)
    owned_qs = OrderModel.objects.filter(pk=d["orderId"])
    owned_qs = apply_identity_filter(owned_qs, d.get("userId"), d.get("email"), d.get("guestSessionId"))
    if not owned_qs.exists() and (d.get("userId") or d.get("email") or d.get("guestSessionId")):
        return Response({"detail": "order not found"}, status=status.HTTP_404_NOT_FOUND)

    payload = assemble_order(o)
    out = OrderOut(data=payload)
    out.is_valid(raise_exception=True)
    return Response(out.validated_data)
