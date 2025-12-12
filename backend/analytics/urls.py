"""
Analytics URL Configuration
"""

from django.urls import path
from . import views

urlpatterns = [
    # Tracking endpoints (public, rate-limited)
    path('track', views.track_interaction, name='track_interaction'),
    path('track-batch', views.track_batch, name='track_batch'),
    
    # Export & stats (admin-only)
    path('export-cf', views.export_cf_data, name='export_cf_data'),
    path('stats', views.analytics_stats, name='analytics_stats'),
]
