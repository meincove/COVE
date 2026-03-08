import asyncio
from app.vector.store import get_product_by_slug, connect

def inspect_slugs():
    conn = connect()
    slugs = [
        "solemates-elegant-nude-pumps",
        "shoe-elegant-nude-pumps",
        "solemates-classic-burgundy-leather-loafers"
    ]
    
    print("\n🕵️‍♀️ INSPECTING PRODUCT GENDER METADATA:\n")
    for slug in slugs:
        p = get_product_by_slug(conn, slug)
        if p:
            meta = p.get("meta", {})
            print(f"Slug: {slug}")
            print(f"   Title: {p.get('title')}")
            print(f"   Gender: [{meta.get('gender')}] (Raw value)")
            print(f"   Category: {meta.get('category')}")
            print(f"   OutfitCat: {meta.get('outfit_category')}")
            print("-" * 40)
        else:
            print(f"Slug: {slug} NOT FOUND")

if __name__ == "__main__":
    inspect_slugs()
