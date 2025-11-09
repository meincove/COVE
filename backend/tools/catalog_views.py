# tools/catalog_views.py
from __future__ import annotations
from typing import Dict, Any, List, Tuple

from django.db.models import Prefetch, Min, Max, Q
from rest_framework.decorators import api_view, throttle_classes, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.throttling import AnonRateThrottle
from rest_framework.response import Response
from rest_framework import status

from catalog.models import (
    ProductMasterGroup,
    ColorGroup,
    ProductImage,
    SizeStockPrice,
)
from .serializers import CatalogDetailsQuery
# --- helpers -----------------------------------------------------------------

def _first_image_name(variant: ColorGroup) -> str:
    img = variant.images.first()
    return img.image_name if img else ""

def _sizes_for_variant(variant: ColorGroup) -> List[Dict[str, Any]]:
    return [
        {"size": s.size, "quantity": s.quantity, "price": str(s.price), "stripe_price_id": s.stripe_price_id}
        for s in variant.sizes.all()
    ]

def _variant_summary(v: ColorGroup) -> Dict[str, Any]:
    return {
        "variantId": v.variant_id,
        "colorName": v.color_name,
        "hex": v.hex,
        "firstImage": _first_image_name(v),
    }

def _variant_full(v: ColorGroup) -> Dict[str, Any]:
    return {
        "variantId": v.variant_id,
        "colorName": v.color_name,
        "hex": v.hex,
        "images": [pi.image_name for pi in v.images.all()],
        "sizes": _sizes_for_variant(v),
    }

def _prefetch_bundle():
    return (
        Prefetch("color_variants__images", queryset=ProductImage.objects.all()),
        Prefetch("color_variants__sizes", queryset=SizeStockPrice.objects.all()),
    )

def _variant_payload(v: ColorGroup):
    first_size = v.sizes.first()
    return {
        "variantId": v.variant_id,
        "color_name": v.color_name,
        "color_hex": v.hex,
        "images": [pi.image_name for pi in v.images.all()],
        "price": float(first_size.price) if first_size else None,
        "stock": int(first_size.quantity) if first_size else 0,
    }

# --- /tools/catalog.search ----------------------------------------------------

class SearchThrottle(AnonRateThrottle):
    scope = "search"
    rate = "120/min"

@api_view(["POST"])
@permission_classes([AllowAny])
@throttle_classes([SearchThrottle])
def catalog_search(request):
    """
    Body:
    {
      "q": "...", "tier": "...", "type": "...", "size": "M",
      "priceMin": "19.99", "priceMax": "59.99",
      "page": 1, "pageSize": 12
    }
    """
    data = request.data or {}
    q = (data.get("q") or "").strip()
    tier = data.get("tier")
    ptype = data.get("type")
    size = data.get("size")
    pmin = data.get("priceMin")
    pmax = data.get("priceMax")
    page = max(1, int(data.get("page") or 1))
    page_size = max(1, min(50, int(data.get("pageSize") or 12)))
    offset = (page - 1) * page_size
    limit = offset + page_size

    qs = (
        ProductMasterGroup.objects
        .all()
        .prefetch_related(*_prefetch_bundle())
        .annotate(min_price=Min("color_variants__sizes__price"),
                  max_price=Max("color_variants__sizes__price"))
    )

    if q:
        qs = qs.filter(
            Q(name__icontains=q) |
            Q(material__icontains=q) |
            Q(type__icontains=q) |
            Q(description__icontains=q)
        )
    if tier:
        qs = qs.filter(tier__iexact=tier)
    if ptype:
        qs = qs.filter(type__iexact=ptype)
    if pmin:
        qs = qs.filter(color_variants__sizes__price__gte=pmin)
    if pmax:
        qs = qs.filter(color_variants__sizes__price__lte=pmax)
    if size:
        qs = qs.filter(color_variants__sizes__size=size)

    total = qs.distinct().count()
    products = qs.distinct()[offset:limit]

    items = []
    for p in products:
        variants = [cv for cv in p.color_variants.all()]
        items.append({
            "productId": p.product_id,
            "name": p.name,
            "slug": p.slug,
            "tier": p.tier,
            "type": p.type,
            "material": p.material,
            "priceRange": {
                "min": str(p.min_price) if p.min_price is not None else None,
                "max": str(p.max_price) if p.max_price is not None else None,
            },
            "colors": [_variant_summary(v) for v in variants],
            "sizes": sorted({s.size for v in variants for s in v.sizes.all()}),
        })

    return Response({
        "total": total,
        "page": page,
        "pageSize": page_size,
        "items": items,
    })

# --- /tools/catalog.details ---------------------------------------------------

# tools/catalog_views.py (replace catalog_details)


@api_view(["GET"])
@permission_classes([AllowAny])
def catalog_details(request):
    q = CatalogDetailsQuery(data=request.query_params)
    q.is_valid(raise_exception=True)
    slug = q.validated_data.get("slug")
    variant_id = q.validated_data.get("variantId")

    # ----- variantId path -----
    if variant_id:
        try:
            variant = (
                ColorGroup.objects
                .select_related("product")
                .prefetch_related("images", "sizes")
                .get(variant_id=variant_id)
            )
        except ColorGroup.DoesNotExist:
            return Response({"detail": "variantId not found"}, status=404)

        product = (
            ProductMasterGroup.objects
            .filter(pk=variant.product_id)
            .prefetch_related(*_prefetch_bundle())
            .first()
        )
        if not product:
            return Response({"detail": "product not found"}, status=404)

        return Response({
            "product": {
                "product_id": product.product_id,
                "slug": product.slug,
                "name": product.name,
                "tier": product.tier,
                "type": product.type,
                "material": product.material,
                "gender": product.gender,
                "base_price": float(product.base_price),
                "variants": [_variant_payload(v) for v in product.color_variants.all()],
            },
            "selected": _variant_payload(variant),
        })

    # ----- slug path -----
    product = (
        ProductMasterGroup.objects
        .filter(slug=slug)
        .prefetch_related(*_prefetch_bundle())
        .first()
    )
    if not product:
        return Response({"detail": "product not found"}, status=404)

    return Response({
        "product": {
            "product_id": product.product_id,
            "slug": product.slug,
            "name": product.name,
            "tier": product.tier,
            "type": product.type,
            "material": product.material,
            "gender": product.gender,
            "base_price": float(product.base_price),
            "variants": [_variant_payload(v) for v in product.color_variants.all()],
        }
    })