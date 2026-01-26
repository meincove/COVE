from rest_framework import serializers
from .models import Brand, ProductMasterGroup, ColorGroup, ProductImage, SizeStockPrice

class BrandSerializer(serializers.ModelSerializer):
    """Serializer for Brand model"""
    
    class Meta:
        model = Brand
        fields = [
            'brand_id',
            'brand_name', 
            'slug',
            'logo_url',
            'theme_colors',
            'is_active',
            'description',
            'created_at'
        ]
        read_only_fields = ['created_at']


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

    brand_name = serializers.SerializerMethodField()

    class Meta:
        model = ProductMasterGroup
        fields = (
            "product_id",
            "name",
            "slug",
            "brand_id",
            "brand_name",  # NEW: Human readable brand name
            "tier",
            "type",
            "material",
            "gender",
            "fit",
            "description",
            "base_price",
            "style_tags",
            "pattern",
            "season",
            "use_cases",
            "formality_score",
            "versatility",
            "statement_piece",
            "color_family",
            "in_stock",
            "featured",
            "affiliate_url",
            "color_variants",
        )

    def get_brand_name(self, obj):
        # Optimized lookup using context map (avoiding N+1 queries)
        brand_map = self.context.get('brand_map', {})
        return brand_map.get(obj.brand_id, obj.brand_id)
