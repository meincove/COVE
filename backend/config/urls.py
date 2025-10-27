from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse , HttpResponseNotFound
from django.conf import settings 
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView
from api import views as api_views
import os


def healthz(_request):
    return JsonResponse({"ok": True})

# settings.py
ADMIN_URL = os.getenv("ADMIN_URL", "super-admin/")  # set a random value in prod, keep default locally if you want

urlpatterns = [
    path(ADMIN_URL, admin.site.urls),
    # optional decoy: always 404 on /admin/ so scanners get nothing helpful
    path("admin/", lambda r: HttpResponseNotFound()),

    # Health endpoints
    path("healthz/", healthz),
    path("readiness/", api_views.readiness),

    # APIs
    path("api/", include("catalog.api_urls")),
    path("api/", include("api.urls")),
    path("api/", include("accounts.urls")),
    path("api/", include("orders.urls")),          # ✅ orders only once, mounted under /api/
    path("api/payments/", include("payments.urls")),  # payments has its own prefix

    # API docs
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
]

urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
