"""
Django management command to generate products for outfit builder.
Usage: python manage.py generate_products
"""
from django.core.management.base import BaseCommand
from catalog.models import ProductMasterGroup, ColorGroup, SizeStockPrice
import random
from decimal import Decimal


class Command(BaseCommand):
    help = 'Generate products with outfit builder metadata'
    
    # Product templates
    TEMPLATES = {
        "sneakers": {
            "names": ["UrbanStride", "StreetVibe", "ClassicKick", "BoldStep", "RetroRun"],
            "materials": ["leather", "canvas", "mesh", "synthetic"],
            "fits": ["true_to_size", "runs_small"],
            "tiers": ["casual", "athletic"],
            "colors": ["white", "black", "navy", "grey", "red"],
            "price_range": (79.99, 149.99),
            "formality_score": 2,
            "versatility": 8,
            "style_tags": ["streetwear", "casual", "athletic"],
            "pattern": "solid",
            "season": ["spring", "summer", "fall", "winter"],
            "use_cases": ["casual", "athletic", "street"],
            "color_family": "neutral",
            "count": 20
        },
        "tee": {
            "names": ["Essential", "Classic Crew", "Basic V-Neck", "Premium Cotton"],
            "materials": ["cotton", "cotton blend", "organic cotton"],
            "fits": ["slim", "regular", "oversized"],
            "tiers": ["casual"],
            "colors": ["white", "black", "navy", "grey", "olive", "burgundy"],
            "price_range": (19.99, 39.99),
            "formality_score": 3,
            "versatility": 10,
            "style_tags": ["minimalist", "basic", "versatile"],
            "pattern": "solid",
            "season": ["spring", "summer", "fall"],
            "use_cases": ["casual", "layering", "everyday"],
            "color_family": "neutral",
            "count": 25
        },
        "hoodie": {
            "names": ["Cozy", "Urban", "Classic", "Oversized", "Fleece"],
            "materials": ["cotton fleece", "french terry", "brushed fleece"],
            "fits": ["regular", "oversized", "slim"],
            "tiers": ["casual"],
            "colors": ["black", "grey", "navy", "olive", "burgundy"],
            "price_range": (49.99, 89.99),
            "formality_score": 2,
            "versatility": 7,
            "style_tags": ["streetwear", "casual", "relaxed"],
            "pattern": "solid",
            "season": ["fall", "winter", "spring"],
            "use_cases": ["casual", "layering", "outdoor"],
            "color_family": "neutral",
            "count": 20
        },
        "boots": {
            "names": ["Chelsea", "Combat", "Desert", "Chukka", "Work"],
            "materials": ["leather", "suede", "nubuck"],
            "fits": ["true_to_size"],
            "tiers": ["casual", "smart_casual"],
            "colors": ["brown", "black", "tan", "grey"],
            "price_range": (129.99, 249.99),
            "formality_score": 6,
            "versatility": 7,
            "style_tags": ["classic", "rugged", "versatile"],
            "pattern": "solid",
            "season": ["fall", "winter", "spring"],
            "use_cases": ["casual", "work", "outdoor"],
            "color_family": "neutral",
            "count": 10
        },
        "dress_shoes": {
            "names": ["Oxford", "Loafer", "Derby", "Monk Strap"],
            "materials": ["leather", "patent leather"],
            "fits": ["true_to_size"],
            "tiers": ["formal", "smart_casual"],
            "colors": ["black", "brown", "burgundy"],
            "price_range": (149.99, 299.99),
            "formality_score": 9,
            "versatility": 5,
            "style_tags": ["formal", "classic", "professional"],
            "pattern": "solid",
            "season": ["spring", "summer", "fall", "winter"],
            "use_cases": ["formal", "work", "business"],
            "color_family": "neutral",
            "count": 5
        }
    }
    
    def handle(self, *args, **options):
        self.stdout.write("🚀 Starting product generation...")
        
        total_created = 0
        
        for type_name, template in self.TEMPLATES.items():
            count = template['count']
            self.stdout.write(f"\n📦 Generating {count} {type_name} products...")
            
            for i in range(count):
                try:
                    self.create_product(type_name, template, i + 1)
                    total_created += 1
                    if (i + 1) % 5 == 0:
                        self.stdout.write(f"   Created {i + 1}/{count}...")
                except Exception as e:
                    self.stdout.write(self.style.ERROR(f"   ❌ Error: {e}"))
            
            self.stdout.write(self.style.SUCCESS(f"   ✅ Completed {type_name}"))
        
        self.stdout.write(self.style.SUCCESS(f"\n🎉 Generated {total_created} products!"))
        self.stdout.write(f"Total in database: {ProductMasterGroup.objects.count()}")
    
    def create_product(self, type_name, template, index):
        """Create a single product with variants and sizes."""
        name_base = random.choice(template['names'])
        name = f"{name_base} {type_name.replace('_', ' ').title()}"
        product_id = f"G-{type_name.upper()}-{index:03d}"
        slug = f"{name.lower().replace(' ', '-')}-{index}"
        
        price = Decimal(str(round(random.uniform(*template['price_range']), 2)))
        
        # Create product
        product = ProductMasterGroup.objects.create(
            product_id=product_id,
            name=name,
            slug=slug,
            brand_id="COVE",
            tier=random.choice(template['tiers']),
            type=type_name,
            material=random.choice(template['materials']),
            gender="unisex",
            fit=random.choice(template['fits']),
            description=f"{name} - Perfect for {', '.join(template['use_cases'])}.",
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
        
        # Add color variants
        num_colors = min(3, len(template['colors']))
        selected_colors = random.sample(template['colors'], num_colors)
        
        for color in selected_colors:
            variant = ColorGroup.objects.create(
                variant_id=f"{product_id}-{color[:3].upper()}",
                product=product,
                color_name=color,
                hex="#000000",
                slug=f"{slug}-{color}"
            )
            
            # Add sizes
            if type_name in ["sneakers", "boots", "dress_shoes"]:
                sizes = ["7", "8", "9", "10", "11", "12"]
            else:
                sizes = ["S", "M", "L", "XL"]
            
            for size in sizes:
                SizeStockPrice.objects.create(
                    variant=variant,
                    size=size,
                    quantity=random.randint(5, 20),
                    price=price
                )
        
        return product
