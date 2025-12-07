import json
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.conf import settings
from svix.webhooks import Webhook, WebhookVerificationError

from .models import CustomUser
from payments.utils import sanitize_email, generate_fallback_email
import logging

log = logging.getLogger(__name__)


def _primary_email_from_clerk(data: dict) -> str | None:
    emails = data.get("email_addresses") or []
    primary_id = data.get("primary_email_address_id")
    # Prefer the primary email
    for e in emails:
        if e.get("id") == primary_id:
            return e.get("email_address")
    # Fallback: first email if any
    return emails[0].get("email_address") if emails else None


@csrf_exempt
def clerk_webhook(request):
    if request.method != "POST":
        return HttpResponse(status=405)

    secret = getattr(settings, "CLERK_WEBHOOK_SECRET", None)
    if not secret:
        log.critical("CLERK_WEBHOOK_SECRET not configured - webhooks cannot be verified!")
        return JsonResponse(
            {"error": "service_misconfigured", "details": "Webhook verification unavailable"},
            status=503
        )

    payload = request.body.decode("utf-8")
    headers = {
        "svix-id": request.headers.get("svix-id"),
        "svix-timestamp": request.headers.get("svix-timestamp"),
        "svix-signature": request.headers.get("svix-signature"),
    }

    try:
        Webhook(secret).verify(payload, headers)
        event = json.loads(payload)
    except WebhookVerificationError:
        log.error("Clerk webhook: invalid signature")
        return JsonResponse({"error": "Invalid signature"}, status=400)
    except Exception as e:
        log.exception("Clerk webhook: parsing error")
        return JsonResponse({"error": "webhook_error"}, status=400)

    etype = event.get("type")
    data = event.get("data", {})

    clerk_user_id = data.get("id")  # maps to CustomUser.user_id
    email_raw = _primary_email_from_clerk(data)
    
    # ---- SECURITY FIX: Sanitize email and use hashed fallback ----
    email = sanitize_email(email_raw)
    if not email:
        email = generate_fallback_email(clerk_user_id)
    
    first_name = data.get("first_name") or ""
    last_name = data.get("last_name") or ""
    image_url = data.get("image_url") or ""

    if etype in ("user.created", "user.updated"):
        # Upsert by Clerk user_id
        user, _created = CustomUser.objects.update_or_create(
            user_id=clerk_user_id,
            defaults={
                "email": email,
                "first_name": first_name,
                "last_name": last_name,
                "image_url": image_url,
                "username": email or clerk_user_id,
                "is_active": True,
            },
        )
        return JsonResponse({"ok": True, "user": user.user_id})

    if etype == "user.deleted":
        CustomUser.objects.filter(user_id=clerk_user_id).update(is_active=False)
        return JsonResponse({"ok": True, "deactivated": clerk_user_id})

    # Ignore other events
    return JsonResponse({"ok": True})
