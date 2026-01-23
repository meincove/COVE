"""
Product Creation Serializers

Handles creation of products for brand partners:
- ProductMasterGroup (main product)
- ColorGroup (color variants)
- SizeStockPrice (sizes & pricing)
"""

from rest_framework import serializers
from catalog.models import ProductMasterGroup, ColorGroup, SizeStockPrice, ProductImage, Brand


class SizeStockPriceCreateSerializer(serializers.ModelSerializer):
    """Create size/stock/price for a color variant"""
    
    # Map frontend field names to model field names
    size_label = serializers.CharField(source='size')
    stock_quantity = serializers.IntegerField(source='quantity')
    base_price = serializers.DecimalField(source='price', max_digits=10, decimal_places=2)
    
    class Meta:
        model = SizeStockPrice
        fields = ['size_label', 'stock_quantity', 'base_price']


class ProductImageCreateSerializer(serializers.ModelSerializer):
    """Add images to color variants"""
    
    # Map frontend image_url to model image_name (model only has image_name field)
    image_url = serializers.CharField(source='image_name')
    
    class Meta:
        model = ProductImage
        fields = ['image_url']  # Only image_name exists in model


class ColorGroupCreateSerializer(serializers.ModelSerializer):
    """Create color variant with sizes and images"""
    sizes = SizeStockPriceCreateSerializer(many=True)
    images = ProductImageCreateSerializer(many=True, required=False)
    
    # Map frontend `hex_code` to model `hex`
    hex_code = serializers.CharField(source='hex')
    
    class Meta:
        model = ColorGroup
        fields = ['color_name', 'hex_code', 'sizes', 'images']
    
    def create(self, validated_data):
        sizes_data = validated_data.pop('sizes')
        images_data = validated_data.pop('images', [])
        
        # Create color group
        color_group = ColorGroup.objects.create(**validated_data)
        
        # Create sizes
        for size_data in sizes_data:
            SizeStockPrice.objects.create(
                color_group=color_group,
                **size_data
            )
        
        # Create images
        for img_data in images_data:
            ProductImage.objects.create(
                color_group=color_group,
                **img_data
            )
        
        return color_group


class ProductMasterGroupCreateSerializer(serializers.ModelSerializer):
    """Create complete product with color variants"""
    colors = ColorGroupCreateSerializer(many=True)
    
    # Map frontend field names to model names using `source`
    product_name = serializers.CharField(source='name')
    product_type = serializers.CharField(source='type')
    
    class Meta:
        model = ProductMasterGroup
        fields = [
            'product_name',
            'product_type',
            'gender',
            'description',
            'colors'
        ]
    
    def create(self, validated_data):
        colors_data = validated_data.pop('colors')
        brand = self.context.get('brand')  # Pass brand from view
        
        # Auto-generate product_id
        import uuid
        product_id = f"PROD-{uuid.uuid4().hex[:8].upper()}"
        
        # Create product - map to model field names
        product = ProductMasterGroup.objects.create(
            product_id=product_id,
            brand_id=brand.brand_id,  # Map brand object to brand_id
            name=validated_data.get('name'),  # 'name' from source mapping
            type=validated_data.get('type'),  # 'type' from source mapping
            gender=validated_data.get('gender'),
            description=validated_data.get('description', ''),
            # Set defaults for required fields
            slug=f"{brand.brand_name.lower().replace(' ', '-')}-{validated_data.get('name', 'product').lower().replace(' ', '-')}-{product_id[-8:].lower()}",
            tier='standard',
            material='cotton',  # default
            fit='regular',  # default
            base_price='0.00'  # willbe set by sizes
        )
        
        # Create color variants
        for color_data in colors_data:
            sizes_data = color_data.pop('sizes')
            images_data = color_data.pop('images', [])
            
            # Auto-generate variant_id
            variant_id = f"VAR-{uuid.uuid4().hex[:8].upper()}"
            
            color_group = ColorGroup.objects.create(
                variant_id=variant_id,
                product=product,
                color_name=color_data.get('color_name'),
                hex=color_data.get('hex'),  # Already converted from hex_code by serializer
                slug=f"{product.slug}-{color_data.get('color_name', 'color').lower().replace(' ', '-')}"
            )
            
            # Create sizes
            for size_data in sizes_data:
                SizeStockPrice.objects.create(
                    variant=color_group,  # ForeignKey field is 'variant' not 'color_group'
                    **size_data
                )
            
            # Create images
            for img_data in images_data:
                ProductImage.objects.create(
                    variant=color_group,  # ForeignKey field is 'variant' not 'color_group'
                    **img_data
                )
        
        return product


class ProductListSerializer(serializers.ModelSerializer):
    """Lightweight product list for dashboard"""
    brand_name = serializers.CharField(source='brand_id', read_only=True)  # brand_id is a string field
    color_count = serializers.SerializerMethodField()
    
    # Map model fields name/type to frontend product_name/product_type
    product_name = serializers.CharField(source='name', read_only=True)
    product_type = serializers.CharField(source='type', read_only=True)
    
    class Meta:
        model = ProductMasterGroup
        fields = [
            'product_id',
            'slug',              # Add slug for navigation
            'product_name',
            'product_type',
            'gender',
            'brand_name',
            'color_count'
        ]
    
    def get_color_count(self, obj):
        return obj.color_variants.count()  # Use correct related_name
