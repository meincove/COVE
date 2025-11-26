# # tools/cart/services.py
# from __future__ import annotations

# from decimal import Decimal, ROUND_HALF_UP
# from typing import Optional, Tuple

# from django.apps import apps
# from django.core.exceptions import ValidationError
# from django.db import transaction
# from django.db.models import Prefetch
# from django.utils import timezone

# from tools.models import Cart, CartItem

# __all__ = [
#     "fetch_variant_price_and_stock",
#     "ensure_stock_available",
#     "add_to_cart",
#     "update_item_quantity",
#     "remove_item",
# ]

# DECIMAL_2 = Decimal("0.01")


# def _quantize_2(value: Decimal) -> Decimal:
#     return value.quantize(DECIMAL_2, rounding=ROUND_HALF_UP)


# def _ssp_model():
#     # catalog.SizeStockPrice
#     return apps.get_model("catalog", "SizeStockPrice")


# def _img_model():
#     # catalog.ProductImage
#     return apps.get_model("catalog", "ProductImage")


# def fetch_variant_price_and_stock(variant_id: str, size: str) -> Tuple[Decimal, int, dict]:
#     """
#     Exact traversal for your schema:

#       SizeStockPrice (SSP)
#         .variant -> ColorGroup
#           .product -> ProductMasterGroup
#           .images  -> ProductImage(image_name)

#     Returns:
#       (unit_price_decimal_2dp, stock_int, meta_dict)
#     """
#     SSP = _ssp_model()
#     ProductImage = _img_model()

#     qs = (
#         SSP.objects
#         .select_related("variant", "variant__product")  # single join hop to color & product
#         .prefetch_related(
#             Prefetch("variant__images", queryset=ProductImage.objects.order_by("id"))
#         )
#         .filter(variant__variant_id=variant_id, size=size)
#     )

#     ssp = qs.first()
#     if not ssp:
#         raise ValidationError("Variant/size not found")

#     # price & stock live on SSP
#     price = _quantize_2(Decimal(ssp.price))
#     stock = int(ssp.quantity)

#     cg = ssp.variant                   # ColorGroup
#     pg = cg.product                    # ProductMasterGroup

#     product_name = pg.name or ""
#     color_name = cg.color_name or ""

#     imgs = list(cg.images.all())
#     image = imgs[0].image_name if imgs else ""

#     meta = {"product_name": product_name, "color_name": color_name, "image": image}
#     return price, stock, meta


# def ensure_stock_available(variant_id: str, size: str, desired_qty: int) -> None:
#     _, stock, _ = fetch_variant_price_and_stock(variant_id, size)
#     if desired_qty < 0:
#         raise ValidationError("Quantity cannot be negative")
#     if desired_qty == 0:
#         return
#     if desired_qty > stock:
#         raise ValidationError("No more stock")


# @transaction.atomic
# def add_to_cart(
#     *,
#     cart: Optional[Cart],
#     variant_id: str,
#     size: str,
#     quantity: int,
#     clerk_user_id: Optional[str] = None,
#     guest_session_id: Optional[str] = None,
#     email: Optional[str] = None,
# ) -> Cart:
#     if cart is None:
#         cart = Cart.objects.create(
#             clerk_user_id=clerk_user_id,
#             guest_session_id=guest_session_id,
#             email=email,
#         )

#     try:
#         item = CartItem.objects.select_for_update().get(
#             cart=cart, variant_id=variant_id, size=size
#         )
#         new_qty = item.quantity + quantity
#         ensure_stock_available(variant_id, size, new_qty)

#         unit_price, _, meta = fetch_variant_price_and_stock(variant_id, size)
#         item.quantity = new_qty
#         item.unit_price = unit_price
#         item.product_name = meta.get("product_name", "")
#         item.color_name = meta.get("color_name", "")
#         item.image = meta.get("image", "")
#         item.save(
#             update_fields=[
#                 "quantity",
#                 "unit_price",
#                 "product_name",
#                 "color_name",
#                 "image",
#                 "updated_at",
#             ]
#         )
#     except CartItem.DoesNotExist:
#         ensure_stock_available(variant_id, size, quantity)
#         unit_price, _, meta = fetch_variant_price_and_stock(variant_id, size)
#         CartItem.objects.create(
#             cart=cart,
#             variant_id=variant_id,
#             size=size,
#             quantity=quantity,
#             unit_price=unit_price,
#             product_name=meta.get("product_name", ""),
#             color_name=meta.get("color_name", ""),
#             image=meta.get("image", ""),
#         )

#     cart.updated_at = timezone.now()
#     cart.save(update_fields=["updated_at"])
#     return cart


# @transaction.atomic
# def update_item_quantity(*, cart: Cart, variant_id: str, size: str, quantity: int) -> Cart:
#     try:
#         item = CartItem.objects.select_for_update().get(
#             cart=cart, variant_id=variant_id, size=size
#         )
#     except CartItem.DoesNotExist:
#         # ✅ Idempotent no-op when setting to zero and line is already gone
#         if quantity == 0:
#             cart.updated_at = timezone.now()
#             cart.save(update_fields=["updated_at"])
#             return cart
#         raise ValidationError("Item not in cart")

#     if quantity <= 0:
#         item.delete()
#     else:
#         ensure_stock_available(variant_id, size, quantity)
#         unit_price, _, meta = fetch_variant_price_and_stock(variant_id, size)
#         item.quantity = quantity
#         item.unit_price = unit_price
#         item.product_name = meta.get("product_name", "")
#         item.color_name = meta.get("color_name", "")
#         item.image = meta.get("image", "")
#         item.save(update_fields=[
#             "quantity", "unit_price", "product_name", "color_name", "image", "updated_at"
#         ])

#     cart.updated_at = timezone.now()
#     cart.save(update_fields=["updated_at"])
#     return cart

# @transaction.atomic
# def remove_item(*, cart: Cart, variant_id: str, size: str) -> Cart:
#     CartItem.objects.filter(cart=cart, variant_id=variant_id, size=size).delete()
#     cart.updated_at = timezone.now()
#     cart.save(update_fields=["updated_at"])
#     return cart

# tools/cart/services.py
from __future__ import annotations

from decimal import Decimal
from typing import Optional, Tuple

from django.core.exceptions import ValidationError

from catalog.models import ColorGroup, SizeStockPrice
from tools.models import Cart, CartItem


# ----------------- helpers ----------------- #

def _normalize_size(size: str) -> str:
    return (size or "").upper().strip()


def _get_variant_and_size(
    variant_id: str,
    size: str,
) -> Tuple[ColorGroup, SizeStockPrice]:
    """
    Resolve a (variantId, size) pair to:
      - ColorGroup row
      - SizeStockPrice row

    Raises ValidationError with user-facing messages if anything is invalid.
    """
    variant_id = (variant_id or "").strip()
    if not variant_id:
        raise ValidationError("variantId is required")

    size_norm = _normalize_size(size)
    if not size_norm:
        raise ValidationError("size is required")

    try:
        variant = (
            ColorGroup.objects
            .select_related("product")
            .prefetch_related("images", "sizes")
            .get(variant_id=variant_id)
        )
    except ColorGroup.DoesNotExist:
        raise ValidationError(f"Unknown variantId '{variant_id}'")

    try:
        size_row = SizeStockPrice.objects.get(variant=variant, size=size_norm)
    except SizeStockPrice.DoesNotExist:
        raise ValidationError(f"Size '{size_norm}' is not available for this variant")

    return variant, size_row


def _ensure_cart(
    cart: Optional[Cart],
    clerk_user_id: Optional[str],
    guest_session_id: Optional[str],
    email: Optional[str],
) -> Cart:
    """
    Either reuse the given cart or create a new open cart.

    We keep this deliberately simple: if we create a new cart we attach whatever
    identity info we got; if we reuse an existing cart we do NOT overwrite fields
    unless they are blank.
    """
    if cart is not None:
        changed = False
        if clerk_user_id and not cart.clerk_user_id:
            cart.clerk_user_id = clerk_user_id
            changed = True
        if guest_session_id and not cart.guest_session_id:
            cart.guest_session_id = guest_session_id
            changed = True
        if email and not cart.email:
            cart.email = email
            changed = True
        if changed:
            cart.save(update_fields=["clerk_user_id", "guest_session_id", "email"])
        return cart

    return Cart.objects.create(
        clerk_user_id=clerk_user_id or "",
        guest_session_id=guest_session_id or "",
        email=email or "",
    )


def _refresh_cart_totals(cart: Cart) -> None:
    """
    Recalculate cart-level totals if your model stores them.
    If Cart just has a `subtotal` property based on items, nothing to do.
    """
    # If you *do* have a numeric subtotal field, uncomment this block:
    #
    # total = Decimal("0.00")
    # for item in cart.items.all():
    #     total += (item.unit_price or Decimal("0.00")) * item.quantity
    # cart.subtotal_amount = total
    # cart.save(update_fields=["subtotal_amount"])
    #
    # For now we assume Cart.subtotal is computed from related items.
    pass


# ----------------- public API ----------------- #

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
    """
    Core logic for /tools/cart.add

    - Validates variant + size via ColorGroup/SizeStockPrice
    - Enforces stock (no overselling)
    - Either creates a new cart or reuses the existing one
    - Upserts CartItem (variantId + size as composite key per cart)
    """
    if quantity <= 0:
        raise ValidationError("quantity must be >= 1")

    size_norm = _normalize_size(size)
    variant, size_row = _get_variant_and_size(variant_id, size_norm)

    # Very simple stock check: don't allow adding more than we have in DB.
    max_available = int(size_row.quantity)
    if quantity > max_available and max_available > 0:
        raise ValidationError(f"Only {max_available} pieces left in size {size_norm}")
    if max_available <= 0:
        raise ValidationError(f"Size {size_norm} is currently out of stock")

    cart = _ensure_cart(cart, clerk_user_id, guest_session_id, email)

    # Try to find an existing line item for this variant+size
    item = (
        CartItem.objects
        .filter(cart=cart, variant_id=variant_id, size=size_norm)
        .first()
    )

    unit_price: Decimal = size_row.price  # always use DB price
    if item:
        new_qty = item.quantity + quantity
        if new_qty > max_available:
            raise ValidationError(f"Only {max_available} pieces left in size {size_norm}")
        item.quantity = new_qty
        item.unit_price = unit_price
        item.product_name = item.product_name or variant.product.name
        item.color_name = item.color_name or variant.color_name
        if not item.image:
            first_img = variant.images.first()
            item.image = first_img.image_name if first_img else ""
        item.save()
    else:
        first_img = variant.images.first()
        CartItem.objects.create(
            cart=cart,
            variant_id=variant_id,
            size=size_norm,
            quantity=quantity,
            unit_price=unit_price,
            product_name=variant.product.name,
            color_name=variant.color_name,
            image=first_img.image_name if first_img else "",
        )

    _refresh_cart_totals(cart)
    # Always return a fresh cart instance with items loaded
    return Cart.objects.prefetch_related("items").get(pk=cart.pk)


def update_item_quantity(
    *,
    cart: Cart,
    variant_id: str,
    size: str,
    quantity: int,
) -> Cart:
    """
    Core logic for /tools/cart.update

    - If quantity == 0, behaves like remove_item
    - Otherwise enforces stock against SizeStockPrice
    """
    if quantity < 0:
        raise ValidationError("quantity must be >= 0")

    size_norm = _normalize_size(size)

    # If we're reducing to zero, just call remove_item
    if quantity == 0:
        return remove_item(cart=cart, variant_id=variant_id, size=size_norm)

    # Validate variant + size
    _, size_row = _get_variant_and_size(variant_id, size_norm)
    max_available = int(size_row.quantity)
    if quantity > max_available and max_available > 0:
        raise ValidationError(f"Only {max_available} pieces left in size {size_norm}")
    if max_available <= 0:
        raise ValidationError(f"Size {size_norm} is currently out of stock")

    try:
        item = CartItem.objects.get(cart=cart, variant_id=variant_id, size=size_norm)
    except CartItem.DoesNotExist:
        raise ValidationError("Cart item not found")

    item.quantity = quantity
    item.unit_price = size_row.price
    item.save()

    _refresh_cart_totals(cart)
    return Cart.objects.prefetch_related("items").get(pk=cart.pk)


def remove_item(
    *,
    cart: Cart,
    variant_id: str,
    size: str,
) -> Cart:
    """
    Core logic for /tools/cart.remove
    """
    size_norm = _normalize_size(size)

    (
        CartItem.objects
        .filter(cart=cart, variant_id=variant_id, size=size_norm)
        .delete()
    )

    _refresh_cart_totals(cart)
    return Cart.objects.prefetch_related("items").get(pk=cart.pk)
