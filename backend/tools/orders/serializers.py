from rest_framework import serializers

class OrderItemOut(serializers.Serializer):
    variantId  = serializers.CharField()
    size       = serializers.CharField(allow_blank=True, required=False)
    qty        = serializers.IntegerField()
    unit_price = serializers.CharField()     # normalized string ("12.34")
    line_total = serializers.CharField()     # normalized string

class OrderOut(serializers.Serializer):
    order_id   = serializers.CharField()
    created_at = serializers.DateTimeField()
    status     = serializers.CharField()
    currency   = serializers.CharField()
    subtotal   = serializers.CharField()
    items      = OrderItemOut(many=True)

class OrderListOut(serializers.Serializer):
    total       = serializers.IntegerField()
    next_cursor = serializers.IntegerField(allow_null=True)
    items       = OrderOut(many=True)

class OrderListQuery(serializers.Serializer):
    # at least one must be provided
    userId          = serializers.CharField(required=False, allow_blank=True)
    email           = serializers.EmailField(required=False, allow_blank=True)
    guestSessionId  = serializers.CharField(required=False, allow_blank=True)
    cursor          = serializers.IntegerField(required=False, default=0, min_value=0)
    limit           = serializers.IntegerField(required=False, default=20, min_value=1, max_value=100)

    def validate(self, attrs):
        if not (attrs.get("userId") or attrs.get("email") or attrs.get("guestSessionId")):
            raise serializers.ValidationError("Provide one of userId, email, or guestSessionId.")
        return attrs

class OrderGetQuery(serializers.Serializer):
    orderId        = serializers.CharField(required=True)
    userId         = serializers.CharField(required=False, allow_blank=True)
    email          = serializers.EmailField(required=False, allow_blank=True)
    guestSessionId = serializers.CharField(required=False, allow_blank=True)
