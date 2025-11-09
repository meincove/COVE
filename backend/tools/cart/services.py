# tools/cart/services.py
from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP
from typing import Optional, Tuple

from django.apps import apps
from django.core.exceptions import ValidationError
from django.db import transaction
from django.db.models import Prefetch
from django.utils import timezone

from tools.models import Cart, CartItem

__all__ = [
    "fetch_variant_price_and_stock",
    "ensure_stock_available",
    "add_to_cart",
    "update_item_quantity",
    "remove_item",
]

DECIMAL_2 = Decimal("0.01")


def _quantize_2(value: Decimal) -> Decimal:
    return value.quantize(DECIMAL_2, rounding=ROUND_HALF_UP)


def _ssp_model():
    # catalog.SizeStockPrice
    return apps.get_model("catalog", "SizeStockPrice")


def _img_model():
    # catalog.ProductImage
    return apps.get_model("catalog", "ProductImage")


def fetch_variant_price_and_stock(variant_id: str, size: str) -> Tuple[Decimal, int, dict]:
    """
    Exact traversal for your schema:

      SizeStockPrice (SSP)
        .variant -> ColorGroup
          .product -> ProductMasterGroup
          .images  -> ProductImage(image_name)

    Returns:
      (unit_price_decimal_2dp, stock_int, meta_dict)
    """
    SSP = _ssp_model()
    ProductImage = _img_model()

    qs = (
        SSP.objects
        .select_related("variant", "variant__product")  # single join hop to color & product
        .prefetch_related(
            Prefetch("variant__images", queryset=ProductImage.objects.order_by("id"))
        )
        .filter(variant__variant_id=variant_id, size=size)
    )

    ssp = qs.first()
    if not ssp:
        raise ValidationError("Variant/size not found")

    # price & stock live on SSP
    price = _quantize_2(Decimal(ssp.price))
    stock = int(ssp.quantity)

    cg = ssp.variant                   # ColorGroup
    pg = cg.product                    # ProductMasterGroup

    product_name = pg.name or ""
    color_name = cg.color_name or ""

    imgs = list(cg.images.all())
    image = imgs[0].image_name if imgs else ""

    meta = {"product_name": product_name, "color_name": color_name, "image": image}
    return price, stock, meta


def ensure_stock_available(variant_id: str, size: str, desired_qty: int) -> None:
    _, stock, _ = fetch_variant_price_and_stock(variant_id, size)
    if desired_qty < 0:
        raise ValidationError("Quantity cannot be negative")
    if desired_qty == 0:
        return
    if desired_qty > stock:
        raise ValidationError("No more stock")


@transaction.atomic
def add_to_cart(
    *,
    cart: Optional[Cart],
    variant_id: str,
    size: str,
    quantity: int,
    clerk_user_id: Optional[str] = None,
    guest_session_id: Optional[str] = None,
    email: Optional[str] = None,
) -> Cart:
    if cart is None:
        cart = Cart.objects.create(
            clerk_user_id=clerk_user_id,
            guest_session_id=guest_session_id,
            email=email,
        )

    try:
        item = CartItem.objects.select_for_update().get(
            cart=cart, variant_id=variant_id, size=size
        )
        new_qty = item.quantity + quantity
        ensure_stock_available(variant_id, size, new_qty)

        unit_price, _, meta = fetch_variant_price_and_stock(variant_id, size)
        item.quantity = new_qty
        item.unit_price = unit_price
        item.product_name = meta.get("product_name", "")
        item.color_name = meta.get("color_name", "")
        item.image = meta.get("image", "")
        item.save(
            update_fields=[
                "quantity",
                "unit_price",
                "product_name",
                "color_name",
                "image",
                "updated_at",
            ]
        )
    except CartItem.DoesNotExist:
        ensure_stock_available(variant_id, size, quantity)
        unit_price, _, meta = fetch_variant_price_and_stock(variant_id, size)
        CartItem.objects.create(
            cart=cart,
            variant_id=variant_id,
            size=size,
            quantity=quantity,
            unit_price=unit_price,
            product_name=meta.get("product_name", ""),
            color_name=meta.get("color_name", ""),
            image=meta.get("image", ""),
        )

    cart.updated_at = timezone.now()
    cart.save(update_fields=["updated_at"])
    return cart


@transaction.atomic
def update_item_quantity(*, cart: Cart, variant_id: str, size: str, quantity: int) -> Cart:
    try:
        item = CartItem.objects.select_for_update().get(
            cart=cart, variant_id=variant_id, size=size
        )
    except CartItem.DoesNotExist:
        # ✅ Idempotent no-op when setting to zero and line is already gone
        if quantity == 0:
            cart.updated_at = timezone.now()
            cart.save(update_fields=["updated_at"])
            return cart
        raise ValidationError("Item not in cart")

    if quantity <= 0:
        item.delete()
    else:
        ensure_stock_available(variant_id, size, quantity)
        unit_price, _, meta = fetch_variant_price_and_stock(variant_id, size)
        item.quantity = quantity
        item.unit_price = unit_price
        item.product_name = meta.get("product_name", "")
        item.color_name = meta.get("color_name", "")
        item.image = meta.get("image", "")
        item.save(update_fields=[
            "quantity", "unit_price", "product_name", "color_name", "image", "updated_at"
        ])

    cart.updated_at = timezone.now()
    cart.save(update_fields=["updated_at"])
    return cart

@transaction.atomic
def remove_item(*, cart: Cart, variant_id: str, size: str) -> Cart:
    CartItem.objects.filter(cart=cart, variant_id=variant_id, size=size).delete()
    cart.updated_at = timezone.now()
    cart.save(update_fields=["updated_at"])
    return cart
