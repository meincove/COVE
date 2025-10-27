from rest_framework import serializers
from .models import Order, OrderItem


class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = (
            "id",
            "product_id",
            "variant_id",
            "size",
            "color",
            "quantity",
            "price",
            "user_email",
        )


class OrderSerializer(serializers.ModelSerializer):
    # uses related_name="items" on OrderItem(order=ForeignKey)
    items = OrderItemSerializer(many=True, read_only=True)
    total_with_shipping_and_tax = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = (
            # core
            "id",
            "status",
            "payment_intent_id",
            "created_at",
            "currency",

            # user/session
            "clerk_user_id",
            "guest_session_id",
            "user_email",
            "first_name",
            "last_name",
            "is_guest",

            # pricing
            "total_price",
            "shipping_cost",
            "tax_amount",
            "total_with_shipping_and_tax",

            # flags
            "inventory_decremented",
            "receipt_emailed",

            # shipping address
            "shipping_name",
            "shipping_address_line1",
            "shipping_address_line2",
            "shipping_city",
            "shipping_state",
            "shipping_postal_code",
            "shipping_country",

            # nested items
            "items",
            
            # NEW
            "items_json",
        )
        read_only_fields = (
            "id",
            "created_at",
            "inventory_decremented",
            "receipt_emailed",
            "total_with_shipping_and_tax",
            "items_json",
        )

    def get_total_with_shipping_and_tax(self, obj: Order):
        return obj.total_with_shipping_and_tax()
