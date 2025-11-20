import os
import json
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.conf import settings

from catalog.models import (
    ProductMasterGroup,
    ColorGroup,
    ProductImage,
    SizeStockPrice,
)


class Command(BaseCommand):
    help = (
        "DEV ONLY: reset catalog tables and import from "
        "productVariantsFlat.json (flat per-variant records)."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--path",
            default=None,
            help=(
                "Optional path to productVariantsFlat.json "
                "(defaults to BASE_DIR/data/productVariantsFlat.json)"
            ),
        )

    def handle(self, *args, **kwargs):
        # -----------------------------
        # 0) Resolve JSON path
        # -----------------------------
        custom_path = kwargs.get("path")
        if custom_path:
            data_path = os.path.abspath(custom_path)
        else:
            data_path = os.path.join(settings.BASE_DIR, "data", "productVariantsFlat.json")

        if not os.path.exists(data_path):
            self.stderr.write(self.style.ERROR(f"File not found: {data_path}"))
            return

        self.stdout.write(self.style.NOTICE(f"Loading catalog from: {data_path}"))

        with open(data_path, "r", encoding="utf-8") as f:
            data = json.load(f)

        if not isinstance(data, list):
            self.stderr.write(self.style.ERROR("Expected a flat list of variant records in JSON."))
            return

        # -----------------------------
        # 1) Hard reset catalog tables
        # -----------------------------
        self.stdout.write(self.style.WARNING("Resetting catalog tables (DEV ONLY)..."))
        SizeStockPrice.objects.all().delete()
        ProductImage.objects.all().delete()
        ColorGroup.objects.all().delete()
        ProductMasterGroup.objects.all().delete()

        # -----------------------------
        # 2) Import flat variants
        # -----------------------------
        total_groups_created = 0
        total_variants_created = 0

        # groupId -> already created?
        seen_groups = {}

        for rec in data:
            variant_id = rec.get("variantId")
            group_id = rec.get("groupId")
            group_slug = rec.get("groupSlug")

            if not group_id or not group_slug:
                self.stderr.write(
                    self.style.WARNING(
                        f"Skipping record without groupId/groupSlug (variantId={variant_id})"
                    )
                )
                continue

            if not variant_id:
                self.stderr.write(
                    self.style.WARNING(
                        f"Skipping record without variantId for groupId={group_id}"
                    )
                )
                continue

            # -------------------------
            # 2a) Create ProductMasterGroup once per group_id
            # -------------------------
            if group_id in seen_groups:
                master = seen_groups[group_id]
            else:
                base_price = rec.get("price") or 0
                try:
                    base_price = Decimal(str(base_price))
                except Exception:
                    base_price = Decimal("0.00")

                fit_profile = rec.get("fitProfile") or {}
                fit_value = rec.get("fit") or fit_profile.get("fit") or ""

                master = ProductMasterGroup.objects.create(
                    product_id=group_id,
                    name=rec.get("name") or "",
                    slug=group_slug,
                    tier=rec.get("tier") or "",
                    type=rec.get("type") or "",
                    material=rec.get("material") or "",
                    gender=rec.get("gender") or "",
                    fit=fit_value,
                    description=rec.get("description") or "",
                    base_price=base_price,
                )
                seen_groups[group_id] = master
                total_groups_created += 1
                self.stdout.write(self.style.SUCCESS(f"Created product group: {master.product_id}"))

            # -------------------------
            # 2b) Create ColorGroup (variant)
            # -------------------------
            variant = ColorGroup.objects.create(
                variant_id=variant_id,
                product=master,
                color_name=rec.get("colorName") or "",
                hex=rec.get("hex") or "",
                slug=group_slug,  # same as master
            )
            total_variants_created += 1
            self.stdout.write(f"  └─ Variant created: {variant.variant_id}")

            # -------------------------
            # 2c) Images for this variant
            # -------------------------
            for img_name in rec.get("images") or []:
                if not img_name:
                    continue
                ProductImage.objects.create(
                    variant=variant,
                    image_name=img_name,
                )

            # -------------------------
            # 2d) Size / stock / price rows
            # -------------------------
            base_price = rec.get("price") or 0
            try:
                base_price = Decimal(str(base_price))
            except Exception:
                base_price = Decimal("0.00")

            sizes = rec.get("sizes") or {}
            for size_key, qty_val in sizes.items():
                if not size_key:
                    continue
                try:
                    qty_int = int(qty_val)
                except Exception:
                    qty_int = 0

                SizeStockPrice.objects.create(
                    variant=variant,
                    size=size_key.upper(),
                    quantity=qty_int,
                    price=base_price,
                    # stripe_* fields left null for now
                )

        # -----------------------------
        # 3) Summary
        # -----------------------------
        self.stdout.write(
            self.style.SUCCESS(
                f"\n✅ Import complete.\n"
                f"   Product groups created: {total_groups_created}\n"
                f"   Variants created:       {total_variants_created}"
            )
        )
