from rest_framework.generics import ListAPIView, RetrieveAPIView
from rest_framework import filters
from drf_spectacular.utils import extend_schema, OpenApiParameter
from .models import Brand, ProductMasterGroup, ColorGroup
from .serializers import BrandSerializer, ProductSerializer, ColorGroupSerializer
from .pagination import StandardResultsSetPagination


def product_queryset():
    return (
        ProductMasterGroup.objects.all()
        .prefetch_related(
            "color_variants__images",
            "color_variants__sizes",
        )
        .order_by("name")
    )


@extend_schema(
    tags=["Catalog"],
    summary="List products",
    description=(
        "Returns paginated products. "
        "Filter by tier, type, gender, color (color slug), size, and price range. "
        "Use ?search=term to fuzzy search name, description, brand."
    ),
    parameters=[
        OpenApiParameter(name="brand_id", description="Brand ID to filter (e.g., COVE, UrbanPulse)", required=False, type=str),
        OpenApiParameter(name="tier", description="e.g., casual | originals | designer", required=False, type=str),
        OpenApiParameter(name="type", description="e.g., hoodie | bomber | jeans | jacket", required=False, type=str),
        OpenApiParameter(name="gender", description="e.g., unisex", required=False, type=str),
        OpenApiParameter(name="color", description="Color slug to filter (from ColorGroup.slug)", required=False, type=str),
        OpenApiParameter(name="size", description="S | M | L | XL", required=False, type=str),
        OpenApiParameter(name="price_min", description="Minimum price", required=False, type=str),
        OpenApiParameter(name="price_max", description="Maximum price", required=False, type=str),
        OpenApiParameter(name="search", description="Search term", required=False, type=str),
        OpenApiParameter(name="page", description="Pagination page number", required=False, type=int),
        OpenApiParameter(name="page_size", description="Items per page (max 100)", required=False, type=int),
    ],
)
class ProductListView(ListAPIView):
    """GET /api/products/?search=...&tier=..."""
    serializer_class = ProductSerializer
    pagination_class = StandardResultsSetPagination
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'description', 'brand_id', 'type', 'tier']

    def get_queryset(self):
        qs = product_queryset()
        qp = self.request.query_params

        brand_id = qp.get("brand_id")
        tier = qp.get("tier")
        typ = qp.get("type")
        gender = qp.get("gender")
        color_slug = qp.get("color")
        size = qp.get("size")
        price_min = qp.get("price_min")
        price_max = qp.get("price_max")

        if brand_id:
            qs = qs.filter(brand_id__iexact=brand_id)
        if tier:
            qs = qs.filter(tier__iexact=tier)
        if typ:
            qs = qs.filter(type__iexact=typ)
        if gender:
            qs = qs.filter(gender__iexact=gender)
        if color_slug:
            qs = qs.filter(color_variants__slug__iexact=color_slug)

        if size:
            qs = qs.filter(
                color_variants__sizes__size__iexact=size,
                color_variants__sizes__quantity__gt=0,
            ).distinct()

        if price_min:
            qs = qs.filter(color_variants__sizes__price__gte=price_min).distinct()
        if price_max:
            qs = qs.filter(color_variants__sizes__price__lte=price_max).distinct()

        return qs

    def get_serializer_context(self):
        context = super().get_serializer_context()
        # Pre-fetch brands to avoid N+1 queries in serializer
        brands = Brand.objects.values('brand_id', 'brand_name')
        context['brand_map'] = {b['brand_id']: b['brand_name'] for b in brands}
        return context


@extend_schema(
    tags=["Catalog"],
    summary="Get product by slug",
    parameters=[
        OpenApiParameter(
            name="slug",
            description="Product slug (in path)",
            required=True,
            type=str,
            location=OpenApiParameter.PATH,
        )
    ],
)
class ProductDetailView(RetrieveAPIView):
    """GET /api/products/<slug>/"""
    serializer_class = ProductSerializer
    lookup_field = "slug"
    queryset = product_queryset()


@extend_schema(
    tags=["Catalog"],
    summary="Get color variant by variant_id",
    parameters=[
        OpenApiParameter(
            name="variant_id",
            description="Variant ID (in path), e.g., CUHD001",
            required=True,
            type=str,
            location=OpenApiParameter.PATH,
        )
    ],
)
class VariantDetailView(RetrieveAPIView):
    """GET /api/variants/<variant_id>/"""
    serializer_class = ColorGroupSerializer
    lookup_field = "variant_id"
    queryset = ColorGroup.objects.select_related("product").prefetch_related("images", "sizes")


@extend_schema(
    tags=["Brands"],
    summary="List all brands",
    description="Returns all active brands with their metadata (logo, theme colors, description)",
)
class BrandListView(ListAPIView):
    """GET /api/brands/"""
    serializer_class = BrandSerializer
    queryset = Brand.objects.filter(is_active=True).order_by('brand_name')


@extend_schema(
    tags=["Brands"],
    summary="Get brand by slug",
    parameters=[
        OpenApiParameter(
            name="slug",
            description="Brand slug (in path)",
            required=True,
            type=str,
            location=OpenApiParameter.PATH,
        )
    ],
)
class BrandDetailView(RetrieveAPIView):
    """GET /api/brands/<slug>/"""
    serializer_class = BrandSerializer
    lookup_field = "slug"
    queryset = Brand.objects.filter(is_active=True)

    def get_object(self):
        import logging
        logger = logging.getLogger(__name__)
        
        queryset = self.filter_queryset(self.get_queryset())
        lookup_url_kwarg = self.lookup_url_kwarg or self.lookup_field
        slug = self.kwargs[lookup_url_kwarg]

        logger.info(f"BRAND DETAIL LOOKUP: slug='{slug}'")
        
        # Try exact first
        obj = queryset.filter(slug=slug).first()
        if obj:
             logger.info(f"Found exact match: {obj.brand_name}")
             self.check_object_permissions(self.request, obj)
             return obj

        # Try iexact
        obj = queryset.filter(slug__iexact=slug).first()
        if obj:
            logger.info(f"Found iexact match: {obj.brand_name}")
            self.check_object_permissions(self.request, obj)
            return obj
            
        logger.warning(f"Brand not found for slug: '{slug}'. Active brands count: {queryset.count()}")
        
        from django.http import Http404
        raise Http404


from django.http import JsonResponse
def debug_brands(request):
    if request.GET.get('test_slug'):
        test_slug = request.GET.get('test_slug')
        found = Brand.objects.filter(slug__iexact=test_slug).first()
        return JsonResponse({
            'test_slug': test_slug,
            'match': found.brand_name if found else None,
            'active': found.is_active if found else None
        })

    data = []
    for b in Brand.objects.all():
        product_count = ProductMasterGroup.objects.filter(brand_id=b.brand_id).count()
        data.append({
            'brand_name': b.brand_name,
            'slug': b.slug,
            'brand_id': b.brand_id,
            'is_active': b.is_active,
            'product_count': product_count
        })
    return JsonResponse({'brands': data})


def debug_products(request):
    query = request.GET.get('q', '')
    qs = ProductMasterGroup.objects.all()
    if query:
        qs = qs.filter(name__icontains=query)
    
    data = []
    for p in qs[:20]:
        data.append({
            'name': p.name,
            'type': p.type,
            'status': p.status,
            'brand_id': p.brand_id,
            'slug': p.slug,
             # Check if brand is active
            'brand_active': Brand.objects.filter(brand_id=p.brand_id).first().is_active if Brand.objects.filter(brand_id=p.brand_id).exists() else 'N/A'
        })
    return JsonResponse({'products': data})
