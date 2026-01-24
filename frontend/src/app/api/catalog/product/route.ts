// src/app/api/catalog/product/route.ts
import { NextRequest, NextResponse } from "next/server";

// Type matching the catalog card / product shape we use in the UI
type UiVariant = {
  variantId: string;
  colorName: string;
  hex: string;
  images: string[];
  sizes: Record<string, number>;
  slug: string;
};

type UiProduct = {
  id: string;
  productId: string;
  slug: string;
  name: string;
  tier: string;
  type: string;
  gender?: string;
  fit?: string | null;
  material: string;
  price: number;
  basePrice: number;
  description: string;
  sizes: Record<string, number>; // aggregated stock per size
  colors: UiVariant[];
  affiliateUrl?: string;
};

// Helper to get backend URL (Django)
// Unified environment variable for backend URL
function getBackendBaseUrl() {
  return (
    process.env.DJANGO_BACKEND_URL ||
    process.env.NEXT_PUBLIC_BACKEND_BASE_URL ||
    "http://127.0.0.1:8001"
  );
}

export async function GET(req: NextRequest) {
  // return NextResponse.json({ detail: "VERIFY_ROUTE_HIT" }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const slug = searchParams.get("slug");
  const variantId = searchParams.get("variantId");

  if (!slug && !variantId) {
    return NextResponse.json(
      { detail: "Either slug or variantId query parameter is required" },
      { status: 400 },
    );
  }

  const backendBase = getBackendBaseUrl();

  // UNIFIED ENDPOINT: Use /api/products/{slug}/ for consistency with shopping page
  // This guarantees that if a product appears in the list, it will load in detail view
  const backendUrl = `${backendBase}/api/products/${slug}/`;
  console.log("[api/catalog/product] Fetching from unified endpoint:", backendUrl);
  console.log("[api/catalog/product] Request params:", { slug, variantId });

  let resp: Response;
  try {
    resp = await fetch(backendUrl, {
      cache: "no-store",
    });
    console.log("[api/catalog/product] Backend response status:", resp.status);
  } catch (err) {
    console.error("[api/catalog/product] backend fetch error", err);
    return NextResponse.json(
      { detail: "Failed to reach backend" },
      { status: 502 },
    );
  }

  if (!resp.ok) {
    const text = await resp.text();
    console.error(
      "[api/catalog/product] backend non-200",
      resp.status,
      text.slice(0, 200),
    );
    return NextResponse.json(
      {
        detail: "Backend returned error",
        backendStatus: resp.status,
        triedUrl: backendUrl,
        message: resp.status === 404
          ? `Product '${slug}' not found in database. This product may have been removed or the URL is incorrect.`
          : "An error occurred while fetching the product"
      },
      { status: resp.status === 404 ? 404 : 502 },
    );
  }

  const backendProduct = await resp.json();

  // The /api/products/{slug}/ endpoint returns the product directly, not wrapped in {product: ...}
  if (!backendProduct || !backendProduct.product_id) {
    return NextResponse.json(
      { detail: "Product not found in backend response" },
      { status: 404 },
    );
  }

  // Handle the color_variants field from /api/products/ endpoint
  const variants = backendProduct.color_variants || [];

  // Aggregate size stock at product level: { S: totalQty, M: ... }
  const productSizeTotals: Record<string, number> = {};

  const uiVariants: UiVariant[] = variants.map((v: any) => {
    const perVariantSizes: Record<string, number> = {};

    (v.sizes || []).forEach((s: any) => {
      const sizeKey = s.size as string;
      const qty = Number(s.quantity ?? 0);

      perVariantSizes[sizeKey] = qty;
      productSizeTotals[sizeKey] =
        (productSizeTotals[sizeKey] || 0) + qty;
    });

    return {
      variantId: v.variant_id,  // Backend uses snake_case
      colorName: v.color_name,
      hex: v.hex,  // Backend returns 'hex' not 'color_hex'
      // Professional Image Handling (Product Page)
      // Backend returns images as objects: {image_name: "url"}
      images: (v.images || []).map((img: any) => {
        const imageName = typeof img === 'string' ? img : img.image_name;
        if (imageName.startsWith('http') || imageName.startsWith('/')) return imageName;
        return `/clothing-images/${imageName}`;
      }),
      sizes: perVariantSizes,
      slug: backendProduct.slug,
    };
  });

  const uiProduct: UiProduct = {
    id: backendProduct.slug,
    productId: backendProduct.product_id,
    slug: backendProduct.slug,
    name: backendProduct.name,
    tier: backendProduct.tier,
    type: backendProduct.type,
    gender: backendProduct.gender,
    fit: null, // can be wired later
    material: backendProduct.material,
    price: Number(backendProduct.base_price),
    basePrice: Number(backendProduct.base_price),
    description: backendProduct.description ?? "",
    sizes: productSizeTotals,
    colors: uiVariants,
    affiliateUrl: backendProduct.affiliate_url,
  };

  return NextResponse.json({ product: uiProduct });
}
