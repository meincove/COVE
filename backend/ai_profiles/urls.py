# backend/ai_profiles/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path("profile.get", views.ai_profile_get, name="ai_profile_get"),
    path("profile.update", views.ai_profile_update, name="ai_profile_update"),
    path("log_chat/", views.log_chat, name="ai_log_chat"),
    path("history/", views.conversation_history_get, name="ai_conversation_history"),
    path("history/log/", views.conversation_event_log, name="ai_conversation_event_log"),
    # Phase 1: Context Management - Fact storage
    path("session/facts/", views.update_session_facts, name="update_session_facts"),
    path("session/facts/get/", views.get_session_facts, name="get_session_facts"),
]
