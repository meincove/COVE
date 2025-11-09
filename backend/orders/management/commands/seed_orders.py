# backend/orders/management/commands/seed_orders.py
from __future__ import annotations
from typing import Iterable

from decimal import Decimal, ROUND_HALF_UP
from django.apps import apps
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction
from django.core.exceptions import FieldError
from django.contrib.auth import get_user_model

def money(value) -> Decimal:
    return Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

def get_model(app_label: str, *candidates: str):
    for name in candidates:
        try:
            return apps.get_model(app_label, name)
        except LookupError:
            continue
    raise LookupError(f"[seed_orders] Could not find any of {candidates} in app '{app_label}'")

OrderModel     = get_model("orders", "Order", "Orders", "Purchase")
OrderItemModel = get_model("orders", "OrderItem", "Item", "OrderLine")

def has_field(obj, name: str) -> bool:
    try:
        obj._meta.get_field(name)
        return True
    except Exception:
        return hasattr(obj, name)

def set_first(obj, names: Iterable[str], value):
    for n in names:
        if has_field(obj, n):
            setattr(obj, n, value)
            return n
    return None

def get_first(obj, names: Iterable[str], default=None):
    for n in names:
        if hasattr(obj, n):
            return getattr(obj, n)
    return default

def attach_item(order_obj, **values):
    it = OrderItemModel()
    # FK to order
    for n in ("order", "purchase", "parent", "orders"):
        if has_field(it, n):
            setattr(it, n, order_obj)
            break

    set_first(it, ("variant_id", "variantId", "sku", "product_code"), values.get("variantId", "SKU-001"))
    set_first(it, ("size",), values.get("size", "M"))
    set_first(it, ("quantity", "qty"), int(values.get("qty", 1)))
    set_first(it, ("unit_price", "price"), money(values.get("unit_price", "9.99")))
    # optional line_total field
    set_first(it, ("line_total", "total"), money(values.get("line_total", "9.99")))
    it.save()
    return it

def compute_subtotal(order_obj) -> Decimal:
    for n in ("items", "orderitem_set", "lines", "order_lines"):
        if hasattr(order_obj, n):
            rel = getattr(order_obj, n)
            break
    else:
        return Decimal("0.00")

    items = list(rel.all() if hasattr(rel, "all") else rel)
    subtotal = Decimal("0.00")
    for it in items:
        qty  = Decimal(str(get_first(it, ("quantity", "qty"), 0) or 0))
        unit = Decimal(str(get_first(it, ("unit_price", "price"), "0.00") or "0.00"))
        lt   = get_first(it, ("line_total", "total"), None)
        subtotal += (Decimal(str(lt)) if lt is not None else (qty * unit))
    return money(subtotal)

class Command(BaseCommand):
    help = "Seed a demo paid order with 2 items for quick API testing."

    def add_arguments(self, parser):
        parser.add_argument("--email", default="test@example.com")
        parser.add_argument("--user", dest="user_id_str", default=None, help="string user id (e.g., Clerk ID)")
        parser.add_argument("--user-int", dest="user_id_int", type=int, default=None, help="integer user pk for FK fields")
        parser.add_argument("--guest", dest="guest_session_id", default="demo-guest-1")
        parser.add_argument("--currency", default="EUR")
        parser.add_argument("--status", default="paid")

    @transaction.atomic
    def handle(self, *args, **opts):
        email  = opts["email"]
        uid_s  = opts["user_id_str"]
        uid_i  = opts["user_id_int"]
        guest  = opts["guest_session_id"]
        curr   = opts["currency"]
        status = opts["status"]

        # idempotency marker
        marker_external = f"SEED-{email}"
        try:
            existing = OrderModel.objects.filter(external_id=marker_external)
        except FieldError:
            try:
                existing = OrderModel.objects.filter(reference=marker_external)
            except FieldError:
                existing = OrderModel.objects.none()
        if existing.exists():
            o = existing.first()
            self.stdout.write(self.style.SUCCESS(f"[seed_orders] Already seeded: order_id={o.pk}"))
            return

        o = OrderModel()

        # ---- identity (FK-safe) ----
        fk_user_field = None
        for cand in ("user", "customer", "account"):
            try:
                f = OrderModel._meta.get_field(cand)
                if getattr(f, "many_to_one", False) or f.get_internal_type() == "ForeignKey":
                    fk_user_field = cand
                    break
            except Exception:
                pass

        if fk_user_field and uid_i is not None:
            # assign FK id directly (avoids fetching)
            try:
                setattr(o, f"{fk_user_field}_id", uid_i)
            except Exception:
                # fallback: fetch instance
                User = get_user_model()
                setattr(o, fk_user_field, User.objects.get(pk=uid_i))

        if uid_s:
            set_first(o, ("clerk_user_id", "customer_id", "user_external_id"), uid_s)

        set_first(o, ("email", "customer_email", "billing_email"), email)
        set_first(o, ("guest_session_id", "guest_id"), guest)
        set_first(o, ("currency",), curr)
        set_first(o, ("status",), status)
        set_first(o, ("created_at", "created", "timestamp"), timezone.now())
        set_first(o, ("external_id", "reference"), marker_external)

        # ✅ initialize required total-like field BEFORE first save
        set_first(o, ("total_price", "subtotal", "total", "amount"), Decimal("0.00"))
        o.save()

        # items
        attach_item(o, variantId="OBMR001", size="M", qty=2, unit_price="69.99")
        attach_item(o, variantId="OBMR002", size="L", qty=1, unit_price="69.99")

        # compute and persist total
        subtotal = compute_subtotal(o)
        set_first(o, ("total_price", "subtotal", "total", "amount"), subtotal)
        o.save()

        self.stdout.write(self.style.SUCCESS(
            f"[seed_orders] Seeded order_id={o.pk} email={email} subtotal={subtotal}"
        ))
