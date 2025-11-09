# ==============================================
# tools/cart/admin.py (optional for quick inspection)
# ==============================================
from django.contrib import admin
from tools.models import Cart, CartItem, CartEvent

@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display = ("id", "status", "clerk_user_id", "guest_session_id", "created_at", "updated_at")
    search_fields = ("id", "clerk_user_id", "guest_session_id", "email")

@admin.register(CartItem)
class CartItemAdmin(admin.ModelAdmin):
    list_display = ("id", "cart", "variant_id", "size", "quantity", "unit_price")
    search_fields = ("variant_id", "size")

@admin.register(CartEvent)
class CartEventAdmin(admin.ModelAdmin):
    list_display = ("id", "cart", "action", "idempotency_key", "created_at")
    search_fields = ("idempotency_key", "action")
