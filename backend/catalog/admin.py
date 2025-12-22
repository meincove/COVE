from django.contrib import admin
from .models import Brand, ProductMasterGroup, ColorGroup, ProductImage, SizeStockPrice, Cart, CartItem

@admin.register(Brand)
class BrandAdmin(admin.ModelAdmin):
    list_display = ('brand_id', 'brand_name', 'slug', 'is_active', 'created_at')
    list_filter = ('is_active', 'created_at')
    search_fields = ('brand_id', 'brand_name', 'slug')
    readonly_fields = ('created_at',)
    fieldsets = (
        ('Basic Information', {
            'fields': ('brand_id', 'brand_name', 'slug', 'description')
        }),
        ('Branding', {
            'fields': ('logo_url', 'theme_colors')
        }),
        ('Status', {
            'fields': ('is_active', 'created_at')
        }),
    )

@admin.register(ProductMasterGroup)
class ProductMasterGroupAdmin(admin.ModelAdmin):
    list_display = ('product_id', 'name', 'brand_id', 'tier', 'type', 'base_price')
    list_filter = ('brand_id', 'tier', 'type', 'gender', 'fit')
    search_fields = ('product_id', 'name', 'material')
    
@admin.register(ColorGroup)
class ColorGroupAdmin(admin.ModelAdmin):
    list_display = ('variant_id', 'product', 'color_name', 'hex')
    list_filter = ('color_name',)
    search_fields = ('variant_id', 'color_name')

@admin.register(ProductImage)
class ProductImageAdmin(admin.ModelAdmin):
    list_display = ('id', 'variant', 'image_name')
    search_fields = ('image_name',)

@admin.register(SizeStockPrice)
class SizeStockPriceAdmin(admin.ModelAdmin):
    list_display = ('variant', 'size', 'quantity', 'price')
    list_filter = ('size',)

@admin.register(Cart)
class CartAdmin(admin.ModelAdmin):
    list_display = ('cart_id', 'clerk_user_id', 'created_at', 'updated_at')
    search_fields = ('cart_id', 'clerk_user_id', 'email')

@admin.register(CartItem)
class CartItemAdmin(admin.ModelAdmin):
    list_display = ('cart', 'variant', 'size', 'quantity')
    list_filter = ('size',)
