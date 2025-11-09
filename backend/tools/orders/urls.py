from django.urls import path
from .views import orders_list, orders_get

urlpatterns = [
    path("orders.list", orders_list),
    path("orders.get",  orders_get),
]
