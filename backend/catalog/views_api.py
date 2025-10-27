from rest_framework.generics import ListAPIView, RetrieveAPIView
from drf_spectacular.utils import extend_schema, OpenApiParameter
from .models import ProductMasterGroup, ColorGroup
from .serializers import ProductSerializer, ColorGroupSerializer
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
        "Filter by tier, type, gender, color (color slug), size, and price range."
    ),
    parameters=[
        OpenApiParameter(name="tier", description="e.g., casual | originals | designer", required=False, type=str),
        OpenApiParameter(name="type", description="e.g., hoodie | bomber | jeans | jacket", required=False, type=str),
        OpenApiParameter(name="gender", description="e.g., unisex", required=False, type=str),
        OpenApiParameter(name="color", description="Color slug to filter (from ColorGroup.slug)", required=False, type=str),
        OpenApiParameter(name="size", description="S | M | L | XL", required=False, type=str),
        OpenApiParameter(name="price_min", description="Minimum price", required=False, type=str),
        OpenApiParameter(name="price_max", description="Maximum price", required=False, type=str),
        OpenApiParameter(name="page", description="Pagination page number", required=False, type=int),
        OpenApiParameter(name="page_size", description="Items per page (max 100)", required=False, type=int),
    ],
)
class ProductListView(ListAPIView):
    """GET /api/products/?tier=&type=&gender=&color=&size=&price_min=&price_max="""
    serializer_class = ProductSerializer
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        qs = product_queryset()
        qp = self.request.query_params

        tier = qp.get("tier")
        typ = qp.get("type")
        gender = qp.get("gender")
        color_slug = qp.get("color")
        size = qp.get("size")
        price_min = qp.get("price_min")
        price_max = qp.get("price_max")

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
