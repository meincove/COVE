# backend/ai_profiles/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path("profile.get", views.ai_profile_get, name="ai_profile_get"),
    path("profile.update", views.ai_profile_update, name="ai_profile_update"),
    path("log_chat/", views.log_chat, name="ai_log_chat"),
    path("history/", views.get_history, name="ai_chat_history"),
]
