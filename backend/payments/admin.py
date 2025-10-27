# payments/admin.py
from django.contrib import admin
from .models import StripeEvent

@admin.register(StripeEvent)
class StripeEventAdmin(admin.ModelAdmin):
    list_display = ("event_id", "type", "received_at")
    search_fields = ("event_id", "type")
    ordering = ("-received_at",)
