# payments/models.py
from django.db import models

class StripeEvent(models.Model):
    event_id = models.CharField(max_length=255, unique=True, db_index=True)
    type = models.CharField(max_length=100, db_index=True)
    payload = models.JSONField()
    received_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.type} — {self.event_id}"
