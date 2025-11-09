# backend/tools/urls.py
from django.urls import path
from .views import health, ping
from . import catalog_views 
urlpatterns = [
    path("health", health),                 # GET
    path("ping", ping),                     # POST (sanity check)
    path("catalog.search",  catalog_views.catalog_search,  name="catalog_search"),   # POST
    path("catalog.details", catalog_views.catalog_details, name="catalog_details"),  # GET
]