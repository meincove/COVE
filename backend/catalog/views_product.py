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
        
        products = ProductMasterGroup.objects.filter(brand_id=brand.brand_id).order_by('-product_id')  # Use brand_id field
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
            product = ProductMasterGroup.objects.get(
                product_id=product_id,
                brand=brand
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
                            'size_label': size.size_label,
                            'stock_quantity': size.stock_quantity,
                            'base_price': str(size.base_price)
                        }
                        for size in color.sizes.all()
                    ],
                    'images': [
                        {
                            'image_url': img.image_url,
                            'display_order': img.display_order,
                            'is_primary': img.is_primary
                        }
                        for img in color.images.all().order_by('display_order')
                    ]
                }
                for color in product.color_variants.all()  # Related name is 'color_variants'
            ]
        }
        
        return Response(data)
