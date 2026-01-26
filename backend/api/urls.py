from django.urls import path
from .views import sync_user, send_invoice_email, download_invoice_pdf, save_invoice_file, MediaUploadView
from tools.views_color import suggest_color_name

urlpatterns = [
    path("sync-user/", sync_user, name="sync_user"),
    path('send-invoice-email/', send_invoice_email, name='send_invoice_email'),
    path("download-invoice/", download_invoice_pdf, name="download_invoice_pdf"),
    path("save-invoice-file/", save_invoice_file, name="save_invoice_file"),
    path("media/upload/", MediaUploadView.as_view(), name="media_upload"),
    path("tools/color-name/", suggest_color_name, name="suggest_color_name"),
]
