from django.contrib import admin, messages
from .models import Order, OrderItem, OrderSummary, CheckoutCart

from payments.views import _send_order_receipt  # reuse our sender


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 0
    fields = ("product_id", "variant_id", "color", "size", "quantity", "price", "user_email")


@admin.action(description="Resend receipt email now (force)")
def resend_receipt(modeladmin, request, queryset):
    sent, failed = 0, 0
    for order in queryset:
        try:
            _send_order_receipt(order.id, resend=True)  # force re-send
            sent += 1
        except Exception:
            failed += 1
    if failed:
        messages.warning(request, f"Resent {sent} receipt(s); {failed} failed — check logs.")
    else:
        messages.success(request, f"Resent {sent} receipt(s).")


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    # Columns shown in the list view
    list_display = (
        "id",
        "user_or_guest",
        "user_email",
        "is_guest",
        "status",
        "inventory_decremented",
        "receipt_emailed",
        "total_price",
        "payment_intent_id",
        "clerk_user_id",        # 👈 added
        "guest_session_id",     # 👈 added
        "created_at",
    )
    list_filter = (
        "status",
        "is_guest",
        "inventory_decremented",
        "receipt_emailed",
        "created_at",
    )
    search_fields = (
        "payment_intent_id",
        "user_email",
        "clerk_user_id",
        "guest_session_id",
        "first_name",
        "last_name",
    )
    date_hierarchy = "created_at"
    readonly_fields = ("created_at",)
    ordering = ("-created_at",)
    inlines = [OrderItemInline]
    actions = [resend_receipt]

    def user_or_guest(self, obj):
        if obj.user:
            return obj.user
        name = f"{obj.first_name or ''} {obj.last_name or ''}".strip()
        return f"Guest{f' ({name})' if name else ''}"
    user_or_guest.short_description = "User"


@admin.register(OrderItem)
class OrderItemAdmin(admin.ModelAdmin):
    list_display = ("order", "product_id", "variant_id", "color", "size", "quantity", "price", "user_email")
    search_fields = ("product_id", "variant_id", "order__payment_intent_id", "user_email")
    list_filter = ("size", "color")


@admin.register(OrderSummary)
class OrderSummaryAdmin(admin.ModelAdmin):
    list_display = (
        "created_at",
        "user",
        "is_guest",
        "payment_intent_id",
        "product_id",
        "variant_id",
        "size",
        "color",
        "quantity",
        "price",
        "user_email",
    )
    search_fields = ("payment_intent_id", "product_id", "variant_id", "user_email")
    list_filter = ("is_guest", "size", "color")
    date_hierarchy = "created_at"
    ordering = ("-created_at",)


@admin.register(CheckoutCart)
class CheckoutCartAdmin(admin.ModelAdmin):
    list_display = (
        "created_at",
        "is_guest",
        "user",
        "user_email",
        "clerk_user_id",        # 👈 added (ensure the model has this field)
        "guest_session_id",     # 👈 added (ensure the model has this field)
        "checkout_session_id",
        "payment_intent_id",
        "product_id",
        "variant_id",
        "size",
        "color_name",
        "quantity",
        "price_per_unit",
        "total_price",
    )
    search_fields = (
        "payment_intent_id",
        "checkout_session_id",
        "user_email",
        "clerk_user_id",        # 👈 added
        "guest_session_id",     # 👈 added
        "product_id",
        "variant_id",
    )
    list_filter = ("is_guest", "size", "color_name", "tier", "type")
    readonly_fields = ("created_at",)
    ordering = ("-created_at",)
