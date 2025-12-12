from django.urls import path
from .views_api import ProductListView, ProductDetailView, VariantDetailView
from .test_products_view import create_test_products

urlpatterns = [
    path("products/", ProductListView.as_view(), name="product-list"),
    path("products/<slug:slug>/", ProductDetailView.as_view(), name="product-detail"),
    path("variants/<str:variant_id>/", VariantDetailView.as_view(), name="variant-detail"),
    path("create-test-products/", create_test_products, name="create-test-products"),
]
