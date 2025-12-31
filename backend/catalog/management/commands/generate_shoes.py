"""
Django management command to generate shoe products.
Adds sneakers, boots, dress shoes, and sandals with outfit builder metadata.
"""
from django.core.management.base import BaseCommand
from catalog.models import ProductMasterGroup, ColorGroup, SizeStockPrice
import random
from decimal import Decimal


class Command(BaseCommand):
    help = 'Generate shoe products for outfit builder'
    
    SHOE_TEMPLATES = {
        "sneakers": {
            "brands": ["UrbanStride", "StreetVibe", "ClassicKick", "BoldStep", "RetroRun"],
            "styles": ["Low-Top", "High-Top", "Slip-On", "Running", "Court"],
            "materials": ["leather", "canvas", "mesh", "synthetic leather", "suede"],
            "colors": ["white", "black", "navy", "grey", "red", "beige", "olive"],
            "price_range": (79.99, 149.99),
            "tier": "casual",
            "formality_score": 2,
            "versatility": 8,
            "style_tags": ["streetwear", "casual", "athletic"],
            "pattern": "solid",
            "season": ["spring", "summer", "fall", "winter"],
            "use_cases": ["casual", "athletic", "street"],
            "color_family": "neutral",
            "count": 30
        },
        "boots": {
            "brands": ["Heritage", "Urban", "Classic", "Rugged", "Modern"],
            "styles": ["Chelsea", "Combat", "Desert", "Chukka", "Work"],
            "materials": ["leather", "suede", "nubuck", "full-grain leather"],
            "colors": ["brown", "black", "tan", "grey", "burgundy"],
            "price_range": (129.99, 249.99),
            "tier": "casual",
            "formality_score": 6,
            "versatility": 7,
            "style_tags": ["classic", "rugged", "versatile"],
            "pattern": "solid",
            "season": ["fall", "winter", "spring"],
            "use_cases": ["casual", "work", "outdoor"],
            "color_family": "neutral",
            "count": 20
        },
        "dress_shoes": {
            "brands": ["Elegant", "Classic", "Premium", "Refined"],
            "styles": ["Oxford", "Loafer", "Derby", "Monk Strap", "Brogue"],
            "materials": ["leather", "patent leather", "suede"],
            "colors": ["black", "brown", "burgundy", "tan"],
            "price_range": (149.99, 299.99),
            "tier": "formal",
            "formality_score": 9,
            "versatility": 5,
            "style_tags": ["formal", "classic", "professional"],
            "pattern": "solid",
            "season": ["spring", "summer", "fall", "winter"],
            "use_cases": ["formal", "work", "business"],
            "color_family": "neutral",
            "count": 15
        },
        "sandals": {
            "brands": ["Summer", "Casual", "Sport", "Comfort"],
            "styles": ["Slide", "Sport", "Flip-Flop", "Strappy"],
            "materials": ["synthetic", "leather", "rubber"],
            "colors": ["black", "brown", "navy", "grey", "tan"],
            "price_range": (29.99, 79.99),
            "tier": "casual",
            "formality_score": 1,
            "versatility": 4,
            "style_tags": ["casual", "summer", "relaxed"],
            "pattern": "solid",
            "season": ["spring", "summer"],
            "use_cases": ["casual", "beach", "outdoor"],
            "color_family": "neutral",
            "count": 15
        }
    }
    
    def handle(self, *args, **options):
        self.stdout.write("🚀 Generating shoe products...")
        
        total_created = 0
        
        for shoe_type, template in self.SHOE_TEMPLATES.items():
            count = template['count']
            self.stdout.write(f"\n👟 Generating {count} {shoe_type}...")
            
            for i in range(count):
                try:
                    self.create_shoe(shoe_type, template, i + 1)
                    total_created += 1
                    if (i + 1) % 5 == 0:
                        self.stdout.write(f"   Created {i + 1}/{count}...")
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f"   ❌ Error: {e}"))
            
            self.stdout.write(self.style.SUCCESS(f"   ✅ Completed {shoe_type}"))
        
        self.stdout.write(self.style.SUCCESS(f"\n🎉 Generated {total_created} shoe products!"))
        self.stdout.write(f"Total products in database: {ProductMasterGroup.objects.count()}")
    
    def create_shoe(self, shoe_type, template, index):
        """Create a single shoe product with variants."""
        brand = random.choice(template['brands'])
        style = random.choice(template['styles'])
        name = f"{brand} {style} {shoe_type.replace('_', ' ').title()}"
        product_id = f"G-{shoe_type.upper()}-{index:03d}"
        slug = f"{name.lower().replace(' ', '-')}-{index}"
        
        price = Decimal(str(round(random.uniform(*template['price_range']), 2)))
        material = random.choice(template['materials'])
        
        # Create product
        product = ProductMasterGroup.objects.create(
            product_id=product_id,
            name=name,
            slug=slug,
            brand_id="COVE",
            tier=template['tier'],
            type=shoe_type,
            material=material,
            gender="unisex",
            fit="true_to_size",
            description=f"{name} - {material.title()} construction. Perfect for {', '.join(template['use_cases'])}.",
            base_price=price,
            style_tags=template['style_tags'],
            pattern=template['pattern'],
            season=template['season'],
            use_cases=template['use_cases'],
            formality_score=template['formality_score'],
            versatility=template['versatility'],
            statement_piece=False,
            color_family=template['color_family'],
            in_stock=True,
            featured=False
        )
        
        # Add 2-3 color variants
        num_colors = min(3, len(template['colors']))
        selected_colors = random.sample(template['colors'], num_colors)
        
        for color in selected_colors:
            variant = ColorGroup.objects.create(
                variant_id=f"{product_id}-{color[:3].upper()}",
                product=product,
                color_name=color,
                hex="#000000",  # Placeholder
                slug=f"{slug}-{color}"
            )
            
            # Add shoe sizes (US sizing)
            sizes = ["7", "7.5", "8", "8.5", "9", "9.5", "10", "10.5", "11", "11.5", "12"]
            for size in sizes:
                SizeStockPrice.objects.create(
                    variant=variant,
                    size=size,
                    quantity=random.randint(3, 15),
                    price=price
                )
        
        return product
