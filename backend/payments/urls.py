from django.urls import path
from .views import stripe_webhook, create_payment_intent, create_checkout_session

urlpatterns = [
    path("create-payment-intent/", create_payment_intent, name="create_payment_intent"),
    path("webhook/", stripe_webhook, name="stripe_webhook"),  # standardized path
    path("create-checkout-session/", create_checkout_session, name="create_checkout_session"),
]
