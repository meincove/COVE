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
def healthz(_request):
    return JsonResponse({"ok": True})

ADMIN_URL = os.getenv("ADMIN_URL", "super-admin/")

urlpatterns = [
    path(ADMIN_URL, admin.site.urls),
    # health/readiness
    path("healthz/", healthz),
    path("readiness/", api_views.readiness),

    # your other APIs
    path("api/", include("catalog.api_urls")),
    path("api/", include("api.urls")),
    path("api/", include("accounts.urls")),
    path("api/", include("orders.urls")),
    path("api/payments/", include("payments.urls")),

    # docs
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),

    # tools gateway
    path("tools/", include("tools.urls")),
    path("tools/", include("tools.cart.urls")),
    path("tools/", include("tools.orders.urls")),  
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
