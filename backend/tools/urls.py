# backend/tools/urls.py
from django.urls import path
from .views import health, ping, catalog_search, catalog_details

urlpatterns = [
    path("health", health),                 # GET
    path("ping", ping),                     # POST (sanity check)
    path("catalog.search", catalog_search), # POST
    path("catalog.details", catalog_details) # GET
]