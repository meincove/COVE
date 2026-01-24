from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import math

# A curated list of ~100 common fashion colors
COMMON_COLORS = [
    {"name": "Black", "hex": "#000000"},
    {"name": "White", "hex": "#FFFFFF"},
    {"name": "Red", "hex": "#FF0000"},
    {"name": "Green", "hex": "#008000"},
    {"name": "Blue", "hex": "#0000FF"},
    {"name": "Yellow", "hex": "#FFFF00"},
    {"name": "Cyan", "hex": "#00FFFF"},
    {"name": "Magenta", "hex": "#FF00FF"},
    {"name": "Silver", "hex": "#C0C0C0"},
    {"name": "Gray", "hex": "#808080"},
    {"name": "Maroon", "hex": "#800000"},
    {"name": "Olive", "hex": "#808000"},
    {"name": "Purple", "hex": "#800080"},
    {"name": "Teal", "hex": "#008080"},
    {"name": "Navy", "hex": "#000080"},
    {"name": "Orange", "hex": "#FFA500"},
    {"name": "Gold", "hex": "#FFD700"},
    {"name": "Pink", "hex": "#FFC0CB"},
    {"name": "Lavender", "hex": "#E6E6FA"},
    {"name": "Beige", "hex": "#F5F5DC"},
    {"name": "Brown", "hex": "#A52A2A"},
    {"name": "Coral", "hex": "#FF7F50"},
    {"name": "Crimson", "hex": "#DC143C"},
    {"name": "DarkBlue", "hex": "#00008B"},
    {"name": "DarkGreen", "hex": "#006400"},
    {"name": "Fuchsia", "hex": "#FF00FF"},
    {"name": "HotPink", "hex": "#FF69B4"},
    {"name": "Indigo", "hex": "#4B0082"},
    {"name": "Ivory", "hex": "#FFFFF0"},
    {"name": "Khaki", "hex": "#F0E68C"},
    {"name": "Lime", "hex": "#00FF00"},
    {"name": "Mint", "hex": "#98FF98"},
    {"name": "Mustard", "hex": "#FFDB58"},
    {"name": "OliveDrab", "hex": "#6B8E23"},
    {"name": "OrangeRed", "hex": "#FF4500"},
    {"name": "Orchid", "hex": "#DA70D6"},
    {"name": "Peach", "hex": "#FFDAB9"},
    {"name": "Plum", "hex": "#DDA0DD"},
    {"name": "PowderBlue", "hex": "#B0E0E6"},
    {"name": "RoyalBlue", "hex": "#4169E1"},
    {"name": "Salmon", "hex": "#FA8072"},
    {"name": "SeaGreen", "hex": "#2E8B57"},
    {"name": "Sienna", "hex": "#A0522D"},
    {"name": "SkyBlue", "hex": "#87CEEB"},
    {"name": "SlateBlue", "hex": "#6A5ACD"},
    {"name": "SlateGray", "hex": "#708090"},
    {"name": "Snow", "hex": "#FFFAFA"},
    {"name": "SpringGreen", "hex": "#00FF7F"},
    {"name": "SteelBlue", "hex": "#4682B4"},
    {"name": "Tan", "hex": "#D2B48C"},
    {"name": "Thistle", "hex": "#D8BFD8"},
    {"name": "Tomato", "hex": "#FF6347"},
    {"name": "Turquoise", "hex": "#40E0D0"},
    {"name": "Violet", "hex": "#EE82EE"},
    {"name": "Wheat", "hex": "#F5DEB3"},
    {"name": "WhiteSmoke", "hex": "#F5F5F5"},
    {"name": "Charcoal", "hex": "#36454F"},
    {"name": "Cream", "hex": "#FFFDD0"},
    {"name": "Eggplant", "hex": "#614051"},
    {"name": "Emerald", "hex": "#50C878"},
    {"name": "Lilac", "hex": "#C8A2C8"},
    {"name": "Mauve", "hex": "#E0B0FF"},
    {"name": "MidnightBlue", "hex": "#191970"},
    {"name": "Ochre", "hex": "#CC7722"},
    {"name": "Periwinkle", "hex": "#CCCCFF"},
    {"name": "Rust", "hex": "#B7410E"},
    {"name": "Sage", "hex": "#BCB88A"},
    {"name": "Ruby", "hex": "#E0115F"},
    {"name": "Sapphire", "hex": "#0F52BA"},
    {"name": "Taupe", "hex": "#483C32"},
    {"name": "OffWhite", "hex": "#FAF9F6"}
]

def hex_to_rgb(hex_code):
    hex_code = hex_code.lstrip('#')
    return tuple(int(hex_code[i:i+2], 16) for i in (0, 2, 4))

def color_distance(rgb1, rgb2):
    return math.sqrt(sum((a - b) ** 2 for a, b in zip(rgb1, rgb2)))

@csrf_exempt
def suggest_color_name(request):
    if request.method != 'GET':
        return JsonResponse({'error': 'Only GET allowed'}, status=405)

    hex_code = request.GET.get('hex')

    if not hex_code:
        return JsonResponse({'error': 'Missing hex parameter'}, status=400)
    
    # Basic validation
    if not (hex_code.startswith('#') and len(hex_code) in [4, 7]):
         # Try to be lenient if they forgot #
         if len(hex_code) in [3, 6]:
             hex_code = '#' + hex_code
         else:
             return JsonResponse({'error': 'Invalid hex format'}, status=400)

    try:
        user_rgb = hex_to_rgb(hex_code)
    except ValueError:
        return JsonResponse({'error': 'Invalid hex characters'}, status=400)

    # Find closest colors
    sorted_colors = sorted(COMMON_COLORS, key=lambda c: color_distance(user_rgb, hex_to_rgb(c['hex'])))
    
    # Top match
    best_match = sorted_colors[0]
    
    # Alternatives (next 2)
    alternatives = [c['name'] for c in sorted_colors[1:3]]

    return JsonResponse({
        'status': 'success',
        'input_hex': hex_code,
        'recommended_name': best_match['name'],
        'alternatives': alternatives,
        'closest_hex': best_match['hex'] # The hex of the named color, not input
    })
