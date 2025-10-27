from django.urls import path
from .views import SaveOrderView, MyOrdersView

urlpatterns = [
    path("save-order/", SaveOrderView.as_view(), name="save-order"),
    path("orders/mine/", MyOrdersView.as_view(), name="orders-mine"),
]
