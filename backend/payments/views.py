import json
import logging
import uuid
from decimal import Decimal
import os
import stripe
from django.conf import settings
from django.contrib.auth import get_user_model
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.db.models import Q
from django.db import transaction

from .models import StripeEvent

from payments.shipping import shipping_amount_for, speed_display_name

from django.template.loader import render_to_string
from django.core.mail import EmailMultiAlternatives



# DRF
from rest_framework.decorators import api_view, permission_classes, authentication_classes, throttle_classes
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.permissions import AllowAny
from rest_framework import status

# Local imports
from orders.models import Order, OrderItem, OrderSummary, CheckoutCart
from catalog.models import SizeStockPrice
from .serializers import CreateCheckoutSessionSerializer

stripe.api_key = settings.STRIPE_SECRET_KEY
User = get_user_model()
log = logging.getLogger(__name__)


def _d(cents):
    """Convert Stripe integer amounts (in cents) to Decimal euros."""
    try:
        return (Decimal(cents) or 0) / Decimal(100)
    except Exception:
        return Decimal("0.00")


def _to_cents(val) -> int:
    """Convert Decimal/number to integer cents safely."""
    return int(Decimal(str(val)).quantize(Decimal("0.01")) * 100)


@csrf_exempt
def create_payment_intent(request):
    if request.method != "POST":
        return JsonResponse({"error": "POST method only"}, status=405)

    try:
        data = json.loads(request.body or "{}")

        # ✅ Expect euros in decimal (e.g., 49.99) and convert to cents
        raw_amount = data.get("amount", 49.99)  
        try:
            # Ensure integer cents
            amount_cents = int(round(float(raw_amount) * 100))
        except (ValueError, TypeError):
            return JsonResponse({"error": "Invalid amount"}, status=400)

        currency = data.get("currency", "eur")

        # Optional metadata for reconciliation
        metadata = {
            "order_id": str(data.get("order_id", "")),
            "clerk_user_id": str(data.get("clerk_user_id", "")),
            "guest_session_id": str(data.get("guest_session_id", "")),
            "user_email": str(data.get("user_email", "")),
        }
        # Merge in any extra metadata safely
        if isinstance(data.get("metadata"), dict):
            metadata.update(data["metadata"])

        # ✅ Create PaymentIntent with amount in cents
        intent = stripe.PaymentIntent.create(
            amount=amount_cents,
            currency=currency,
            metadata=metadata,
            automatic_payment_methods={"enabled": True},  # allow multiple payment types
        )

        return JsonResponse({"clientSecret": intent.client_secret})

    except Exception as e:
        log.exception("create_payment_intent failed")
        return JsonResponse({"error": str(e)}, status=400)


# NEW: Server-side create-checkout-session (uses Stripe Price IDs or DB price fallback)

@csrf_exempt
@api_view(["POST"])
@permission_classes([AllowAny])
@authentication_classes([])
@throttle_classes([ScopedRateThrottle])
def create_checkout_session(request):
    """
    POST /api/payments/create-checkout-session/

    Body (validated by CreateCheckoutSessionSerializer):
    {
      "items": [ { "variantId": "CUHD001", "size": "M", "quantity": 1 }, ... ],
      "clerkUserId": "user_abc" | null,
      "guestSessionId": "guest_xyz" | null,
      "customer_email": "test@example.com" | null
    }

    Returns: { "id": "<cs_...>", "url": "https://checkout.stripe.com/..." }
    """
    serializer = CreateCheckoutSessionSerializer(data=request.data)
    if not serializer.is_valid():
        return JsonResponse({"error": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    v = serializer.validated_data
    items = v["items"]
    clerk_user_id = v.get("clerkUserId") or ""
    guest_session_id = v.get("guestSessionId") or ""
    customer_email = v.get("customer_email") or None

    currency = getattr(settings, "STRIPE_CURRENCY", "eur").lower()
    success_url = settings.STRIPE_SUCCESS_URL
    cancel_url = settings.STRIPE_CANCEL_URL
    is_guest = False if clerk_user_id else True

    # ---- NEW: Tax setup ----
    # Create a 19% tax rate in Stripe Dashboard and set STRIPE_TAX_RATE_ID in env.
    TAX_RATE_ID = os.environ.get("STRIPE_TAX_RATE_ID")
    tax_rates = [TAX_RATE_ID] if TAX_RATE_ID else []

    # Build Stripe line_items from trusted server-side catalog
    line_items = []
    snapshot_items = []  # we persist these after we know session.id

    for it in items:
        variant_id = it["variantId"]
        size = it["size"].upper()
        qty = int(it["quantity"])

        try:
            ssp = (
                SizeStockPrice.objects
                .select_related("variant", "variant__product")
                .get(variant__variant_id=variant_id, size=size)
            )
        except SizeStockPrice.DoesNotExist:
            return JsonResponse(
                {"error": f"Variant/size not found: {variant_id} / {size}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Soft stock check (final decrement happens in webhook transaction)
        if qty > ssp.quantity:
            return JsonResponse(
                {"error": f"Insufficient stock for {variant_id} {size}. Available: {ssp.quantity}."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Use Stripe Price ID if available; else build price_data
        if ssp.stripe_price_id:
            li = {"price": ssp.stripe_price_id, "quantity": qty}
            if tax_rates:
                li["tax_rates"] = tax_rates
            line_items.append(li)
            unit_price_dec = ssp.price
        else:
            unit_price_dec = ssp.price
            display_name = f"{ssp.variant.product.name} - {ssp.variant.color_name} ({size})"
            li = {
                "quantity": qty,
                "price_data": {
                    "currency": currency,
                    "unit_amount": _to_cents(unit_price_dec),
                    "product_data": {
                        "name": display_name,
                        "metadata": {
                            "variantId": variant_id,
                            "size": size,
                        },
                    },
                },
            }
            if tax_rates:
                li["tax_rates"] = tax_rates
            line_items.append(li)

        # Prepare snapshot (checkout_session_id filled after session create)
        prod = ssp.variant.product
        total_price_dec = (Decimal(str(unit_price_dec)) * Decimal(qty)).quantize(Decimal("0.01"))
        snapshot_items.append({
            "is_guest": is_guest,
            "user": None,
            "clerk_user_id": clerk_user_id or None,
            "guest_session_id": guest_session_id or None,
            "payment_intent_id": None,
            "checkout_session_id": None,

            "variant_id": variant_id,
            "product_id": prod.product_id,
            "name": prod.name,
            "type": prod.type,
            "tier": prod.tier,

            "first_name": None,
            "last_name": None,
            "user_email": customer_email,

            "size": size,
            "color_name": ssp.variant.color_name,
            "quantity": qty,
            "price_per_unit": unit_price_dec,
            "total_price": total_price_dec,
        })

    if not line_items:
        return JsonResponse({"error": "No valid line items."}, status=status.HTTP_400_BAD_REQUEST)

    idem_key = request.headers.get("Idempotency-Key") or str(uuid.uuid4())

    try:
        # ---- Build zone-based shipping from destination country ----
        # Expect the frontend to send ISO-2 country code in the POST body as "country" (e.g., "DE", "FR", "US", "IN")
        dest_country = (request.data.get("country") or "DE").upper()
        weight_g = int(request.data.get("totalWeightGrams") or 0)
        shipping_speed = (request.data.get("shippingSpeed") or "standard").lower()  # "standard" | "express"
        
        std_amount = shipping_amount_for(dest_country, weight_g, "standard")
        exp_amount = shipping_amount_for(dest_country, weight_g, "express")
        
        display_name = speed_display_name(shipping_speed)
        delivery_estimate = (
            {"minimum": {"unit": "business_day", "value": 1}, "maximum": {"unit": "business_day", "value": 2}}
            if shipping_speed == "express"
            else {"minimum": {"unit": "business_day", "value": 2}, "maximum": {"unit": "business_day", "value": 5}}
            )
        
        shipping_options = [
            {
            "shipping_rate_data": {
                "display_name": "Standard shipping",
                "type": "fixed_amount",
                "fixed_amount": {"amount": std_amount, "currency": currency},  # use your existing currency variable
                "tax_behavior": "inclusive",         # we'll finalize tax strategy later
                "tax_code": "txcd_92010001",         # Shipping tax code
                "delivery_estimate": {
                    "minimum": {"unit": "business_day", "value": 2},
                    "maximum": {"unit": "business_day", "value": 5},
                    },
                }
            },
            {
            "shipping_rate_data": {
                "display_name": "Express shipping",
                "type": "fixed_amount",
                "fixed_amount": {"amount": exp_amount, "currency": currency},  # use your existing currency variable
                "tax_behavior": "inclusive",         # we'll finalize tax strategy later
                "tax_code": "txcd_92010001",         # Shipping tax code
                "delivery_estimate": {
                    "minimum": {"unit": "business_day", "value": 1},
                    "maximum": {"unit": "business_day", "value": 2},
                    },
                }
            },
                            ]

        
        
        session = stripe.checkout.Session.create(
            mode="payment",
            line_items=line_items,
            success_url=success_url,
            cancel_url=cancel_url,
            customer_email=customer_email,
            allow_promotion_codes=True,
            billing_address_collection="auto",
            shipping_address_collection={
                "allowed_countries": [
                    # EU-27
                    "AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR","HU","IE",
                    "IT","LV","LT","LU","MT","NL","PL","PT","RO","SK","SI","ES","SE",
                    # Common worldwide (sample – adjust as needed)
                    "US","CA","GB","AU","NZ","CH","NO","IS","LI","TR","AE","SA","IN","PK","BD",
                    "JP","KR","SG","TH","VN","PH","MY","ID","IL","EG","ZA","BR","AR","CL","MX"
                    ]
                },
            shipping_options=shipping_options,
            # If you later enable Stripe Tax automatic calculation, you can switch to:
            automatic_tax={"enabled": True},
            customer_creation="if_required",

            metadata={
                "clerk_user_id": clerk_user_id,
                "guest_session_id": guest_session_id,
                "user_email": customer_email or "",
                "origin": "django-backend",
            },
            client_reference_id=clerk_user_id or guest_session_id or None,
            idempotency_key=idem_key,
        )

        # Persist the snapshot rows keyed by this Checkout Session
        if snapshot_items:
            cs_id = session.id
            for d in snapshot_items:
                d["checkout_session_id"] = cs_id
            CheckoutCart.objects.bulk_create([CheckoutCart(**d) for d in snapshot_items])

        return JsonResponse({"id": session.id, "url": session.url}, status=status.HTTP_200_OK)

    except stripe.error.StripeError as e:
        return JsonResponse({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        return JsonResponse({"error": f"Unexpected error: {e}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

create_checkout_session.throttle_scope = "checkout"



# @csrf_exempt
# @api_view(["POST"])
# @permission_classes([AllowAny])
# @authentication_classes([])
# @throttle_classes([ScopedRateThrottle])
# def create_checkout_session(request):
   

#     """
#     POST /api/payments/create-checkout-session/

#     Body:
#     {
#       "items": [ { "variantId": "CUHD001", "size": "M", "quantity": 1 }, ... ],
#       "clerkUserId": "user_abc" | null,
#       "guestSessionId": "guest_xyz" | null,
#       "customer_email": "test@example.com" | null
#     }

#     Returns: { "id": "<cs_...>", "url": "https://checkout.stripe.com/..." }
#     """
#     serializer = CreateCheckoutSessionSerializer(data=request.data)
#     if not serializer.is_valid():
#         return JsonResponse({"error": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

#     v = serializer.validated_data
#     items = v["items"]
#     clerk_user_id = v.get("clerkUserId") or ""
#     guest_session_id = v.get("guestSessionId") or ""
#     customer_email = v.get("customer_email") or None

#     currency = getattr(settings, "STRIPE_CURRENCY", "eur").lower()
#     success_url = settings.STRIPE_SUCCESS_URL
#     cancel_url = settings.STRIPE_CANCEL_URL
#     is_guest = False if clerk_user_id else True

#     # Build Stripe line_items from trusted server-side catalog
#     line_items = []
#     snapshot_items = []  # we persist these after we know session.id

#     for it in items:
#         variant_id = it["variantId"]
#         size = it["size"].upper()
#         qty = int(it["quantity"])

#         try:
#             ssp = (
#                 SizeStockPrice.objects
#                 .select_related("variant", "variant__product")
#                 .get(variant__variant_id=variant_id, size=size)
#             )
#         except SizeStockPrice.DoesNotExist:
#             return JsonResponse(
#                 {"error": f"Variant/size not found: {variant_id} / {size}"},
#                 status=status.HTTP_400_BAD_REQUEST,
#             )

#         # Soft stock check (final decrement happens in webhook transaction)
#         if qty > ssp.quantity:
#             return JsonResponse(
#                 {"error": f"Insufficient stock for {variant_id} {size}. Available: {ssp.quantity}."},
#                 status=status.HTTP_400_BAD_REQUEST,
#             )

#         # Prefer Stripe Price ID if available
#         if ssp.stripe_price_id:
#             line_items.append({"price": ssp.stripe_price_id, "quantity": qty})
#             unit_price_dec = ssp.price
#         else:
#             unit_price_dec = ssp.price
#             display_name = f"{ssp.variant.product.name} - {ssp.variant.color_name} ({size})"
#             line_items.append({
#                 "quantity": qty,
#                 "price_data": {
#                     "currency": currency,
#                     "unit_amount": _to_cents(unit_price_dec),
#                     "product_data": {
#                         "name": display_name,
#                         "metadata": {
#                             "variantId": variant_id,
#                             "size": size,
#                         },
#                     },
#                 },
#             })

#         # Prepare snapshot row (checkout_session_id filled after session create)
#         prod = ssp.variant.product
#         total_price_dec = (Decimal(str(unit_price_dec)) * Decimal(qty)).quantize(Decimal("0.01"))
#         snapshot_items.append({
#             "is_guest": is_guest,
#             "user": None,
#             "clerk_user_id": clerk_user_id or None,
#             "guest_session_id": guest_session_id or None,
#             "payment_intent_id": None,
#             "checkout_session_id": None,

#             "variant_id": variant_id,
#             "product_id": prod.product_id,
#             "name": prod.name,
#             "type": prod.type,
#             "tier": prod.tier,

#             "first_name": None,
#             "last_name": None,
#             "user_email": customer_email,

#             "size": size,
#             "color_name": ssp.variant.color_name,
#             "quantity": qty,
#             "price_per_unit": unit_price_dec,
#             "total_price": total_price_dec,
#         })

#     if not line_items:
#         return JsonResponse({"error": "No valid line items."}, status=status.HTTP_400_BAD_REQUEST)

#     idem_key = request.headers.get("Idempotency-Key") or str(uuid.uuid4())

#     try:
#         session = stripe.checkout.Session.create(
#             mode="payment",
#             line_items=line_items,
#             success_url=success_url,
#             cancel_url=cancel_url,
#             customer_email=customer_email,
#             allow_promotion_codes=True,
#             billing_address_collection="auto",
#             metadata={
#                 "clerk_user_id": clerk_user_id,
#                 "guest_session_id": guest_session_id,
#                 "origin": "django-backend",
#             },
#             client_reference_id=clerk_user_id or guest_session_id or None,
#             idempotency_key=idem_key,
#         )

#         # Persist the snapshot rows keyed by this Checkout Session
#         if snapshot_items:
#             cs_id = session.id
#             for d in snapshot_items:
#                 d["checkout_session_id"] = cs_id
#             CheckoutCart.objects.bulk_create([CheckoutCart(**d) for d in snapshot_items])

#         return JsonResponse({"id": session.id, "url": session.url}, status=status.HTTP_200_OK)

#     except stripe.error.StripeError as e:
#         return JsonResponse({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
#     except Exception as e:
#         return JsonResponse({"error": f"Unexpected error: {e}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# create_checkout_session.throttle_scope = "checkout"


def _send_order_receipt(order_id: int, resend: bool = False) -> None:
    """
    Send the order receipt e-mail.
    - Normal mode (resend=False): idempotent; sends only once per order.
    - Resend mode (resend=True): always send, and tweak the subject to avoid
      Gmail conversation threading.
    """
    try:
        order = Order.objects.get(pk=order_id)
    except Order.DoesNotExist:
        return

    # Idempotency + safety: in normal mode, bail if already sent or no email.
    if not order.user_email:
        return
    if not resend and order.receipt_emailed:
        return

    items = list(order.items.values("variant_id", "size", "color", "quantity", "price"))
    ctx = {
        "order_id": order.id,
        "first_name": order.first_name or "",
        "items": items,
        "total": order.total_price,
    }

    subject = f"Cove — your order #{order.id} receipt"
    if resend:
        subject += " (copy)"

    text_body = render_to_string("emails/order_receipt.txt", ctx)
    html_body = render_to_string("emails/order_receipt.html", ctx)

    headers = {"X-Cove-Resent": "1"} if resend else None

    msg = EmailMultiAlternatives(
        subject=subject,
        body=text_body,
        from_email=settings.EMAIL_HOST_USER,
        to=[order.user_email],
        headers=headers,
    )
    msg.attach_alternative(html_body, "text/html")

    try:
        # Keep fail_silently=True so webhooks aren’t blocked by SMTP hiccups.
        msg.send(fail_silently=True)
    except Exception:
        # Best-effort logging; won’t crash the webhook.
        log.exception("Failed to send receipt email for order %s", order.id)

    # Mark as sent (normal path); resends don’t need to change this flag.
    if not order.receipt_emailed:
        order.receipt_emailed = True
        order.save(update_fields=["receipt_emailed"])


@csrf_exempt
def stripe_webhook(request):
    """Handle Stripe events: checkout.session.completed, payment_failed, refunded."""
    if request.method != "POST":
        return HttpResponse(status=405)

    payload = request.body
    sig_header = request.headers.get("Stripe-Signature") or request.META.get("HTTP_STRIPE_SIGNATURE")
    endpoint_secret = getattr(settings, "STRIPE_WEBHOOK_SECRET", None)
    if not endpoint_secret:
        return JsonResponse({"error": "STRIPE_WEBHOOK_SECRET not set"}, status=500)

    # Verify + dedupe by event id (exactly-once)
    try:
        event = stripe.Webhook.construct_event(payload, sig_header, endpoint_secret)
        try:
            record, created = StripeEvent.objects.get_or_create(
                event_id=event["id"],
                defaults={"type": event.get("type", ""), "payload": event},
            )
            if not created:
                return JsonResponse({"ok": True, "duplicate": True})
        except Exception:
            # Don't fail the webhook if event logging fails
            pass
    except ValueError:
        return JsonResponse({"error": "invalid_payload"}, status=400)
    except stripe.error.SignatureVerificationError:
        return JsonResponse({"error": "invalid_signature"}, status=400)

    etype = event.get("type")
    data = event["data"]["object"]
    
    
    
    
    
    

    # # ---------------------------
    # # 1) Successful Checkout
    # # ---------------------------

    
    
    if etype == "checkout.session.completed":
        session = data
        checkout_session_id = session["id"]
        # payment_intent_id = session.get("payment_intent") or session.get("id")
        payment_intent_id = session.get("payment_intent") or checkout_session_id
        metadata = session.get("metadata") or {}

        # Buyer
        clerk_user_id = metadata.get("clerk_user_id") or None
        guest_session_id = metadata.get("guest_session_id") or None
        first_name = (metadata.get("first_name") or "") or None
        last_name = (metadata.get("last_name") or "") or None
        user_email = (
            (session.get("customer_details") or {}).get("email")
            or metadata.get("user_email")
            or None
        )
        user = User.objects.filter(user_id=clerk_user_id).first() if clerk_user_id else None
        is_guest = bool((metadata.get("is_guest") or "").lower() == "true" or not user)

        # Prefer our snapshot (match by PI OR Checkout Session)
        cart_items_qs = CheckoutCart.objects.filter(
        Q(payment_intent_id=payment_intent_id) | Q(checkout_session_id=checkout_session_id)
    )
        cart_items = list(cart_items_qs)
        snapshot = cart_items[0] if cart_items else None

        # Backfill PI onto snapshots matched by session
        if payment_intent_id:
            CheckoutCart.objects.filter(
                checkout_session_id=checkout_session_id, payment_intent_id__isnull=True
            ).update(payment_intent_id=payment_intent_id)
            
            # Prefer identifiers/emails from snapshot if metadata didn’t provide them
        if snapshot:
            clerk_user_id    = clerk_user_id    or snapshot.clerk_user_id
            guest_session_id = guest_session_id or snapshot.guest_session_id
            user_email       = user_email       or snapshot.user_email
            # keep first/last if you store them on snapshot
            first_name       = first_name       or getattr(snapshot, "first_name", None)
            last_name        = last_name        or getattr(snapshot, "last_name", None)
            is_guest         = getattr(snapshot, "is_guest", is_guest)

        # Total
        total_price = _d(session.get("amount_total"))
        if (not total_price) and cart_items:
            total_price = sum((ci.total_price or Decimal("0.00") for ci in cart_items), Decimal("0.00"))
            
        # Idempotent order
        order, created = Order.objects.get_or_create(
            payment_intent_id=payment_intent_id or "",
            defaults={
                "user": user,
                "is_guest": is_guest,
                "total_price": total_price or Decimal("0.00"),
                "clerk_user_id": clerk_user_id,
                "guest_session_id": guest_session_id,
                "user_email": user_email,
                "first_name": first_name,
                "last_name": last_name,
                "status": Order.STATUS_PENDING,
            },
        )
        
        # 🔧 CRITICAL: Backfill fields EVEN IF the order already existed (defaults are ignored then)
        changed = False
        
        if order.status != Order.STATUS_PAID:
            order.status = Order.STATUS_PAID
            changed = True
            
        if not order.user and user:
            order.user = user
            changed = True  
            
        if not order.clerk_user_id and clerk_user_id:
            order.clerk_user_id = clerk_user_id
            changed = True

        if not order.guest_session_id and guest_session_id:
            order.guest_session_id = guest_session_id
            changed = True

        if not order.user_email and user_email:
            order.user_email = user_email
            changed = True

        if not order.first_name and first_name:
            order.first_name = first_name
            changed = True

        if not order.last_name and last_name:
            order.last_name = last_name
            changed = True

        if (not order.total_price or order.total_price == 0) and total_price:
            order.total_price = total_price
            changed = True
            

        if changed:
            order.save()
            
        # ---- ENRICH ORDER FROM STRIPE (always trust Stripe for money & address) ----
        def _cents_to_dec(v):
            try:
                return (Decimal(int(v or 0)) / Decimal("100")).quantize(Decimal("0.01"))
            except Exception:
                return Decimal("0.00")
            
        # Currency and amounts from Checkout Session
        currency = (session.get("currency") or "eur").upper()
        amount_total = _cents_to_dec(session.get("amount_total"))
        
        shipping_total_cents = (session.get("shipping_cost") or {}).get("amount_total")
        tax_total_cents = (session.get("total_details") or {}).get("amount_tax")

        # Fallback to PaymentIntent if Stripe didn’t put it on the Session
        if shipping_total_cents is None or tax_total_cents is None:
            try:
                pi = stripe.PaymentIntent.retrieve(
                    session.get("payment_intent"),
                    expand=["charges", "latest_charge"]
                )
                # PI often has tax in total_details
                if tax_total_cents is None:
                    td = (pi.get("total_details") or {})
                    if td.get("amount_tax") is not None:
                        tax_total_cents = td["amount_tax"]
                        
                # Shipping is most reliable on the Session; leave as-is if None
            except Exception:
                pass
            
        shipping_cost = _cents_to_dec(shipping_total_cents)
        tax_amount = _cents_to_dec(tax_total_cents)
        
        # Prefer shipping_details; fallback to customer_details
        customer_details = session.get("customer_details") or {}
        shipping_details = session.get("shipping_details") or {}
        addr = (shipping_details.get("address") or customer_details.get("address") or {}) or {}
        shipping_name = (shipping_details.get("name") or customer_details.get("name"))
        
        updates: dict[str, object] = {}
        
        # Keep DB currency in sync
        if currency and getattr(order, "currency", None) != currency:
            updates["currency"] = currency
            
        # ALWAYS enforce Stripe-derived money fields to prevent stale values
        updates["shipping_cost"] = shipping_cost
        updates["tax_amount"] = tax_amount
        if amount_total is not None and amount_total != order.total_price:
            updates["total_price"] = amount_total
            
        # Name/address — set when different (safe to overwrite)
        if shipping_name and (order.shipping_name != shipping_name):
            updates["shipping_name"] = shipping_name
            
        def _set_addr(field: str, key: str):
            val = addr.get(key)
            # update when changed (covers both empty → value and value → new)
            if val is not None and getattr(order, field, None) != val:
                updates[field] = val
                
        _set_addr("shipping_address_line1", "line1")
        _set_addr("shipping_address_line2", "line2")
        _set_addr("shipping_city", "city")
        _set_addr("shipping_state", "state")
        _set_addr("shipping_postal_code", "postal_code")
        _set_addr("shipping_country", "country")
        
        if updates:
            # single UPDATE for atomicity + performance
            Order.objects.filter(pk=order.pk).update(**updates)
            # reflect changes on the in-memory instance for later logic
            for k, v in updates.items():
                setattr(order, k, v)
                
        # Save Stripe line items snapshot for UI (with per-line taxes)
        try:
            li = stripe.checkout.Session.list_line_items(
                session["id"],
                limit=100,
                expand=["data.taxes"]  # include rate & jurisdiction per product line
                )
            
            render_items = []
            for row in li["data"]:
                d = row.to_dict_recursive()
                render_items.append({
                    "type": "product",
                    "description": d.get("description"),
                    "quantity": d.get("quantity"),
                    "amount_subtotal": d.get("amount_subtotal"),  # cents
                    "amount_tax": d.get("amount_tax"),            # cents
                    "amount_total": d.get("amount_total"),        # cents
                    "taxes": d.get("taxes"),                      # [{amount, rate{percentage,country,...}, ...}]
                    })
                
            # Add a synthetic shipping line so the UI can show shipping VAT too
            sc = (session.get("shipping_cost") or {})
            if sc:
                render_items.append({
                    "type": "shipping",
                    "description": "Shipping",
                    "quantity": 1,
                    "amount_subtotal": sc.get("amount_subtotal") or 0,
                    "amount_tax": sc.get("amount_tax") or 0,
                    "amount_total": sc.get("amount_total") or 0,
                    "taxes": None,  # shipping tax rate isn’t exposed per-line
                    })
                
            order.items_json = render_items
            order.save(update_fields=["items_json"])
            
        except Exception as e:
            print("items_json persist error:", e)
            
            
        # Already processed with items → mark PAID, email, return
        
        if not created and order.items.exists():
            transaction.on_commit(lambda: _send_order_receipt(order.id))
            return JsonResponse({"ok": True, "idempotent": True, "order_id": order.id})
        
        # if not created and order.items.exists():
        #     if order.status != Order.STATUS_PAID:
        #         order.status = Order.STATUS_PAID
        #         order.save(update_fields=["status"])
        #     transaction.on_commit(lambda: _send_order_receipt(order.id))
        #     return JsonResponse({"ok": True, "idempotent": True, "order_id": order.id})
        
        

        # Create items (snapshot preferred)
        if cart_items:
            for ci in cart_items:
                OrderItem.objects.create(
                    order=order,
                    product_id=ci.product_id,
                    variant_id=ci.variant_id,
                    size=ci.size,
                    color=ci.color_name,
                    quantity=ci.quantity,
                    price=ci.price_per_unit,
                    user_email=ci.user_email or user_email,
                )
                OrderSummary.objects.create(
                    user=user,
                    is_guest=is_guest,
                    payment_intent_id=payment_intent_id or "",
                    product_id=ci.product_id,
                    variant_id=ci.variant_id,
                    color=ci.color_name,
                    size=ci.size,
                    quantity=ci.quantity,
                    price=ci.price_per_unit,
                    created_at=order.created_at,
                    clerk_user_id=clerk_user_id,
                    guest_session_id=guest_session_id,
                    user_email=ci.user_email or user_email,
                    first_name=first_name,
                    last_name=last_name,
                )
        else:
            # Fallback: Stripe line items
            try:
                line_items = stripe.checkout.Session.list_line_items(
                    session["id"], expand=["data.price.product"]
                )
            except Exception as e:
                log.exception("Failed to list Stripe line items")
                return JsonResponse({"error": str(e)}, status=400)

            if not order.items.exists():
                for li in line_items.get("data", []):
                    qty = li.get("quantity") or 1
                    price_obj = li.get("price") or {}
                    product_obj = price_obj.get("product") or {}
                    price_dec = _d(price_obj.get("unit_amount") or 0)

                    meta = {}
                    meta.update(product_obj.get("metadata") or {})
                    meta.update(price_obj.get("metadata") or {})
                    meta.update(li.get("metadata") or {})

                    OrderItem.objects.create(
                        order=order,
                        product_id=str(price_obj.get("product") or ""),
                        variant_id=str(meta.get("variantId") or meta.get("variant_id") or ""),
                        size=str(meta.get("size") or ""),
                        color=str(meta.get("color") or ""),
                        quantity=qty,
                        price=price_dec,
                        user_email=user_email or None,
                    )
                    OrderSummary.objects.create(
                        user=user,
                        is_guest=is_guest,
                        payment_intent_id=payment_intent_id or "",
                        product_id=str(price_obj.get("product") or ""),
                        variant_id=str(meta.get("variantId") or meta.get("variant_id") or ""),
                        color=str(meta.get("color") or ""),
                        size=str(meta.get("size") or ""),
                        quantity=qty,
                        price=price_dec,
                        created_at=order.created_at,
                        clerk_user_id=clerk_user_id,
                        guest_session_id=guest_session_id,
                        user_email=user_email or None,
                        first_name=first_name or None,
                        last_name=last_name or None,
                    )

        # ---- Transactional inventory decrement (idempotent) ----
        oversold = []
        try:
            with transaction.atomic():
                ord_locked = Order.objects.select_for_update().get(pk=order.pk)
                if not ord_locked.inventory_decremented:
                    if cart_items:
                        to_decrement = [(ci.variant_id, ci.size, ci.quantity) for ci in cart_items]
                    else:
                        to_decrement = [(oi.variant_id, oi.size, oi.quantity) for oi in ord_locked.items.all()]

                    from catalog.models import SizeStockPrice  # local import

                    for variant_id, size, qty in to_decrement:
                        ssp = SizeStockPrice.objects.select_for_update().get(
                            variant__variant_id=variant_id, size=size
                        )
                        if ssp.quantity < qty:
                            oversold.append({
                                "variantId": variant_id,
                                "size": size,
                                "requested": qty,
                                "available": ssp.quantity,
                            })
                            continue
                        ssp.quantity = ssp.quantity - qty
                        ssp.save(update_fields=["quantity"])

                    ord_locked.inventory_decremented = True
                    ord_locked.save(update_fields=["inventory_decremented"])
        except Exception as e:
            log.exception("Inventory decrement failed: %s", e)
            oversold.append({"error": str(e)})

        # Mark PAID & send receipt after commit
        # if order.status != Order.STATUS_PAID:
        #     order.status = Order.STATUS_PAID
        #     order.save(update_fields=["status"])
        # transaction.on_commit(lambda: _send_order_receipt(order.id))
        
        # Send receipt after commit (status already set to PAID above)
        transaction.on_commit(lambda: _send_order_receipt(order.id))

        return JsonResponse({
            "ok": True,
            "order_id": order.id,
            "inventory_decremented": True,
            "oversold": oversold,
        })
    
    
    

    # ---------------------------
    # 2) Payment failed
    # ---------------------------
    
    elif etype == "payment_intent.payment_failed":
        pi = data.get("id")
        if pi:
            try:
                order = Order.objects.get(payment_intent_id=pi)
                if order.status != Order.STATUS_FAILED:
                    order.status = Order.STATUS_FAILED
                    order.save(update_fields=["status"])
            except Order.DoesNotExist:
                pass
        return JsonResponse({"ok": True, "handled": etype})

    # ---------------------------
    # 3) Charge refunded (optional restock)
    # ---------------------------
    elif etype == "charge.refunded":
        pi = data.get("payment_intent")
        if pi:
            try:
                with transaction.atomic():
                    order = Order.objects.select_for_update().get(payment_intent_id=pi)
                    order.status = Order.STATUS_REFUNDED
                    order.save(update_fields=["status"])

                    refunded = int(data.get("amount_refunded") or 0)
                    charge_amount = int(data.get("amount") or 0)
                    is_full_refund = charge_amount and refunded >= charge_amount

                    if settings.AUTO_RESTOCK_ON_REFUND and is_full_refund and order.inventory_decremented:
                        from catalog.models import SizeStockPrice
                        for oi in order.items.all():
                            ssp = SizeStockPrice.objects.select_for_update().get(
                                variant__variant_id=oi.variant_id, size=oi.size
                            )
                            ssp.quantity = ssp.quantity + oi.quantity
                            ssp.save(update_fields=["quantity"])
                        order.inventory_decremented = False
                        order.save(update_fields=["inventory_decremented"])
            except Order.DoesNotExist:
                pass
        return JsonResponse({"ok": True, "handled": etype})

    # Everything else -> ignore
    else:
        return JsonResponse({"ok": True, "ignored": etype})
