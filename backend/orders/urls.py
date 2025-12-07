from django.urls import path
from .views import SaveOrderView, MyOrdersView, SendOrderReceiptView

urlpatterns = [
    path("save-order/", SaveOrderView.as_view(), name="save-order"),
    path("orders/mine/", MyOrdersView.as_view(), name="orders-mine"),
    path("send-receipt/", SendOrderReceiptView.as_view(), name="send-order-receipt"),
]
