from rest_framework import serializers

class CheckoutItemSerializer(serializers.Serializer):
    variantId = serializers.CharField(max_length=50)
    size = serializers.CharField(max_length=6)            # e.g., S, M, L, XL
    quantity = serializers.IntegerField(min_value=1, max_value=10)

class CreateCheckoutSessionSerializer(serializers.Serializer):
    items = CheckoutItemSerializer(many=True, allow_empty=False)
    clerkUserId = serializers.CharField(max_length=255, required=False, allow_blank=True, allow_null=True)
    guestSessionId = serializers.CharField(max_length=255, required=False, allow_blank=True, allow_null=True)
    customer_email = serializers.EmailField(required=False, allow_null=True)

    def validate(self, data):
        # Require at least one of clerkUserId or guestSessionId
        if not (data.get("clerkUserId") or data.get("guestSessionId")):
            raise serializers.ValidationError("Provide clerkUserId or guestSessionId.")
        # Hard cap to prevent abuse
        if len(data["items"]) > 50:
            raise serializers.ValidationError("Too many items in one checkout.")
        # Normalize size to uppercase
        for it in data["items"]:
            it["size"] = (it["size"] or "").upper()
        return data
