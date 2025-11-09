# ==============================================
# tools/cart/urls.py
# ==============================================
from django.urls import path
from .views import cart_add, cart_update, cart_remove, cart_view


urlpatterns = [
    path("cart.view", cart_view),
    path("cart.add", cart_add),
    path("cart.update", cart_update),
    path("cart.remove", cart_remove)
]