# backend/tools/views.py
from typing import Dict, Iterable
from django.apps import apps
from django.db.models import Q, Sum, Min
from django.views.decorators.csrf import csrf_exempt
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status

from .serializers import (
    SearchFilters, SearchResult, ProductOut, VariantOut,
    DetailsQuery, DetailsOut
)
from decimal import Decimal, ROUND_HALF_UP, InvalidOperation

def money(value) -> Decimal:
    """Coerce any numeric/str/Decimal to 2-dp Decimal that fits DRF constraints."""
    if value is None:
        return Decimal("0.00")
    try:
        d = Decimal(str(value))
    except (InvalidOperation, ValueError):
        return Decimal("0.00")
    # quantize to 2 dp so max_digits=10, decimal_places=2 is satisfied
    return d.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

def get_catalog_model(*candidates: str):
    for name in candidates:
        try:
            return apps.get_model("catalog", name)
        except LookupError:
            pass
    raise LookupError(f"Could not find any of: {candidates} in app 'catalog'")

ProductModel      = get_catalog_model("Product", "ProductMasterGroup", "CatalogProduct")
VariantModel      = get_catalog_model("ColorVariant", "ColorGroup", "Variant")
SizeStockPriceMod = get_catalog_model("SizeStockPrice", "SizeStockPrice", "Stock")

def pick(obj, *names, default=None):
    for n in names:
        if hasattr(obj, n):
            v = getattr(obj, n)
            return v() if callable(v) else v
    return default

def product_variants_qs(p) -> Iterable:
    for attr in ("color_variants", "variants", "colorgroup_set", "variant_set"):
        v = getattr(p, attr, None)
        if v is not None:
            return v.all() if hasattr(v, "all") else v
    return []

from decimal import Decimal

def assemble_variant(v) -> Dict:
    # min price across sizes for this variant
    raw_price = (SizeStockPriceMod.objects
                 .filter(variant=v)
                 .aggregate(p=Min("price"))["p"])
    price = money(raw_price)

    # sum stock across sizes
    stock = (SizeStockPriceMod.objects
             .filter(variant=v)
             .aggregate(s=Sum("quantity"))["s"]) or 0

    # image list (relation -> list[str])
    imgs = getattr(v, "images", None)
    if hasattr(imgs, "values_list"):
        images = list(imgs.values_list("image_name", flat=True))
    else:
        images = list(imgs or [])

    return {
        "variantId": str(pick(v, "variant_id", "id")),
        "color_name": pick(v, "color_name", "name", default=""),
        "color_hex":  pick(v, "color_hex", "hex", default=""),
        "images":     images,
        "price":      price,          # <- normalized
        "stock":      int(stock),
    }

def assemble_product(p) -> Dict:
    variants = [assemble_variant(v) for v in product_variants_qs(p)]
    return {
        "product_id": str(pick(p, "product_id", "id")),
        "slug":       pick(p, "slug", default=""),
        "name":       pick(p, "name", "title", default=""),
        "tier":       pick(p, "tier", "group", default=""),
        "type":       pick(p, "type", "category", default=""),
        "material":   pick(p, "material", default="") or "",
        "gender":     pick(p, "gender", default="") or "",
        "base_price": money(pick(p, "base_price", "price", default=0)),  # optional
        "variants":   variants,
    }

@api_view(["GET"])
@permission_classes([AllowAny])
def health(_request):
    return Response({"ok": True, "service": "tools"})

@csrf_exempt
@api_view(["POST"])
@permission_classes([AllowAny])
def ping(request):
    return Response({"ok": True, "got": request.data})
