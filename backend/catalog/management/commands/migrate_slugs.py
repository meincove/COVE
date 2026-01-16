"""
Django management command to migrate existing product slugs to SEO-friendly format.

Usage:
    python manage.py migrate_slugs --dry-run    # Preview changes
    python manage.py migrate_slugs --commit     # Apply changes
"""
from django.core.management.base import BaseCommand
from catalog.models import ProductMasterGroup, ColorGroup
from catalog.slug_utils import generate_product_slug, generate_variant_slug, ensure_unique_slug


class Command(BaseCommand):
    help = 'Migrate product slugs to SEO-friendly format (brand-product-name)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Preview changes without applying them',
        )
        parser.add_argument(
            '--commit',
            action='store_true',
            help='Apply the slug changes to database',
        )
        parser.add_argument(
            '--limit',
            type=int,
            default=None,
            help='Limit number of products to process',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        commit = options['commit']
        limit = options['limit']

        if not dry_run and not commit:
            self.stdout.write(self.style.ERROR(
                'Please specify either --dry-run or --commit'
            ))
            return

        if dry_run and commit:
            self.stdout.write(self.style.ERROR(
                'Cannot use both --dry-run and --commit together'
            ))
            return

        mode = "DRY RUN" if dry_run else "COMMIT"
        self.stdout.write(f"\n{'='*60}")
        self.stdout.write(f"🔄 SLUG MIGRATION ({mode})")
        self.stdout.write(f"{'='*60}\n")

        products = ProductMasterGroup.objects.all().order_by('product_id')
        if limit:
            products = products[:limit]

        total = products.count()
        updated = 0
        skipped = 0
        errors = 0

        self.stdout.write(f"📦 Processing {total} products...\n")

        # Track new slugs to avoid collisions within this run
        new_slugs = set()

        for product in products:
            try:
                old_slug = product.slug
                brand_id = product.brand_id or 'COVE'

                # Generate new SEO slug
                new_slug = generate_product_slug(brand_id, product.name)

                # Ensure uniqueness (both in DB and this batch)
                final_slug = new_slug
                counter = 1
                while final_slug in new_slugs or (
                    ProductMasterGroup.objects.filter(slug=final_slug)
                    .exclude(pk=product.pk).exists()
                ):
                    counter += 1
                    final_slug = f"{new_slug}-{counter}"

                # Check if slug needs updating
                if old_slug == final_slug:
                    skipped += 1
                    continue

                # Track this slug
                new_slugs.add(final_slug)

                # Log the change
                self.stdout.write(
                    f"  {product.product_id}:\n"
                    f"    OLD: {old_slug}\n"
                    f"    NEW: {final_slug}"
                )

                if commit:
                    # Update product slug
                    product.slug = final_slug
                    product.save(update_fields=['slug'])

                    # Update variant slugs too
                    for variant in product.color_variants.all():
                        variant_slug = generate_variant_slug(final_slug, variant.color_name)
                        variant.slug = variant_slug
                        variant.save(update_fields=['slug'])

                    self.stdout.write(self.style.SUCCESS(f"    ✅ Updated"))
                else:
                    self.stdout.write(f"    (would update)")

                updated += 1

            except Exception as e:
                errors += 1
                self.stdout.write(self.style.ERROR(
                    f"  ❌ Error processing {product.product_id}: {e}"
                ))

        # Summary
        self.stdout.write(f"\n{'='*60}")
        self.stdout.write("📊 SUMMARY")
        self.stdout.write(f"{'='*60}")
        self.stdout.write(f"  Total processed: {total}")
        self.stdout.write(f"  {'Would update' if dry_run else 'Updated'}: {updated}")
        self.stdout.write(f"  Skipped (already good): {skipped}")
        self.stdout.write(f"  Errors: {errors}")

        if dry_run:
            self.stdout.write(self.style.WARNING(
                "\n⚠️  This was a DRY RUN. No changes were made."
            ))
            self.stdout.write("    Run with --commit to apply changes.\n")
        else:
            self.stdout.write(self.style.SUCCESS(
                f"\n✅ Successfully migrated {updated} product slugs!\n"
            ))
