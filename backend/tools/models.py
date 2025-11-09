# tools/cart/models.py
from __future__ import annotations
import uuid
from decimal import Decimal, ROUND_HALF_UP
from django.db import models
from django.utils import timezone

DECIMAL_2 = Decimal("0.01")


class Cart(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Auth context — either Clerk user or guest session
    clerk_user_id = models.CharField(max_length=64, null=True, blank=True, db_index=True)
    guest_session_id = models.CharField(max_length=64, null=True, blank=True, db_index=True)
    email = models.EmailField(null=True, blank=True)

    # Soft status for future checkout stages
    status = models.CharField(max_length=24, default="open", db_index=True)

    created_at = models.DateTimeField(default=timezone.now, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "tools_cart"
        app_label = "tools"  # <<— tie these models to the installed 'tools' app

    @property
    def subtotal(self) -> Decimal:
        total = sum((item.total_price for item in self.items.all()), Decimal("0"))
        return total.quantize(DECIMAL_2, rounding=ROUND_HALF_UP)

    def __str__(self):
        who = self.clerk_user_id or self.guest_session_id or "anon"
        return f"Cart<{self.pk}>[{who}] {self.status}"


class CartItem(models.Model):
    SIZES = [(s, s) for s in ["XS", "S", "M", "L", "XL", "XXL"]]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    cart = models.ForeignKey(Cart, related_name="items", on_delete=models.CASCADE)

    # From catalog
    variant_id = models.CharField(max_length=32, db_index=True)
    size = models.CharField(max_length=8, choices=SIZES, db_index=True)

    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)

    # Cached UI helpers
    product_name = models.CharField(max_length=160, blank=True, default="")
    color_name = models.CharField(max_length=80, blank=True, default="")
    image = models.CharField(max_length=256, blank=True, default="")  # e.g., "/clothing-images/.."

    created_at = models.DateTimeField(default=timezone.now)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "tools_cart_item"
        unique_together = ("cart", "variant_id", "size")
        app_label = "tools"  # <<—

    @property
    def total_price(self) -> Decimal:
        return (self.unit_price * self.quantity).quantize(DECIMAL_2, rounding=ROUND_HALF_UP)

class CartEvent(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    # was: models.Forei...
    cart = models.ForeignKey(
        Cart, null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name="events",
    )
    action = models.CharField(max_length=32)  # add|update|remove
    idempotency_key = models.CharField(max_length=80, unique=True, db_index=True)
    request_json = models.JSONField(default=dict)
    response_json = models.JSONField(default=dict)
    created_at = models.DateTimeField(default=timezone.now)

    class Meta:
        db_table = "tools_cart_event"
        app_label = "tools"
