from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions, throttling
from django.utils import timezone
from .serializers import OrderSerializer
from .models import Order, OrderItem, OrderSummary, CheckoutCart


class SaveOrderView(APIView):
    def post(self, request):
        data = request.data
        print("[DEBUG] Incoming SaveOrderView payload:", data)

        # Auth / identity flags
        is_django_user = request.user.is_authenticated
        django_user = request.user if is_django_user else None
        is_guest = not is_django_user

        # Extract Clerk/guest info
        clerk_user_id = data.get("clerk_user_id")
        guest_session_id = data.get("guest_session_id")
        first_name = data.get("first_name")
        last_name = data.get("last_name")
        user_email = data.get("user_email")

        # Auto-increment user number for CheckoutCart tracking
        last_cart = CheckoutCart.objects.order_by("-id").first()
        user_number = last_cart.user + 1 if last_cart and last_cart.user else 1

        # ✅ Create the Order (now includes shipping/tax fields if provided)
        order = Order.objects.create(
            user=django_user,
            is_guest=is_guest,
            total_price=data["totalAmount"],
            payment_intent_id=data["paymentIntentId"],
            clerk_user_id=clerk_user_id,
            guest_session_id=guest_session_id,
            first_name=first_name,
            last_name=last_name,
            user_email=user_email,
            # new optional fields
            currency=data.get("currency", "EUR"),
            shipping_name=data.get("shipping_name"),
            shipping_address_line1=data.get("shipping_address_line1"),
            shipping_address_line2=data.get("shipping_address_line2"),
            shipping_city=data.get("shipping_city"),
            shipping_state=data.get("shipping_state"),
            shipping_postal_code=data.get("shipping_postal_code"),
            shipping_country=data.get("shipping_country"),
            shipping_cost=data.get("shipping_cost", 0),
            tax_amount=data.get("tax_amount", 0),
        )

        for item in data["cart"]:
            # Save to OrderItem
            OrderItem.objects.create(
                order=order,
                product_id=item["productId"],
                variant_id=item["variantId"],
                size=item["size"],
                color=item["color"],
                quantity=item["quantity"],
                price=item["price"],
                user_email=user_email,
            )

            # Save to OrderSummary
            OrderSummary.objects.create(
                user=django_user,
                is_guest=is_guest,
                payment_intent_id=data["paymentIntentId"],
                product_id=item["productId"],
                variant_id=item["variantId"],
                color=item["color"],
                size=item["size"],
                quantity=item["quantity"],
                price=item["price"],
                created_at=timezone.now(),
                clerk_user_id=clerk_user_id,
                guest_session_id=guest_session_id,
                first_name=first_name,
                last_name=last_name,
                user_email=user_email,
            )

            # Save to CheckoutCart
            CheckoutCart.objects.create(
                user=user_number,
                is_guest=is_guest,
                clerk_user_id=clerk_user_id,
                guest_session_id=guest_session_id,
                payment_intent_id=data["paymentIntentId"],
                checkout_session_id=data.get("checkoutSessionId"),

                product_id=item["productId"],
                variant_id=item["variantId"],
                name=item.get("name"),
                type=item.get("type"),
                tier=item.get("tier"),

                first_name=first_name,
                last_name=last_name,
                size=item["size"],
                color_name=item["colorName"],
                quantity=item["quantity"],
                price_per_unit=item["price"],
                total_price=round(item["price"] * item["quantity"], 2),
                user_email=user_email,
            )

        return Response(
            {"message": "Order saved successfully", "order_id": order.id},
            status=status.HTTP_201_CREATED,
        )


class OrdersMineThrottle(throttling.ScopedRateThrottle):
    scope = "orders_mine"


class MyOrdersView(APIView):
    """
    GET /api/orders/mine/?clerkUserId=... | ?guestSessionId=... | ?email=... | ?paymentIntentId=...
    Priority: clerkUserId > guestSessionId > email > paymentIntentId
    """
    permission_classes = [permissions.AllowAny]
    throttle_classes = [OrdersMineThrottle]

    def get(self, request):
        clerk_user_id = request.query_params.get("clerkUserId")
        guest_session_id = request.query_params.get("guestSessionId")
        email = request.query_params.get("email")
        payment_intent_id = request.query_params.get("paymentIntentId")

        try:
            limit = int(request.query_params.get("limit", "20"))
        except ValueError:
            limit = 20

        if not (clerk_user_id or guest_session_id or email or payment_intent_id):
            return Response(
                {"detail": "Provide clerkUserId or guestSessionId or email or paymentIntentId."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        qs = Order.objects.all().order_by("-created_at")

        if clerk_user_id:
            qs = qs.filter(clerk_user_id=clerk_user_id)
        elif guest_session_id:
            qs = qs.filter(guest_session_id=guest_session_id)
        elif email:
            qs = qs.filter(user_email__iexact=email.strip())
        else:
            qs = qs.filter(payment_intent_id=payment_intent_id)

        qs = qs.prefetch_related("items")[:limit]

        return Response(OrderSerializer(qs, many=True).data, status=200)
