import csv
import io
import uuid
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser
from django.db import transaction
from .models import Brand, ProductMasterGroup, ColorGroup, SizeStockPrice, ProductImage

class BulkProductUploadView(APIView):
    parser_classes = (MultiPartParser,)

    def post(self, request, brand_id):
        try:
            brand = Brand.objects.get(brand_id=brand_id)
        except Brand.DoesNotExist:
            return Response({'message': 'Brand not found'}, status=status.HTTP_404_NOT_FOUND)

        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response({'message': 'No file provided'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            decoded_file = file_obj.read().decode('utf-8')
            io_string = io.StringIO(decoded_file)
            reader = csv.DictReader(io_string)
            
            # Group rows by Product Name to handle variants
            products_data = {}
            for row in reader:
                p_name = row.get('Product Name', '').strip()
                if not p_name: continue
                
                if p_name not in products_data:
                    products_data[p_name] = {
                        'info': row,
                        'variants': []
                    }
                products_data[p_name]['variants'].append(row)

            created_count = 0
            errors = []

            with transaction.atomic():
                for p_name, data in products_data.items():
                    info = data['info']
                    variants = data['variants']
                    
                    try:
                        # 1. Create Product Master
                        pid = f"PROD-{uuid.uuid4().hex[:8].upper()}"
                        
                        # Parse simple multi-value fields (e.g. "Summer;Spring")
                        season_list = [s.strip() for s in info.get('Season', '').split(';') if s.strip()]
                        use_case_list = [u.strip() for u in info.get('Use Cases', '').split(';') if u.strip()]
                        
                        product = ProductMasterGroup.objects.create(
                            product_id=pid,
                            brand_id=brand.brand_id,
                            name=p_name,
                            type=info.get('Type', 'Other'),
                            gender=info.get('Gender', 'Unisex').lower(),
                            description=info.get('Description', ''),
                            material=info.get('Material', ''),
                            fit=info.get('Fit', 'Regular').lower(),
                            pattern=info.get('Pattern', 'Solid').lower(),
                            season=season_list,
                            use_cases=use_case_list,
                            slug=f"{brand.brand_name.lower()}-{p_name.lower().replace(' ', '-')}-{pid[-4:].lower()}",
                            base_price=0
                        )

                        all_prices = []

                        # 2. Create Variants
                        for v_row in variants:
                            color_name = v_row.get('Color Name')
                            if not color_name: continue

                            vid = f"VAR-{uuid.uuid4().hex[:8].upper()}"
                            hex_code = v_row.get('Hex Code', '#000000')

                            color_group = ColorGroup.objects.create(
                                variant_id=vid,
                                product=product,
                                color_name=color_name,
                                hex=hex_code,
                                slug=f"{product.slug}-{color_name.lower().replace(' ', '-')}"
                            )

                            # 3. Sizes: Format "S:10:29.99|M:10:29.99"
                            sizes_str = v_row.get('Sizes (S:10:29.99|M:10:29.99)', '')
                            if sizes_str:
                                for size_chunk in sizes_str.split('|'):
                                    parts = size_chunk.split(':')
                                    if len(parts) >= 2:
                                        lbl = parts[0].strip()
                                        qty = int(parts[1]) if parts[1].isdigit() else 0
                                        price = float(parts[2]) if len(parts) > 2 else 0.0
                                        
                                        SizeStockPrice.objects.create(
                                            variant=color_group,
                                            size_label=lbl,
                                            stock_quantity=qty,
                                            base_price=price
                                        )
                                        if price > 0: all_prices.append(price)

                            # 4. Image
                            img_url = v_row.get('Image URL', '').strip()
                            if img_url:
                                ProductImage.objects.create(
                                    variant=color_group,
                                    image_name=img_url, # Using image_name field for URL
                                    is_primary=True
                                )

                        # Update base price
                        if all_prices:
                            product.base_price = min(all_prices)
                            product.save()
                        
                        created_count += 1
                        
                    except Exception as e:
                        errors.append(f"Failed to create '{p_name}': {str(e)}")

            return Response({
                'created_count': created_count,
                'errors': errors
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            return Response({'message': f"CSV Parsing Error: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)
