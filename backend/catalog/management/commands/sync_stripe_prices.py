import sys
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction
from django.conf import settings

import stripe

from catalog.models import SizeStockPrice

def _to_cents(val) -> int:
    return int(Decimal(str(val)).quantize(Decimal("0.01")) * 100)


class Command(BaseCommand):
    help = (
        "Create Stripe Products (per ColorGroup) and Prices (per size) for any "
        "SizeStockPrice rows missing stripe_product_id / stripe_price_id.\n"
        "By default this is a DRY RUN. Pass --commit to write changes."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--variant",
            type=str,
            help="Limit to a single variant_id (ColorGroup.variant_id).",
        )
        parser.add_argument(
            "--commit",
            action="store_true",
            help="Actually create/update in Stripe and save IDs in DB.",
        )
        parser.add_argument(
            "--fix-mismatch",
            action="store_true",
            help="If an existing stripe_price_id points to a different amount/currency, create a new Price and replace it.",
        )

    def handle(self, *args, **opts):
        commit = bool(opts.get("commit"))
        fix_mismatch = bool(opts.get("fix_mismatch"))
        only_variant = opts.get("variant")

        if not settings.STRIPE_SECRET_KEY:
            self.stderr.write(self.style.ERROR("STRIPE_SECRET_KEY not set."))
            sys.exit(1)

        currency = getattr(settings, "STRIPE_CURRENCY", "eur").lower()
        stripe.api_key = settings.STRIPE_SECRET_KEY

        qs = (
            SizeStockPrice.objects
            .select_related("variant", "variant__product")
            .order_by("variant__variant_id", "size")
        )
        if only_variant:
            qs = qs.filter(variant__variant_id=only_variant)

        total = qs.count()
        if total == 0:
            self.stdout.write(self.style.WARNING("No SizeStockPrice rows found."))
            return

        self.stdout.write(f"Scanning {total} size/stock rows (currency={currency})...")
        created_products = 0
        created_prices = 0
        fixed_prices = 0

        # For re-use within a variant
        variant_to_product_id = {}

        # Seed map with any already-known product IDs
        for s in qs:
            if s.stripe_product_id:
                variant_to_product_id[s.variant.variant_id] = s.stripe_product_id

        for ssp in qs:
            variant = ssp.variant
            product = variant.product
            variant_id = variant.variant_id
            size = ssp.size

            # Ensure Stripe Product (1 per variant/color)
            stripe_product_id = variant_to_product_id.get(variant_id) or ssp.stripe_product_id

            if not stripe_product_id:
                name = f"{product.name} - {variant.color_name}"
                meta = {
                    "variant_id": variant_id,
                    "product_id": product.product_id,
                    "slug": getattr(product, "slug", "") or "",
                }

                if commit:
                    sp = stripe.Product.create(name=name, metadata=meta)
                    stripe_product_id = sp.id
                    created_products += 1

                    # Update all rows of this variant that lack product id
                    SizeStockPrice.objects.filter(
                        variant=variant, stripe_product_id__isnull=True
                    ).update(stripe_product_id=stripe_product_id)
                else:
                    self.stdout.write(self.style.WARNING(f"DRY-RUN would create Product: {name} meta={meta}"))
                    stripe_product_id = "<to-be-created>"

                variant_to_product_id[variant_id] = stripe_product_id

            # Ensure Stripe Price for this size
            price_cents = _to_cents(ssp.price)
            needs_price = not ssp.stripe_price_id
            replace_price = False

            if ssp.stripe_price_id and fix_mismatch and commit:
                # Verify existing price matches DB amount/currency; if not, replace it.
                try:
                    price_obj = stripe.Price.retrieve(ssp.stripe_price_id)
                    curr = (price_obj.get("currency") or "").lower()
                    amount = int(price_obj.get("unit_amount") or 0)
                    if curr != currency or amount != price_cents:
                        replace_price = True
                except Exception:
                    # If retrieve fails, create a fresh price
                    replace_price = True

            if needs_price or replace_price:
                if commit:
                    if replace_price:
                        # Deactivate old price to avoid confusion
                        try:
                            stripe.Price.modify(ssp.stripe_price_id, active=False)
                        except Exception:
                            pass

                    pr = stripe.Price.create(
                        product=stripe_product_id if stripe_product_id != "<to-be-created>" else None,
                        currency=currency,
                        unit_amount=price_cents,
                        nickname=f"{variant_id}-{size}",
                        metadata={"variant_id": variant_id, "size": size},
                    )
                    ssp.stripe_price_id = pr.id
                    # backfill product id too if we were in dry-run case above
                    if stripe_product_id and stripe_product_id != "<to-be-created>":
                        ssp.stripe_product_id = stripe_product_id
                    ssp.save(update_fields=["stripe_price_id", "stripe_product_id"])
                    if replace_price:
                        fixed_prices += 1
                    else:
                        created_prices += 1
                else:
                    action = "REPLACE price" if replace_price else "CREATE price"
                    self.stdout.write(self.style.WARNING(
                        f"DRY-RUN would {action}: {variant_id} {size} -> {price_cents} {currency}"
                    ))

        msg = f"Done. Products created: {created_products}, Prices created: {created_prices}"
        if fix_mismatch:
            msg += f", Prices replaced: {fixed_prices}"
        if not commit:
            msg = "DRY-RUN. " + msg
        self.stdout.write(self.style.SUCCESS(msg))
