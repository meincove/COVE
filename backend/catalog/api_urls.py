from django.urls import path
from .views_api import BrandListView, BrandDetailView, ProductListView, ProductDetailView, VariantDetailView

urlpatterns = [
    path("brands/", BrandListView.as_view(), name="brand-list"),
    path("brands/<slug:slug>/", BrandDetailView.as_view(), name="brand-detail"),
    path("products/", ProductListView.as_view(), name="product-list"),
    path("products/<slug:slug>/", ProductDetailView.as_view(), name="product-detail"),
    path("variants/<str:variant_id>/", VariantDetailView.as_view(), name="variant-detail"),
]
