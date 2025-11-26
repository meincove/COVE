// frontend/src/lib/catalogClient.ts
export type VariantSize = {
    size: string;
    quantity: number;
    price: string;
    stripe_price_id: string | null;
  };
  
  export type VariantPayload = {
    variantId: string;
    color_name: string;
    color_hex: string;
    images: string[];
    price: number | null;
    stock: number;
    sizes: VariantSize[];
  };
  
  export type CatalogDetailsResponse = {
    product: {
      product_id: string;
      slug: string;
      name: string;
      tier: string;
      type: string;
      material: string;
      gender: string;
      base_price: number;
      variants: VariantPayload[];
    };
    selected?: VariantPayload;
  };
  
  export async function fetchProductBySlug(
    slug: string,
  ): Promise<CatalogDetailsResponse> {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/api/catalog/details?slug=${encodeURIComponent(
        slug,
      )}`,
      {
        // important so we don't cache old stock etc
        cache: "no-store",
      },
    );
  
    if (!res.ok) {
      throw new Error(`Failed to fetch product by slug: ${slug}`);
    }
    return res.json();
  }
  