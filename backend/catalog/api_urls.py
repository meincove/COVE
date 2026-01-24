from django.urls import path
from .views_api import BrandListView, BrandDetailView, ProductListView, ProductDetailView, VariantDetailView, debug_brands, debug_products
from .views_product import ProductRestoreView, ProductPermanentDeleteView, BrandProductListCreateView, BrandProductDetailView
from .views_bulk import BulkProductUploadView

urlpatterns = [
    path("brands/", BrandListView.as_view(), name="brand-list"),
    path("brands/<slug:slug>/", BrandDetailView.as_view(), name="brand-detail"),
    path("products/", ProductListView.as_view(), name="product-list"),
    path("products/<slug:slug>/", ProductDetailView.as_view(), name="product-detail"),
    path("variants/<str:variant_id>/", VariantDetailView.as_view(), name="variant-detail"),
    
    # Partner Management
    path("brands/<str:brand_id>/products/", BrandProductListCreateView.as_view(), name="brand-product-list"),
    path("brands/<str:brand_id>/products/<str:product_id>/", BrandProductDetailView.as_view(), name="brand-product-detail"),
    path("brands/<str:brand_id>/products/<str:product_id>/restore/", ProductRestoreView.as_view(), name="product-restore"),
    path("brands/<str:brand_id>/products/<str:product_id>/permanent/", ProductPermanentDeleteView.as_view(), name="product-permanent-delete"),
    path("debug/brands/", debug_brands, name="debug-brands"),
    path("debug/products/", debug_products, name="debug-products"),
]
