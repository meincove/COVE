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
            'material',
            'fit',
            'style_tags',
            'season',
            'use_cases',
            'formality_score',
            'versatility',
            'pattern',
            'statement_piece',
            'color_family',
            'colors',
            'affiliate_url'
        ]
    
    def create(self, validated_data):
        colors_data = validated_data.pop('colors')
        affiliate_url = validated_data.pop('affiliate_url', None) # Pop to avoid unexpected kwarg if not in model create (though it IS in model)
        # Actually it is in model, so we can leave it. But popping is safer if we want to pass it explicitly.
        # Re-adding it to filtered dict if needed or just use cleaned data.
        
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
            material=validated_data.get('material', 'cotton'),
            fit=validated_data.get('fit', 'regular'),
            style_tags=validated_data.get('style_tags', []),
            season=validated_data.get('season', []),
            use_cases=validated_data.get('use_cases', []),
            formality_score=validated_data.get('formality_score', 5),
            versatility=validated_data.get('versatility', 5),
            pattern=validated_data.get('pattern', 'solid'),
            statement_piece=validated_data.get('statement_piece', False),
            color_family=validated_data.get('color_family', 'neutral'),
            # Set defaults for required fields
            slug=f"{brand.brand_name.lower().replace(' ', '-')}-{validated_data.get('name', 'product').lower().replace(' ', '-')}-{product_id[-8:].lower()}",
            tier='standard',
            base_price='0.00',  # Temporary default, will update below
            affiliate_url=affiliate_url  # Add affiliate_url
        )
        
        all_prices = []
        
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
                ssp = SizeStockPrice.objects.create(
                    variant=color_group,  # ForeignKey field is 'variant' not 'color_group'
                    **size_data
                )
                if ssp.price > 0:
                    all_prices.append(ssp.price)
            
            # Create images
            for img_data in images_data:
                # Ensure we only pass valid model fields
                # img_data contains 'image_name' from source mapping
                ProductImage.objects.create(
                    variant=color_group, 
                    image_name=img_data.get('image_name')
                )
        
        # Update product base_price from minimum size price
        if all_prices:
            product.base_price = min(all_prices)
            product.save()
        
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
    
    def get_default_variant_id(self, obj):
        first_variant = obj.color_variants.first()
        return first_variant.variant_id if first_variant else None

    default_variant_id = serializers.SerializerMethodField()

    class Meta:
        model = ProductMasterGroup
        fields = [
            'product_id',
            'slug',              # Add slug for navigation
            'product_name',
            'product_type',
            'gender',
            'brand_name',
            'color_count',
            'default_variant_id',
            'affiliate_url',  # For dashboard badge
            'colors'         # For dashboard images
        ]
    
    # We need to explicitly define colors to use a serializer that includes images
    colors = ColorGroupCreateSerializer(source='color_variants', many=True, read_only=True)
