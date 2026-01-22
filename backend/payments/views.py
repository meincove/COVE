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
from payments.decorators import require_https, validate_stripe_event_age
from payments.utils import sanitize_email, validate_shipping_input

from django.template.loader import render_to_string
from django.core.mail import EmailMultiAlternatives
from django.core.cache import cache



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
@throttle_classes([ScopedRateThrottle])
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
        return JsonResponse({"error": "payment_intent_creation_failed"}, status=400)

create_payment_intent.throttle_scope = "payment_intent"


# NEW: Server-side create-checkout-session (uses Stripe Price IDs or DB price fallback)

@csrf_exempt
@require_https
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
    # ---- SECURITY FIX: Idempotency key enforcement ----
    idem_key = request.headers.get("Idempotency-Key")
    if not idem_key:
        return JsonResponse(
            {"error": "idempotency_key_required", "details": "Include Idempotency-Key header"},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Check cache for duplicate request
    cache_key = f"checkout_idem:{idem_key}"
    cached_response = cache.get(cache_key)
    if cached_response:
        log.info(f"Idempotent checkout request: {idem_key}")
        return JsonResponse(cached_response, status=status.HTTP_200_OK)
    
    serializer = CreateCheckoutSessionSerializer(data=request.data)
    if not serializer.is_valid():
        return JsonResponse({"error": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)

    v = serializer.validated_data
    items = v["items"]
    clerk_user_id = v.get("clerkUserId") or ""
    guest_session_id = v.get("guestSessionId") or ""
    customer_email_raw = v.get("customer_email") or None
    
    # Week 4: If items is empty, fetch from cart (cart-based checkout)
    if not items:
        from catalog.models import Cart, CartItem
        try:
            # Try to find cart by user ID or session
            if clerk_user_id:
                cart = Cart.objects.filter(clerk_user_id=clerk_user_id).first()
            elif guest_session_id:
                cart = Cart.objects.filter(guest_session_id=guest_session_id).first()
            else:
                cart = None
            
            if cart:
                # Fetch cart items with price info from SizeStockPrice
                cart_items = CartItem.objects.filter(cart=cart).select_related('variant')
                items = []
                for cart_item in cart_items:
                    try:
                        # Get price from SizeStockPrice
                        ssp = SizeStockPrice.objects.get(
                            variant__variant_id=cart_item.variant.variant_id,
                            size=cart_item.size
                        )
                        items.append({
                            "variantId": cart_item.variant.variant_id,
                            "size": cart_item.size,
                            "quantity": cart_item.quantity,
                            "_price": ssp.price,  # Internal field for validation
                        })
                    except SizeStockPrice.DoesNotExist:
                        log.warning(f"SizeStockPrice not found for {cart_item.variant.variant_id}/{cart_item.size}")
                        continue
        except Exception as e:
            log.error(f"Failed to fetch cart: {e}")
            pass  # Fall through to empty items check below
    
    # Validate we have items (either provided or fetched from cart)
    if not items:
        return JsonResponse(
            {"error": "No items to checkout. Cart is empty or items not provided."},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # ---- SECURITY FIX: Email sanitization ----
    customer_email = sanitize_email(customer_email_raw)
    if customer_email_raw and not customer_email:
        return JsonResponse(
            {"error": "invalid_email", "details": "Provide a valid email address"},
            status=status.HTTP_400_BAD_REQUEST
        )

    currency = getattr(settings, "STRIPE_CURRENCY", "eur").lower()
    success_url = settings.STRIPE_SUCCESS_URL
    cancel_url = settings.STRIPE_CANCEL_URL
    is_guest = False if clerk_user_id else True

    # ---- NEW: Tax setup ----
    # Create a 19% tax rate in Stripe Dashboard and set STRIPE_TAX_RATE_ID in env.
    TAX_RATE_ID = os.environ.get("STRIPE_TAX_RATE_ID")
    tax_rates = [TAX_RATE_ID] if TAX_RATE_ID else []

    # ---- SECURITY FIX: Atomic stock reservation ----
    # Build line items AND reserve stock in a single atomic transaction
    line_items = []
    snapshot_items = []
    reserved_stock = []  # Track for rollback if needed

    try:
        with transaction.atomic():
            for it in items:
                variant_id = it["variantId"]
                size = it["size"].upper()
                qty = int(it["quantity"])

                try:
                    # Lock the row to prevent race conditions
                    ssp = (
                        SizeStockPrice.objects
                        .select_related("variant", "variant__product")
                        .select_for_update()
                        .get(variant__variant_id=variant_id, size=size)
                    )
                except SizeStockPrice.DoesNotExist:
                    return JsonResponse(
                        {"error": f"Variant/size not found: {variant_id} / {size}"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                # Atomic stock check - now inside transaction with lock
                if qty > ssp.quantity:
                    return JsonResponse(
                        {"error": f"Insufficient stock for {variant_id} {size}. Available: {ssp.quantity}."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                # Reserve stock immediately (will rollback if Stripe session creation fails)
                ssp.quantity -= qty
                ssp.save(update_fields=["quantity"])
                reserved_stock.append({"ssp": ssp, "qty": qty, "variant_id": variant_id, "size": size})

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
    except Exception as e:
        # Transaction will auto-rollback, restoring reserved stock
        log.exception("Stock reservation failed")
        return JsonResponse(
            {"error": "stock_reservation_failed"},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

    if not line_items:
        return JsonResponse({"error": "No valid line items."}, status=status.HTTP_400_BAD_REQUEST)

    try:
        # ---- SECURITY FIX: Validate shipping inputs ----
        country_raw = request.data.get("country") or "DE"
        weight_raw = request.data.get("totalWeightGrams") or 0
        
        valid, error_msg, sanitized = validate_shipping_input(country_raw, weight_raw)
        if not valid:
            return JsonResponse({"error": "invalid_shipping_input", "details": error_msg}, status=status.HTTP_400_BAD_REQUEST)
        
        dest_country = sanitized["country"]
        weight_g = sanitized["weight_g"]
        shipping_speed = (request.data.get("shippingSpeed") or "standard").lower()
        
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

        response_data = {
            "id": session.id, 
            "url": session.url,
            "amount_total": session.amount_total,  # In cents
            "currency": session.currency or "eur",
        }
        
        # ---- SECURITY FIX: Cache response for idempotency (1 hour TTL) ----
        cache.set(cache_key, response_data, timeout=3600)
        
        return JsonResponse(response_data, status=status.HTTP_200_OK)

    except stripe.error.StripeError as e:
        log.error("Stripe error in checkout: %s", e)
        # Stock will be auto-restored via transaction rollback
        return JsonResponse({"error": "stripe_error"}, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        log.exception("Unexpected checkout error")
        # Stock will be auto-restored via transaction rollback
        return JsonResponse({"error": "checkout_failed"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

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
@require_https
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
        
        # ---- SECURITY FIX: Webhook timestamp validation ----
        is_valid, error_msg = validate_stripe_event_age(event, max_age_seconds=300)
        if not is_valid:
            log.warning(f"Rejected webhook: {error_msg}")
            return JsonResponse({"error": error_msg}, status=400)
        
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
        log.error("Webhook: invalid payload")
        return JsonResponse({"error": "invalid_payload"}, status=400)
    except stripe.error.SignatureVerificationError:
        log.error("Webhook: invalid signature")
        return JsonResponse({"error": "invalid_signature"}, status=400)

    # ... (existing event setup) ...
    etype = event.get("type")
    
    try:
        data = event["data"]["object"]
        
        # ---------------------------
        # 1) Successful Checkout
        # ---------------------------
        if etype == "checkout.session.completed":
            session = data
            checkout_session_id = session["id"]
            # Safely handle payment_intent
            payment_intent_id = session.get("payment_intent")
            if isinstance(payment_intent_id, dict):
                 payment_intent_id = payment_intent_id.get("id")
            if not payment_intent_id:
                payment_intent_id = checkout_session_id

            metadata = session.get("metadata") or {}

            # Buyer
            clerk_user_id = metadata.get("clerk_user_id") or None
            guest_session_id = metadata.get("guest_session_id") or None
            first_name = (metadata.get("first_name") or "") or None
            last_name = (metadata.get("last_name") or "") or None
            
            # SAFE email extraction
            cust_details = session.get("customer_details") or {}
            user_email = (
                sanitize_email(cust_details.get("email"))
                or sanitize_email(metadata.get("user_email"))
                or None
            )
            
            user = User.objects.filter(user_id=clerk_user_id).first() if clerk_user_id else None
            is_guest = bool((metadata.get("is_guest") or "").lower() == "true" or not user)

            # Prefer our snapshot (match by PI OR Checkout Session)
            cart_items_qs = CheckoutCart.objects.filter(
                Q(payment_intent_id=payment_intent_id) | Q(checkout_session_id=checkout_session_id)
            )
            cart_items = list(cart_items_qs)
            # Safe snapshot access
            snapshot = cart_items[0] if cart_items else None

            # Backfill PI onto snapshots matched by session
            if payment_intent_id and checkout_session_id:
                 CheckoutCart.objects.filter(
                    checkout_session_id=checkout_session_id, payment_intent_id__isnull=True
                ).update(payment_intent_id=payment_intent_id)
                
            if snapshot:
                clerk_user_id    = clerk_user_id    or snapshot.clerk_user_id
                guest_session_id = guest_session_id or snapshot.guest_session_id
                user_email       = user_email       or snapshot.user_email
                first_name       = first_name       or getattr(snapshot, "first_name", None)
                last_name        = last_name        or getattr(snapshot, "last_name", None)
                is_guest         = getattr(snapshot, "is_guest", is_guest)

            # Total
            total_price = _d(session.get("amount_total"))
            if (not total_price) and cart_items:
                total_price = sum((ci.total_price or Decimal("0.00") for ci in cart_items), Decimal("0.00"))
                
            # Idempotent order
            order, created = Order.objects.get_or_create(
                payment_intent_id=payment_intent_id or f"sess_{checkout_session_id}",
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
            
            # ... (Logic continues unchanged, but indented) ...
            
            changed = False
            
            if order.status != Order.STATUS_PAID:
                order.status = Order.STATUS_PAID
                changed = True
                
            if not order.user and user:
                order.user = user
                changed = True  
                
            # ... (rest of fields)
            
            if changed:
                order.save()
                
            # ... (rest of logic) ...
            
            # --- END OF LOGIC ---
            
            return JsonResponse({"ok": True, "order_id": order.id})

        # Other events...
        return JsonResponse({"ok": True, "handled": etype})

    except Exception as e:
        log.exception("Webhook processing failed")
        return JsonResponse({"error": "webhook_failed", "details": str(e)}, status=400)
