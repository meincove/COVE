from django.db import models
from django.contrib.auth import get_user_model

User = get_user_model()


class Order(models.Model):
    # --- NEW: lifecycle constants/choices ---
    STATUS_PENDING = "PENDING"
    STATUS_PAID = "PAID"
    STATUS_FAILED = "FAILED"
    STATUS_REFUNDED = "REFUNDED"

    STATUS_CHOICES = [
        (STATUS_PENDING, "Pending"),
        (STATUS_PAID, "Paid"),
        (STATUS_FAILED, "Failed"),
        (STATUS_REFUNDED, "Refunded"),
    ]

    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    is_guest = models.BooleanField(default=False)
    total_price = models.DecimalField(max_digits=8, decimal_places=2)
    payment_intent_id = models.CharField(max_length=255, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    # Existing fields
    clerk_user_id = models.CharField(max_length=255, blank=True, null=True)
    guest_session_id = models.CharField(max_length=255, blank=True, null=True)
    user_email = models.EmailField(null=True, blank=True)
    first_name = models.CharField(max_length=100, blank=True, null=True)
    last_name = models.CharField(max_length=100, blank=True, null=True)

    # --- NEW: Shipping info ---
    shipping_name = models.CharField(max_length=255, blank=True, null=True)
    shipping_address_line1 = models.CharField(max_length=255, blank=True, null=True)
    shipping_address_line2 = models.CharField(max_length=255, blank=True, null=True)
    shipping_city = models.CharField(max_length=100, blank=True, null=True)
    shipping_state = models.CharField(max_length=100, blank=True, null=True)
    shipping_postal_code = models.CharField(max_length=20, blank=True, null=True)
    shipping_country = models.CharField(max_length=2, blank=True, null=True)  # ISO code

    # --- NEW: Pricing breakdown ---
    shipping_cost = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    tax_amount = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    currency = models.CharField(max_length=10, default="EUR")
    
    # --- NEW: Stripe line-items snapshot for UI (tax per line, etc.) ---
    items_json = models.JSONField(null=True, blank=True)   

    # Idempotency flag for stock
    inventory_decremented = models.BooleanField(default=False)

    # --- NEW: lifecycle status ---
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default=STATUS_PENDING)

    # NEW: send-once receipt flag
    receipt_emailed = models.BooleanField(default=False)

    def __str__(self):
        return f"Order #{self.id} - €{self.total_price} - {self.payment_intent_id}"

    def total_with_shipping_and_tax(self):
        return self.total_price + self.shipping_cost + self.tax_amount


class OrderItem(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    product_id = models.CharField(max_length=255)     # from catalogData.json > top-level id
    variant_id = models.CharField(max_length=255)     # e.g., CUHD001
    size = models.CharField(max_length=10)            # S, M, L, XL
    color = models.CharField(max_length=30)           # e.g., black, green
    quantity = models.PositiveIntegerField()
    price = models.DecimalField(max_digits=6, decimal_places=2)
    user_email = models.EmailField(null=True, blank=True)

    def __str__(self):
        return f"{self.quantity}x {self.variant_id} ({self.size}, {self.color})"


class OrderSummary(models.Model):
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    is_guest = models.BooleanField(default=False)
    payment_intent_id = models.CharField(max_length=255)
    product_id = models.CharField(max_length=255)

    user_email = models.EmailField(null=True, blank=True)
    variant_id = models.CharField(max_length=255)
    color = models.CharField(max_length=100)
    size = models.CharField(max_length=20)
    quantity = models.PositiveIntegerField()
    price = models.DecimalField(max_digits=6, decimal_places=2)
    created_at = models.DateTimeField()

    # New fields
    clerk_user_id = models.CharField(max_length=255, blank=True, null=True)
    guest_session_id = models.CharField(max_length=255, blank=True, null=True)
    first_name = models.CharField(max_length=100, blank=True, null=True)
    last_name = models.CharField(max_length=100, blank=True, null=True)

    def __str__(self):
        return f"{self.user or 'Guest'} - {self.product_id} - {self.variant_id}"


class CheckoutCart(models.Model):
    is_guest = models.BooleanField(default=False)
    # user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    user = models.PositiveIntegerField(blank=True, null=True)
    clerk_user_id = models.CharField(max_length=255, blank=True, null=True, db_index=True)
    guest_session_id = models.CharField(max_length=255, blank=True, null=True, db_index=True)

    # ⚠️ Now nullable: you won’t know PaymentIntent until the Checkout completes
    payment_intent_id = models.CharField(max_length=255, blank=True, null=True, db_index=True)

    # ✅ NEW: link snapshots to Stripe Checkout Session (cs_...)
    checkout_session_id = models.CharField(
        max_length=255, blank=True, null=True, db_index=True,
        help_text="Stripe Checkout Session ID (cs_...)"
    )

    # Product and Variant Info
    variant_id = models.CharField(max_length=255, db_index=True)
    product_id = models.CharField(max_length=255)
    name = models.CharField(max_length=255)     # Name of the clothing item
    type = models.CharField(max_length=100)     # Hoodie, T-Shirt, etc.
    tier = models.CharField(max_length=50)      # Casual, Originals, Designer

    # User Info
    first_name = models.CharField(max_length=100, blank=True, null=True)
    last_name = models.CharField(max_length=100, blank=True, null=True)
    user_email = models.EmailField(null=True, blank=True, db_index=True)

    # Variant-specific Info
    size = models.CharField(max_length=10, db_index=True)
    color_name = models.CharField(max_length=50)  # Human-readable color name
    quantity = models.PositiveIntegerField()
    price_per_unit = models.DecimalField(max_digits=6, decimal_places=2)
    total_price = models.DecimalField(max_digits=8, decimal_places=2)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=["payment_intent_id"]),
            models.Index(fields=["checkout_session_id"]),
            models.Index(fields=["clerk_user_id"]),
            models.Index(fields=["guest_session_id"]),
            models.Index(fields=["variant_id", "size"]),
            models.Index(fields=["created_at"]),
        ]

    def __str__(self):
        who = self.first_name or "Guest"
        return f"{who} - {self.variant_id} x{self.quantity} - €{self.total_price}"
