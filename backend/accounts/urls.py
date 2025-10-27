from django.urls import path
from .webhooks import clerk_webhook

urlpatterns = [
    path("webhooks/clerk/", clerk_webhook, name="clerk-webhook"),
]
