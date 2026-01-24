# backend/config/urls.py
from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse, HttpResponseNotFound
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView
from api import views as api_views
import os
from tools.catalog_views import catalog_details, catalog_search

# Brand Onboarding Views
from catalog.views_brand_onboarding import (
    BrandRegistrationView,
    BrandBusinessInfoView,
    BrandShippingView,
    BrandStripeConnectView,
    BrandIntegrationChoiceView,
    BrandDetailView,
)

# Product Management Views
from catalog.views_product import (
    BrandProductListCreateView,
    BrandProductDetailView
)

def healthz(_request):
    return JsonResponse({"ok": True})

ADMIN_URL = os.getenv("ADMIN_URL", "super-admin/")

urlpatterns = [
    path(ADMIN_URL, admin.site.urls),  # /super-admin/ (from env)
    path("admin/", admin.site.urls),    # Standard /admin/ path
    # health/readiness
    path("healthz/", healthz),
    path("readiness/", api_views.readiness),

    # Brand Onboarding API
    path("api/brands/register/", BrandRegistrationView.as_view(), name='brand-register'),
    path("api/brands/<str:brand_id>/", BrandDetailView.as_view(), name='brand-detail'),
    path("api/brands/<str:brand_id>/business-info/", BrandBusinessInfoView.as_view(), name='brand-business-info'),
   path("api/brands/<str:brand_id>/shipping/", BrandShippingView.as_view(), name='brand-shipping'),
    path("api/brands/<str:brand_id>/stripe-connect/", BrandStripeConnectView.as_view(), name='brand-stripe'),
    path("api/brands/<str:brand_id>/integration/", BrandIntegrationChoiceView.as_view(), name='brand-integration'),

    # Product Management API
    path("api/brands/<str:brand_id>/products/", BrandProductListCreateView.as_view(), name='brand-products'),
    path("api/brands/<str:brand_id>/products/<str:product_id>/", BrandProductDetailView.as_view(), name='brand-product-detail'),

    # your other APIs
    path("api/", include("catalog.api_urls")),
    path("api/", include("api.urls")),
    path("api/", include("accounts.urls")),
    path("api/", include("orders.urls")),
    path("api/payments/", include("payments.urls")),
    path("api/analytics/", include("analytics.urls")),  # User tracking (Dec 8, 2025)

    # docs
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),

    # tools gateway
    path("tools/", include("tools.urls")),
    path("tools/", include("tools.cart.urls")),
    path("tools/", include("tools.orders.urls")),  
    
    path("ai_profiles/", include("ai_profiles.urls"))
]
from django.urls import re_path
from tools.cart import views as cart_views
urlpatterns += [
    re_path(r"^tools/cart\.add$",    cart_views.cart_add,    name="cart_add"),
    re_path(r"^tools/cart\.update$", cart_views.cart_update, name="cart_update"),
    re_path(r"^tools/cart\.remove$", cart_views.cart_remove, name="cart_remove"),
    re_path(r"^tools/cart\.view$",   cart_views.cart_view,   name="cart_view"),
]
urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
