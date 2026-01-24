"""
Product Management API Views

REST endpoints for brand partners to manage their products.

Endpoints:
- POST   /api/brands/{brand_id}/products/        → Create product
- GET    /api/brands/{brand_id}/products/        → List brand's products
- GET    /api/brands/{brand_id}/products/{id}/   → View product details
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings
from catalog.models import Brand, ProductMasterGroup
from catalog.serializers_product import (
    ProductMasterGroupCreateSerializer,
    ProductListSerializer
)


class BrandProductListCreateView(APIView):
    """
    GET  /api/brands/{brand_id}/products/
    List all products for a brand
    
    POST /api/brands/{brand_id}/products/
    Create new product with color variants
    
    Request body example:
    {
        "product_name": "Premium Cotton T-Shirt",
        "product_type": "T-Shirt",
        "gender": "unisex",
        "description": "Soft, sustainable cotton tee",
        "colors": [
            {
                "color_name": "Black",
                "hex_code": "#000000",
                "sizes": [
                    {"size_label": "S", "stock_quantity": 50, "base_price": "29.99"},
                    {"size_label": "M", "stock_quantity": 100, "base_price": "29.99"},
                    {"size_label": "L", "stock_quantity": 75, "base_price": "29.99"}
                ],
                "images": [
                    {"image_url": "https://example.com/black-front.jpg", "display_order": 1, "is_primary": true},
                    {"image_url": "https://example.com/black-back.jpg", "display_order": 2, "is_primary": false}
                ]
            },
            {
                "color_name": "White",
                "hex_code": "#FFFFFF",
                "sizes": [
                    {"size_label": "S", "stock_quantity": 60, "base_price": "29.99"},
                    {"size_label": "M", "stock_quantity": 120, "base_price": "29.99"}
                ],
                "images": [
                    {"image_url": "https://example.com/white-front.jpg", "display_order": 1, "is_primary": true}
                ]
            }
        ]
    }
    """
    
    def get(self, request, brand_id):
        """List brand's products"""
        try:
            brand = Brand.objects.get(brand_id=brand_id)
        except Brand.DoesNotExist:
            return Response(
                {'error': 'Brand not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        status_filter = request.query_params.get('status', 'active') # Default to active
        products = ProductMasterGroup.objects.filter(
            brand_id=brand.brand_id,
            status=status_filter
        ).order_by('-product_id')
        
        serializer = ProductListSerializer(products, many=True)
        
        return Response({
            'count': products.count(),
            'products': serializer.data
        })
    
    def post(self, request, brand_id):
        """Create new product"""
        try:
            brand = Brand.objects.get(brand_id=brand_id)
        except Brand.DoesNotExist:
            return Response(
                {'error': 'Brand not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        serializer = ProductMasterGroupCreateSerializer(
            data=request.data,
            context={'brand': brand}
        )
        
        if serializer.is_valid():
            product = serializer.save()
            
            return Response({
                'product_id': product.product_id,
                'product_name': product.name,  # Model uses 'name' not 'product_name'
                'message': 'Product created successfully',
                'colors_created': product.color_variants.count()  # Related name is 'color_variants'
            }, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class BrandProductDetailView(APIView):
    """
    GET /api/brands/{brand_id}/products/{product_id}/
    
    View detailed product information
    """
    
    def get(self, request, brand_id, product_id):
        try:
            brand = Brand.objects.get(brand_id=brand_id)
            # Verify the product belongs to this brand
            product = ProductMasterGroup.objects.get(
                product_id=product_id,
                brand_id=brand.brand_id  # FIX: Use brand_id string, not brand object
            )
        except Brand.DoesNotExist:
            return Response(
                {'error': 'Brand not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except ProductMasterGroup.DoesNotExist:
            return Response(
                {'error': 'Product not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Return full product data with colors and sizes
        data = {
            'product_id': product.product_id,
            'product_name': product.name,  # Use 'name'
            'affiliate_url': product.affiliate_url,
            'product_type': product.type,  # Use 'type'
            'gender': product.gender,
            'description': product.description,
            'colors': [
                {
                    'variant_id': color.variant_id,  # Use 'variant_id'
                    'color_name': color.color_name,
                    'hex_code': color.hex,  # Model uses 'hex'
                    'sizes': [
                        {
                            'size_label': size.size,  # Model uses 'size'
                            'stock_quantity': size.quantity,  # Model uses 'quantity'
                            'base_price': str(size.price)
                        }
                        for size in color.sizes.all()
                    ],
                    'images': [
                        {
                            'image_url': (
                                img.image_name if img.image_name and img.image_name.startswith('http') 
                                else request.build_absolute_uri(settings.MEDIA_URL + img.image_name) if img.image_name 
                                else None
                            ),
                            'display_order': idx,
                            'is_primary': idx == 0
                        }
                        for idx, img in enumerate(color.images.all().order_by('id'))
                    ]
                }
                for color in product.color_variants.all()  # Related name is 'color_variants'
            ]
        }

        # DEBUG LOGGING
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"PRODUCT DETAIL FETCH: {product_id}")
        logger.info(f"COLORS FOUND (Count): {product.color_variants.count()}")
        logger.info(f"COLORS DATA: {data['colors']}")
        
        return Response(data)

        return Response(data)

    def put(self, request, brand_id, product_id):
        """Update product and its variants"""
        try:
            brand = Brand.objects.get(brand_id=brand_id)
            product = ProductMasterGroup.objects.get(product_id=product_id, brand_id=brand.brand_id)
        except (Brand.DoesNotExist, ProductMasterGroup.DoesNotExist):
            return Response(status=status.HTTP_404_NOT_FOUND)

        # 1. Update Top-Level Fields
        product.name = request.data.get('product_name', product.name)
        product.type = request.data.get('product_type', product.type)
        product.gender = request.data.get('gender', product.gender)
        product.description = request.data.get('description', product.description)
        
        # Update AI/Style fields
        product.material = request.data.get('material', product.material)
        product.fit = request.data.get('fit', product.fit)
        product.style_tags = request.data.get('style_tags', product.style_tags)
        product.season = request.data.get('season', product.season)
        product.use_cases = request.data.get('use_cases', product.use_cases)
        product.formality_score = request.data.get('formality_score', product.formality_score)
        product.versatility = request.data.get('versatility', product.versatility)
        product.pattern = request.data.get('pattern', product.pattern)
        product.statement_piece = request.data.get('statement_piece', product.statement_piece)
        product.affiliate_url = request.data.get('affiliate_url', product.affiliate_url)
        product.color_family = request.data.get('color_family', product.color_family)
        product.save()

        # 2. Update Nested Colors & Sizes (if provided)
        # Note: This is a "sync" operation. 
        # Strategy: Iterate provided colors. If ID exists, update. If new, create.
        # Ideally, we should also delete colors ensuring they aren't in the request? 
        # User requested "full control". Let's process the lists.
        
        incoming_colors = request.data.get('colors', [])
        if incoming_colors:
            # We will track processed IDs to potentially delete removal (optional, safe for now to just upset)
            # For this MVP step, let's focus on Update/Create.
            
            import uuid
            from .models import ColorGroup, SizeStockPrice, ProductImage

            for color_data in incoming_colors:
                variant_id = color_data.get('variant_id')
                
                # UPDATE existing color
                if variant_id:
                    try:
                        color_group = ColorGroup.objects.get(variant_id=variant_id, product=product)
                        color_group.color_name = color_data.get('color_name', color_group.color_name)
                        color_group.hex = color_data.get('hex_code', color_group.hex)
                        color_group.save()
                    except ColorGroup.DoesNotExist:
                        continue # Skip invalid IDs
                
                # CREATE new color
                else:
                    variant_id = f"VAR-{uuid.uuid4().hex[:8].upper()}"
                    color_group = ColorGroup.objects.create(
                        variant_id=variant_id,
                        product=product,
                        color_name=color_data.get('color_name', 'New Color'),
                        hex=color_data.get('hex_code', '#000000'),
                        slug=f"{product.slug}-{color_data.get('color_name', 'color').lower().replace(' ', '-')}-{uuid.uuid4().hex[:4]}"
                    )

                # Process Sizes for this Color
                sizes_data = color_data.get('sizes', [])
                if sizes_data:
                    # Clear existing sizes to strictly match the new list (safest way to handle size removal/changes)
                    # Or smarter: update existing? 
                    # Re-creating sizes is acceptable for this scale.
                    SizeStockPrice.objects.filter(variant=color_group).delete()
                    
                    price_list = []
                    for size_data in sizes_data:
                         from decimal import Decimal
                         price_val = Decimal(str(size_data.get('base_price') or '0.00'))
                         ssp = SizeStockPrice.objects.create(
                            variant=color_group,
                            size=size_data.get('size_label'),  # Model uses 'size'
                            quantity=size_data.get('stock_quantity', 0),  # Model uses 'quantity'
                            price=price_val  # Model uses 'price'
                        )
                         if ssp.price > 0: price_list.append(ssp.price)
                    
                    # Update base price if cheaper found
                    if price_list:
                        min_p = min(price_list)
                        if product.base_price == 0 or min_p < product.base_price:
                            product.base_price = min_p
                            product.save()

                # Process Images for this Color
                images_data = color_data.get('images', [])
                if images_data:
                    # Similar strategy: Wipe and recreate is easiest for order syncing
                    ProductImage.objects.filter(variant=color_group).delete()
                    for img_data in images_data:
                        ProductImage.objects.create(
                            variant=color_group,
                            image_name=img_data.get('image_url') or img_data.get('image_name')  # Handle both keys
                        )

        return Response({'message': 'Product updated successfully'})

    def delete(self, request, brand_id, product_id):
        """Soft delete product (move to trash)"""
        from django.utils import timezone
        
        updated_count = ProductMasterGroup.objects.filter(
            product_id=product_id,
            brand_id=brand_id  # FIXED: Model has brand_id CharField, not ForeignKey
        ).update(
            status='trashed',
            trashed_at=timezone.now()
        )
        
        if updated_count == 0:
             return Response(status=status.HTTP_404_NOT_FOUND)
             
        return Response(status=status.HTTP_204_NO_CONTENT)


class ProductRestoreView(APIView):
    """
    POST /api/brands/{brand_id}/products/{product_id}/restore/
    Restore product from trash
    """
    def post(self, request, brand_id, product_id):
        # Direct update to avoid FieldError
        updated_count = ProductMasterGroup.objects.filter(
            product_id=product_id,
            brand_id=brand_id,
            status='trashed'
        ).update(
            status='active',
            trashed_at=None
        )
        
        if updated_count == 0:
             # Either not found or not trashed
             return Response(status=status.HTTP_404_NOT_FOUND)
             
        return Response({'message': 'Product restored'})

class ProductPermanentDeleteView(APIView):
    """
    DELETE /api/brands/{brand_id}/products/{product_id}/permanent/
    Permanently delete product
    """
    def delete(self, request, brand_id, product_id):
        # Hard delete
        deleted_count, _ = ProductMasterGroup.objects.filter(
            product_id=product_id,
            brand_id=brand_id
        ).delete()
        
        if deleted_count == 0:
            return Response(status=status.HTTP_404_NOT_FOUND)
            
        return Response(status=status.HTTP_204_NO_CONTENT)
