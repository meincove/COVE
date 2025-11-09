# backend/tools/urls.py
from django.urls import path
from .views import health, ping
from . import catalog_views 
from .consent_views import consent_get, consent_set
from .identity_views import identity_resolve
urlpatterns = [
    path("health", health),                 # GET
    path("ping", ping),                     # POST (sanity check)
    path("catalog.search",  catalog_views.catalog_search,  name="catalog_search"),   # POST
    path("catalog.details", catalog_views.catalog_details, name="catalog_details"),  # GET
    path("identity.resolve", identity_resolve, name="identity_resolve"),
    path("consent.get",     consent_get,  name="consent_get"),
    path("consent.set",     consent_set,  name="consent_set"),
]