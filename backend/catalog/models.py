from django.db import models

# --------------------------------------
# ProductMasterGroup: Base product info
# --------------------------------------
class ProductMasterGroup(models.Model):
    product_id = models.CharField(max_length=100, primary_key=True)  # e.g., G-HOODIE-CASUAL-BRUSHEDFLEECE-19.99
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True, db_index=True)
    tier = models.CharField(max_length=50)
    type = models.CharField(max_length=50)
    material = models.CharField(max_length=100)
    gender = models.CharField(max_length=20)
    fit = models.CharField(max_length=50)
    description = models.TextField()
    base_price = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        verbose_name = "Product Master Group"
        verbose_name_plural = "Product Master Groups"
        indexes = [
            models.Index(fields=['slug']),
            models.Index(fields=['type']),
            models.Index(fields=['tier']),
        ]

    def __str__(self):
        return f"{self.name} ({self.tier})"


# --------------------------------------
# ColorGroup: Color variant + SKU
# --------------------------------------
class ColorGroup(models.Model):
    variant_id = models.CharField(max_length=50, primary_key=True)  # e.g., CUHD001
    product = models.ForeignKey(ProductMasterGroup, on_delete=models.CASCADE, related_name='color_variants')
    color_name = models.CharField(max_length=50, db_index=True)
    hex = models.CharField(max_length=7)  # e.g., #000000
    slug = models.SlugField(db_index=True)

    class Meta:
        verbose_name = "Color Variant"
        verbose_name_plural = "Color Variants"
        indexes = [
            models.Index(fields=['color_name']),
            models.Index(fields=['slug']),
        ]

    def __str__(self):
        return f"{self.variant_id} - {self.color_name}"


class ProductImage(models.Model):
    variant = models.ForeignKey(ColorGroup, on_delete=models.CASCADE, related_name='images')
    image_name = models.CharField(max_length=100, db_index=True)  # e.g., CUHD001-front.png

    class Meta:
        verbose_name = "Product Image"
        verbose_name_plural = "Product Images"
        indexes = [
            models.Index(fields=['image_name']),
        ]

    def __str__(self):
        return f"{self.variant.variant_id} - {self.image_name}"


class SizeStockPrice(models.Model):
    variant = models.ForeignKey(ColorGroup, on_delete=models.CASCADE, related_name='sizes')
    size = models.CharField(max_length=4, db_index=True)  # e.g., S, M, L, XL
    quantity = models.IntegerField()
    price = models.DecimalField(max_digits=10, decimal_places=2)

    # --- NEW: Stripe identifiers for server-side pricing (production-grade) ---
    stripe_product_id = models.CharField(
        max_length=255, blank=True, null=True, db_index=True,
        help_text="Stripe Product ID (prod_...). Optional."
    )
    stripe_price_id = models.CharField(
        max_length=255, blank=True, null=True, db_index=True, unique=True,
        help_text="Stripe Price ID (price_...) used at checkout."
    )

    class Meta:
        verbose_name = "Size Stock Price"
        verbose_name_plural = "Size Stock Prices"
        unique_together = ('variant', 'size')
        indexes = [
            models.Index(fields=['size']),
        ]
        constraints = [
            models.CheckConstraint(check=models.Q(quantity__gte=0), name="ssp_quantity_gte_0"),
            models.CheckConstraint(check=models.Q(price__gte=0), name="ssp_price_gte_0"),
        ]

    def __str__(self):
        return f"{self.variant.variant_id} - {self.size} ({self.quantity} pcs)"
