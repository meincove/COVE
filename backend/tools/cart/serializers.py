# tools/cart/serializers.py
from rest_framework import serializers
from tools.models import Cart, CartItem

class CartItemSerializer(serializers.ModelSerializer):
    total_price = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = [
            "id", "variant_id", "size", "quantity", "unit_price",
            "total_price", "product_name", "color_name", "image",
        ]

    def get_total_price(self, obj):
        return f"{obj.total_price:.2f}"

class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    subtotal = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = [
            "id", "status", "clerk_user_id", "guest_session_id", "email",
            "items", "subtotal", "created_at", "updated_at",
        ]

    def get_subtotal(self, obj):
        return f"{obj.subtotal:.2f}"
    
# tools/cart/serializers.py (append)
class CartAddIn(serializers.Serializer):
    cartId = serializers.CharField(required=False, allow_blank=True)
    variantId = serializers.CharField(required=True)
    size = serializers.CharField(required=True, max_length=8)
    quantity = serializers.IntegerField(required=False, min_value=1, default=1)
    clerkUserId = serializers.CharField(required=False, allow_blank=True)
    guestSessionId = serializers.CharField(required=False, allow_blank=True)
    email = serializers.EmailField(required=False, allow_blank=True)

class CartUpdateIn(serializers.Serializer):
    cartId = serializers.CharField(required=True)
    variantId = serializers.CharField(required=True)
    size = serializers.CharField(required=True, max_length=8)
    quantity = serializers.IntegerField(required=True, min_value=0)

class CartRemoveIn(serializers.Serializer):
    cartId = serializers.CharField(required=True)
    variantId = serializers.CharField(required=True)
    size = serializers.CharField(required=True, max_length=8)
    
