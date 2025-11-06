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


@csrf_exempt
@api_view(["POST"])
@permission_classes([AllowAny])
def catalog_search(request):
    sf = SearchFilters(data=request.data or {})
    sf.is_valid(raise_exception=True)
    f = sf.validated_data

    qs = ProductModel.objects.all()

    if q := f.get("q"):
        qs = qs.filter(Q(name__icontains=q) | Q(slug__icontains=q) | Q(type__icontains=q) | Q(tier__icontains=q))
    if tier := f.get("tier"):
        qs = qs.filter(tier__iexact=tier)
    if t := f.get("type"):
        qs = qs.filter(type__iexact=t)

    # Optional filters across relations (works if those relations exist)
    if f.get("color"):
        qs = qs.filter(color_variants__color_name__iexact=f["color"]).distinct()
    if f.get("size"):
        qs = qs.filter(color_variants__sizes__size__iexact=f["size"]).distinct()
    if f.get("price_min") is not None:
        qs = qs.filter(color_variants__sizes__price__gte=f["price_min"]).distinct()
    if f.get("price_max") is not None:
        qs = qs.filter(color_variants__sizes__price__lte=f["price_max"]).distinct()

    cursor, limit = f["cursor"], f["limit"]
    total = qs.count()
    pk = ProductModel._meta.pk.name  # "product_id" for your schema
    page = qs.order_by(pk)[cursor: cursor + limit]
    next_cursor = cursor + limit if (cursor + limit) < total else None

    items = [assemble_product(p) for p in page]
    payload = {"total": total, "next_cursor": next_cursor, "items": items}
    out = SearchResult(data=payload)
    out.is_valid(raise_exception=True)
    return Response(out.validated_data) 

@api_view(["GET"])
@permission_classes([AllowAny])
def catalog_details(request):
    dq = DetailsQuery(data=request.query_params)
    dq.is_valid(raise_exception=True)
    variant_id = dq.validated_data["variantId"]

    # ✅ Use the true PK name (variant_id in your ColorGroup)
    pk = VariantModel._meta.pk.name  # "variant_id"
    try:
        v = VariantModel.objects.select_related("product").get(**{pk: variant_id})
    except VariantModel.DoesNotExist:
        return Response({"detail": "variant not found"}, status=status.HTTP_404_NOT_FOUND)

    p = getattr(v, "product")
    payload = {"product": assemble_product(p), "selected": assemble_variant(v)}
    out = DetailsOut(data=payload)
    out.is_valid(raise_exception=True)
    return Response(out.validated_data)

@api_view(["GET"])
@permission_classes([AllowAny])
def health(_request):
    return Response({"ok": True, "service": "tools"})

@csrf_exempt
@api_view(["POST"])
@permission_classes([AllowAny])
def ping(request):
    return Response({"ok": True, "got": request.data})
