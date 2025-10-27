from django.urls import path
from .views_api import ProductListView, ProductDetailView, VariantDetailView

urlpatterns = [
    path("products/", ProductListView.as_view(), name="product-list"),
    path("products/<slug:slug>/", ProductDetailView.as_view(), name="product-detail"),
    path("variants/<str:variant_id>/", VariantDetailView.as_view(), name="variant-detail"),
]
