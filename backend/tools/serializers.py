# backend/tools/serializers.py
from rest_framework import serializers

class SearchFilters(serializers.Serializer):
    q         = serializers.CharField(required=False, allow_blank=True)
    tier      = serializers.CharField(required=False, allow_blank=True)
    type      = serializers.CharField(required=False, allow_blank=True)
    color     = serializers.CharField(required=False, allow_blank=True)
    size      = serializers.CharField(required=False, allow_blank=True)
    price_min = serializers.DecimalField(required=False, max_digits=10, decimal_places=2)
    price_max = serializers.DecimalField(required=False, max_digits=10, decimal_places=2)
    cursor    = serializers.IntegerField(required=False, default=0, min_value=0)
    limit     = serializers.IntegerField(required=False, default=12, min_value=1, max_value=100)

class DetailsQuery(serializers.Serializer):
    variantId = serializers.CharField(required=True, max_length=64)

class VariantOut(serializers.Serializer):
    variantId  = serializers.CharField()
    color_name = serializers.CharField()
    color_hex  = serializers.CharField()
    images     = serializers.ListField(child=serializers.CharField())
    price      = serializers.DecimalField(max_digits=10, decimal_places=2)
    stock      = serializers.IntegerField()

class ProductOut(serializers.Serializer):
    product_id = serializers.CharField()
    slug       = serializers.CharField()
    name       = serializers.CharField()
    tier       = serializers.CharField()
    type       = serializers.CharField()
    material   = serializers.CharField(allow_blank=True)
    gender     = serializers.CharField(allow_blank=True)
    base_price = serializers.DecimalField(max_digits=10, decimal_places=2)
    variants   = VariantOut(many=True)

class SearchResult(serializers.Serializer):
    total       = serializers.IntegerField()
    next_cursor = serializers.IntegerField(allow_null=True)
    items       = ProductOut(many=True)

class DetailsOut(serializers.Serializer):
    product  = ProductOut()
    selected = VariantOut()
