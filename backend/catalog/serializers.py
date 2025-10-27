from rest_framework import serializers
from .models import ProductMasterGroup, ColorGroup, ProductImage, SizeStockPrice

class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ("image_name",)

class SizeStockPriceSerializer(serializers.ModelSerializer):
    class Meta:
        model = SizeStockPrice
        fields = ("size", "quantity", "price")

class ColorGroupSerializer(serializers.ModelSerializer):
    images = ProductImageSerializer(many=True, read_only=True)  # related_name='images'
    sizes = SizeStockPriceSerializer(many=True, read_only=True)  # related_name='sizes'

    class Meta:
        model = ColorGroup
        fields = ("variant_id", "slug", "color_name", "hex", "images", "sizes")

class ProductSerializer(serializers.ModelSerializer):
    color_variants = ColorGroupSerializer(many=True, read_only=True)  # related_name='color_variants'

    class Meta:
        model = ProductMasterGroup
        fields = (
            "product_id",
            "name",
            "slug",
            "tier",
            "type",
            "material",
            "gender",
            "fit",
            "description",
            "base_price",
            "color_variants",
        )
