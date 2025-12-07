# backend/tools/cart_views.py
from __future__ import annotations
import uuid
from typing import Dict, Any, List, Optional

from django.db import transaction
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status

from catalog.models import (
    Cart,
    CartItem,
    ColorGroup,
    SizeStockPrice,
)

# --- Helpers -----------------------------------------------------------------

def _serialize_cart(cart: Cart) -> Dict[str, Any]:
    items = []
    total = 0.0
    
    for item in cart.items.select_related('variant', 'variant__product').all():
        variant = item.variant
        product = variant.product
        
        # Find price for this size
        try:
            ssp = variant.sizes.get(size=item.size)
            price = float(ssp.price)
        except SizeStockPrice.DoesNotExist:
            price = float(product.base_price)  # Fallback
            
        subtotal = price * item.quantity
        total += subtotal
        
        items.append({
            "variantId": variant.variant_id,
            "productId": product.product_id,
            "slug": product.slug,
            "name": product.name,
            "tier": product.tier,
            "type": product.type,
            "color": variant.color_name,
            "size": item.size,
            "quantity": item.quantity,
            "price": price,
            "subtotal": subtotal,
            "image": variant.images.first().image_name if variant.images.exists() else "",
        })
        
    return {
        "cartId": cart.cart_id,
        "items": items,
        "total": total,
        "currency": "EUR",
        "itemCount": sum(i["quantity"] for i in items),
    }

def _get_or_create_cart(data: Dict[str, Any]) -> Cart:
    cart_id = data.get("cartId")
    
    if cart_id:
        try:
            return Cart.objects.get(cart_id=cart_id)
        except Cart.DoesNotExist:
            pass
            
    # Create new cart
    new_id = cart_id or str(uuid.uuid4())
    cart = Cart.objects.create(
        cart_id=new_id,
        clerk_user_id=data.get("clerkUserId"),
        guest_session_id=data.get("guestSessionId"),
        email=data.get("email"),
    )
    return cart

# --- Views -------------------------------------------------------------------

@api_view(["POST"])
@permission_classes([AllowAny])
def cart_add(request):
    from utils.validators import validate_quantity
    from rest_framework.exceptions import ValidationError as DRFValidationError
    
    data = request.data or {}
    variant_id = data.get("variantId")
    size = data.get("size") or "M" # Default to M if null/empty
    
    # Validate quantity
    try:
        quantity = validate_quantity(data.get("quantity", 1), max_qty=100)
    except DRFValidationError as e:
        return Response({"detail": str(e)}, status=400)
    
    if not variant_id:
        return Response({"detail": "variantId required"}, status=400)

        
    try:
        variant = ColorGroup.objects.get(variant_id=variant_id)
    except ColorGroup.DoesNotExist:
        return Response({"detail": "Variant not found"}, status=404)
        
    with transaction.atomic():
        cart = _get_or_create_cart(data)
        
        item, created = CartItem.objects.get_or_create(
            cart=cart,
            variant=variant,
            size=size,
            defaults={"quantity": 0}
        )
        
        item.quantity += quantity
        item.save()
        
    return Response(_serialize_cart(cart))

@api_view(["POST"])
@permission_classes([AllowAny])
def cart_update(request):
    from utils.validators import validate_quantity
    from rest_framework.exceptions import ValidationError as DRFValidationError
    
    data = request.data or {}
    cart_id = data.get("cartId")
    variant_id = data.get("variantId")
    size = data.get("size")
    
    # Validate quantity (allow 0 for deletion)
    try:
        raw_qty = int(data.get("quantity", 0))
        if raw_qty > 0:
            quantity = validate_quantity(raw_qty, max_qty=100)
        else:
            quantity = 0  # Allow 0 for deletion
    except (ValueError, TypeError):
        return Response({"detail": "Invalid quantity"}, status=400)
    except DRFValidationError as e:
        return Response({"detail": str(e)}, status=400)
    
    if not cart_id or not variant_id or not size:
        return Response({"detail": "cartId, variantId, size required"}, status=400)
        
    try:
        cart = Cart.objects.get(cart_id=cart_id)
        variant = ColorGroup.objects.get(variant_id=variant_id)
    except (Cart.DoesNotExist, ColorGroup.DoesNotExist):
        return Response({"detail": "Cart or Variant not found"}, status=404)
        
    try:
        item = CartItem.objects.get(cart=cart, variant=variant, size=size)
        if quantity <= 0:
            item.delete()
        else:
            item.quantity = quantity
            item.save()
    except CartItem.DoesNotExist:
        if quantity > 0:
            CartItem.objects.create(
                cart=cart, 
                variant=variant, 
                size=size, 
                quantity=quantity
            )
            
    return Response(_serialize_cart(cart))


# --- Week 4: Cart Unification Endpoints --------------------------------------

@api_view(["GET"])
@permission_classes([AllowAny])
def cart_get(request):
    """
    GET /tools/cart.get?clerkUserId=...&guestSessionId=...
    
    Fetch cart for a user or guest session.
    Returns serialized cart with items, prices, totals.
    """
    clerk_user_id = request.GET.get("clerkUserId", "").strip()
    guest_session_id = request.GET.get("guestSessionId", "").strip()
    
    if not clerk_user_id and not guest_session_id:
        return Response({"detail": "clerkUserId or guestSessionId required"}, status=400)
    
    # Try to find existing cart
    cart = None
    if clerk_user_id:
        cart = Cart.objects.filter(clerk_user_id=clerk_user_id).first()
    elif guest_session_id:
        cart = Cart.objects.filter(guest_session_id=guest_session_id).first()
    
    if not cart:
        # Return empty cart
        return Response({
            "cartId": None,
            "items": [],
            "total": 0.0,
            "itemCount": 0
        })
    
    return Response(_serialize_cart(cart))


@api_view(["POST"])
@permission_classes([AllowAny])
def cart_clear(request):
    """
    POST /tools/cart.clear
    Body: {clerkUserId, guestSessionId}
    
    Clear all items from user's cart.
    """
    data = request.data or {}
    clerk_user_id = data.get("clerkUserId", "").strip()
    guest_session_id = data.get("guestSessionId", "").strip()
    
    if not clerk_user_id and not guest_session_id:
        return Response({"detail": "clerkUserId or guestSessionId required"}, status=400)
    
    # Find cart
    cart = None
    if clerk_user_id:
        cart = Cart.objects.filter(clerk_user_id=clerk_user_id).first()
    elif guest_session_id:
        cart = Cart.objects.filter(guest_session_id=guest_session_id).first()
    
    if cart:
        # Delete all cart items
        cart.items.all().delete()
    
    return Response({"ok": True, "message": "Cart cleared"})
