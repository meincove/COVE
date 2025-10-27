from django.contrib import admin
from django.http import HttpResponse
from django.contrib.admin import SimpleListFilter
import csv

from .models import ProductMasterGroup, ColorGroup, ProductImage, SizeStockPrice


@admin.register(ProductMasterGroup)
class ProductMasterAdmin(admin.ModelAdmin):
    list_display = ('product_id', 'name', 'tier', 'type', 'material', 'base_price')
    search_fields = ('name', 'slug', 'tier', 'type')
    list_filter = ('tier', 'type', 'gender')


@admin.register(ColorGroup)
class ColorGroupAdmin(admin.ModelAdmin):
    list_display = ('variant_id', 'color_name', 'product', 'hex')
    search_fields = ('variant_id', 'color_name', 'slug')
    list_filter = ('color_name',)


@admin.register(ProductImage)
class ProductImageAdmin(admin.ModelAdmin):
    list_display = ('variant', 'image_name')
    search_fields = ('image_name', 'variant__variant_id')


class LowStockFilter(SimpleListFilter):
    title = "Stock"
    parameter_name = "stock"

    def lookups(self, request, model_admin):
        return (
            ("zero", "Out of stock (0)"),
            ("lte5", "Low (≤ 5)"),
            ("lte10", "Low (≤ 10)"),
        )

    def queryset(self, request, queryset):
        val = self.value()
        if val == "zero":
            return queryset.filter(quantity=0)
        if val == "lte5":
            return queryset.filter(quantity__lte=5)
        if val == "lte10":
            return queryset.filter(quantity__lte=10)
        return queryset


@admin.register(SizeStockPrice)
class SizeStockPriceAdmin(admin.ModelAdmin):
    def variant_id(self, obj):
        return obj.variant.variant_id
    variant_id.short_description = "Variant ID"

    list_display = (
        'id', 'variant_id', 'size', 'quantity', 'price',
        'stripe_product_id', 'stripe_price_id',
    )
    search_fields = ('variant__variant_id', 'stripe_price_id', 'stripe_product_id')
    list_filter = ('size', LowStockFilter)
    ordering = ('variant__variant_id', 'size')

    actions = ['export_selected_as_csv', 'export_low_stock_5_as_csv']

    def export_selected_as_csv(self, request, queryset):
        """Export the currently selected rows as CSV."""
        response = HttpResponse(content_type="text/csv")
        response['Content-Disposition'] = 'attachment; filename="size_stock_prices_selected.csv"'
        writer = csv.writer(response)
        writer.writerow([
            "variant_id", "size", "quantity", "price",
            "stripe_product_id", "stripe_price_id",
        ])
        for s in queryset.select_related("variant"):
            writer.writerow([
                s.variant.variant_id, s.size, s.quantity, str(s.price),
                s.stripe_product_id or "", s.stripe_price_id or "",
            ])
        return response
    export_selected_as_csv.short_description = "Export selected as CSV"

    def export_low_stock_5_as_csv(self, request, queryset):
        """Export ALL rows with quantity ≤ 5 (ignores current selection)."""
        qs = SizeStockPrice.objects.filter(quantity__lte=5).select_related("variant")
        response = HttpResponse(content_type="text/csv")
        response['Content-Disposition'] = 'attachment; filename="size_stock_prices_low_5.csv"'
        writer = csv.writer(response)
        writer.writerow([
            "variant_id", "size", "quantity", "price",
            "stripe_product_id", "stripe_price_id",
        ])
        for s in qs:
            writer.writerow([
                s.variant.variant_id, s.size, s.quantity, str(s.price),
                s.stripe_product_id or "", s.stripe_price_id or "",
            ])
        return response
    export_low_stock_5_as_csv.short_description = "Export LOW stock (≤ 5) as CSV"
