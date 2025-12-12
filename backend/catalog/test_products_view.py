from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from catalog.models import Product

@require_http_methods(["POST"])
def create_test_products(request):
    """Create curated test products for outfit builder testing."""
    
    test_products = [
        # Blazers
        {"slug": "navy-wool-blazer", "title": "Classic Navy Wool Blazer", "description": "Professional navy wool blazer for business", "category": "blazer", "brand": "LUXLN", "color": "Navy", "price_numeric": 199.00, "available_sizes": "S,M,L,XL", "image_url": "/images/blazer1.jpg", "variant_id": "BLZ-001"},
        {"slug": "charcoal-suit-jacket", "title": "Charcoal Grey Suit Jacket", "description": "Modern charcoal suit jacket", "category": "blazer", "brand": "CRBSC", "color": "Charcoal", "price_numeric": 249.00, "available_sizes": "S,M,L,XL", "image_url": "/images/blazer2.jpg", "variant_id": "BLZ-002"},
        {"slug": "tan-cotton-blazer", "title": "Tan Cotton Blazer", "description": "Smart casual tan blazer", "category": "blazer", "brand": "FRSPT", "color": "Tan", "price_numeric": 169.00, "available_sizes": "S,M,L,XL", "image_url": "/images/blazer3.jpg", "variant_id": "BLZ-003"},
        
        # Shirts
        {"slug": "white-oxford-shirt", "title": "White Oxford Shirt", "description": "Essential white oxford shirt", "category": "shirt", "brand": "LUXLN", "color": "White", "price_numeric": 79.00, "available_sizes": "S,M,L,XL", "image_url": "/images/shirt1.jpg", "variant_id": "SHT-001"},
        {"slug": "light-blue-shirt", "title": "Light Blue Dress Shirt", "description": "Professional light blue shirt", "category": "shirt", "brand": "CRBSC", "color": "Light Blue", "price_numeric": 69.00, "available_sizes": "S,M,L,XL", "image_url": "/images/shirt2.jpg", "variant_id": "SHT-002"},
        {"slug": "pink-slim-shirt", "title": "Pink Slim Fit Shirt", "description": "Modern pink slim fit shirt", "category": "shirt", "brand": "FRSPT", "color": "Pink", "price_numeric": 75.00, "available_sizes": "S,M,L,XL", "image_url": "/images/shirt3.jpg", "variant_id": "SHT-003"},
       
        # Pants
        {"slug": "navy-chinos", "title": "Navy Blue Chinos", "description": "Classic navy chinos", "category": "pants", "brand": "CRBSC", "color": "Navy", "price_numeric": 89.00, "available_sizes": "28,30,32,34,36", "image_url": "/images/pants1.jpg", "variant_id": "PNT-001"},
        {"slug": "khaki-chinos", "title": "Khaki Chinos", "description": "Versatile khaki chinos", "category": "pants", "brand": "FRSPT", "color": "Khaki", "price_numeric": 79.00, "available_sizes": "28,30,32,34,36", "image_url": "/images/pants2.jpg", "variant_id": "PNT-002"},
        {"slug": "charcoal-pants", "title": "Charcoal Dress Pants", "description": "Professional charcoal dress pants", "category": "pants", "brand": "LUXLN", "color": "Charcoal", "price_numeric": 99.00, "available_sizes": "28,30,32,34,36", "image_url": "/images/pants3.jpg", "variant_id": "PNT-003"},
        
        # Shoes
        {"slug": "black-oxfords", "title": "Black Oxford Shoes", "description": "Classic black oxford shoes", "category": "shoes", "brand": "LUXLN", "color": "Black", "price_numeric": 149.00, "available_sizes": "7,8,9,10,11,12", "image_url": "/images/shoes1.jpg", "variant_id": "SHO-001"},
        {"slug": "brown-derbys", "title": "Brown Derby Shoes", "description": "Versatile brown leather shoes", "category": "shoes", "brand": "CRBSC", "color": "Brown", "price_numeric": 139.00, "available_sizes": "7,8,9,10,11,12", "image_url": "/images/shoes2.jpg", "variant_id": "SHO-002"},
        {"slug": "tan-loafers", "title": "Tan Suede Loafers", "description": "Smart casual tan loafers", "category": "shoes", "brand": "FRSPT", "color": "Tan", "price_numeric": 129.00, "available_sizes": "7,8,9,10,11,12", "image_url": "/images/shoes3.jpg", "variant_id": "SHO-003"},
    ]
    
    created = 0
    updated = 0
    
    for data in test_products:
        product, was_created = Product.objects.update_or_create(
            slug=data["slug"],
            defaults=data
        )
        if was_created:
            created += 1
        else:
            updated += 1
    
    return JsonResponse({
        "success": True,
        "created": created,
        "updated": updated,
        "total": len(test_products),
        "message": f"✅ Ready to test! {created} new products, {updated} updated.",
        "outfits": [
            "Business: Navy Blazer + White Shirt + Charcoal Pants + Black Shoes (€516)",
            "Smart Casual: Tan Blazer + Light Blue + Navy Chinos + Brown Shoes (€466)",
            "Date Night: Charcoal Jacket + Pink Shirt + Khaki Chinos + Tan Loafers (€532)"
        ]
    })
