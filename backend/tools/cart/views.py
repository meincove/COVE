# ==============================================
# tools/cart/views.py
# ==============================================
from __future__ import annotations

from django.core.exceptions import ValidationError
from django.db import transaction
from django.views.decorators.csrf import csrf_exempt

from rest_framework import status
from rest_framework.decorators import (
    api_view,
    permission_classes,
    authentication_classes,
    renderer_classes,
)
from rest_framework.permissions import AllowAny
from rest_framework.renderers import JSONRenderer
from rest_framework.response import Response

from tools.models import Cart, CartEvent
# use our cart serializers (output + input validators)
from .serializers import CartSerializer, CartAddIn, CartUpdateIn, CartRemoveIn
from .services import add_to_cart, update_item_quantity, remove_item


def _get_cart(cart_id: str | None):
    if not cart_id:
        return None
    try:
        return Cart.objects.get(id=cart_id)
    except Cart.DoesNotExist:
        return None


def _record_event(idempotency_key: str | None, action: str, cart, req: dict, resp: dict) -> None:
    if not idempotency_key:
        return
    try:
        CartEvent.objects.create(
            cart=cart,
            action=action,
            idempotency_key=idempotency_key,
            request_json=req,
            response_json=resp,
        )
    except Exception:
        # Duplicate key or any non-critical failure: ignore (idempotent behavior)
        pass


@api_view(["GET"])
@permission_classes([AllowAny])
@renderer_classes([JSONRenderer])
def cart_view(request):
    cart_id = request.query_params.get("cartId")
    cart = _get_cart(cart_id)
    if not cart:
        return Response({"error": "cart not found"}, status=status.HTTP_404_NOT_FOUND)
    return Response(CartSerializer(cart).data, status=status.HTTP_200_OK)


@csrf_exempt
@api_view(["POST"])  # /tools/cart.add
@permission_classes([AllowAny])
@authentication_classes([])  # disable SessionAuthentication → CSRF-free
@renderer_classes([JSONRenderer])
@transaction.atomic
def cart_add(request):
    payload = request.data or {}
    idem = request.headers.get("Idempotency-Key") or payload.get("idempotencyKey")

    # Idempotency replay (scoped to action)
    if idem:
        ev = CartEvent.objects.filter(idempotency_key=idem, action="add").first()
        if ev:
            return Response(ev.response_json, status=status.HTTP_200_OK)

    # Validate input
    inp = CartAddIn(data=payload)
    inp.is_valid(raise_exception=True)
    d = inp.validated_data

    cart = _get_cart(d.get("cartId"))
    variant_id = d["variantId"]
    size = d["size"]
    quantity = d["quantity"]

    clerk_user_id = d.get("clerkUserId")
    guest_session_id = d.get("guestSessionId")
    email = d.get("email")

    try:
        cart = add_to_cart(
            cart=cart,
            variant_id=variant_id,
            size=size,
            quantity=quantity,
            clerk_user_id=clerk_user_id,
            guest_session_id=guest_session_id,
            email=email,
        )
    except ValidationError as e:
        resp = {"error": str(e)}
        _record_event(idem, "add", cart, payload, resp)
        return Response(resp, status=status.HTTP_400_BAD_REQUEST)

    data = CartSerializer(cart).data
    _record_event(idem, "add", cart, payload, data)
    return Response(data, status=status.HTTP_200_OK)


@csrf_exempt
@api_view(["POST"])  # /tools/cart.update
@permission_classes([AllowAny])
@authentication_classes([])  # CSRF-free
@renderer_classes([JSONRenderer])
@transaction.atomic
def cart_update(request):
    payload = request.data or {}
    idem = request.headers.get("Idempotency-Key") or payload.get("idempotencyKey")

    if idem:
        ev = CartEvent.objects.filter(idempotency_key=idem, action="update").first()
        if ev:
            return Response(ev.response_json, status=status.HTTP_200_OK)

    # Validate input
    inp = CartUpdateIn(data=payload)
    inp.is_valid(raise_exception=True)
    d = inp.validated_data

    cart = _get_cart(d["cartId"])
    if not cart:
        resp = {"error": "cart not found"}
        _record_event(idem, "update", None, payload, resp)
        return Response(resp, status=status.HTTP_404_NOT_FOUND)

    variant_id = d["variantId"]
    size = d["size"]
    quantity = d["quantity"]

    try:
        cart = update_item_quantity(cart=cart, variant_id=variant_id, size=size, quantity=quantity)
    except ValidationError as e:
        resp = {"error": str(e)}
        _record_event(idem, "update", cart, payload, resp)
        return Response(resp, status=status.HTTP_400_BAD_REQUEST)

    data = CartSerializer(cart).data
    _record_event(idem, "update", cart, payload, data)
    return Response(data, status=status.HTTP_200_OK)


@csrf_exempt
@api_view(["POST"])  # /tools/cart.remove
@permission_classes([AllowAny])
@authentication_classes([])  # CSRF-free
@renderer_classes([JSONRenderer])
@transaction.atomic
def cart_remove(request):
    payload = request.data or {}
    idem = request.headers.get("Idempotency-Key") or payload.get("idempotencyKey")

    if idem:
        ev = CartEvent.objects.filter(idempotency_key=idem, action="remove").first()
        if ev:
            return Response(ev.response_json, status=status.HTTP_200_OK)

    # Validate input
    inp = CartRemoveIn(data=payload)
    inp.is_valid(raise_exception=True)
    d = inp.validated_data

    cart = _get_cart(d["cartId"])
    if not cart:
        resp = {"error": "cart not found"}
        _record_event(idem, "remove", None, payload, resp)
        return Response(resp, status=status.HTTP_404_NOT_FOUND)

    variant_id = d["variantId"]
    size = d["size"]

    cart = remove_item(cart=cart, variant_id=variant_id, size=size)
    data = CartSerializer(cart).data
    _record_event(idem, "remove", cart, payload, data)
    return Response(data, status=status.HTTP_200_OK)
