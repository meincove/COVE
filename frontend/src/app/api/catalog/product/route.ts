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
};

// Helper to get backend URL (Django)
function getBackendBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_BACKEND_BASE_URL ||
    process.env.BACKEND_BASE_URL ||
    "http://127.0.0.1:8001"
  );
}

export async function GET(req: NextRequest) {
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

  // Prefer variantId when present, otherwise slug
  const queryParam = variantId
    ? `variantId=${encodeURIComponent(variantId)}`
    : `slug=${encodeURIComponent(slug as string)}`;

  const backendUrl = `${backendBase}/tools/catalog.details?${queryParam}`;

  let resp: Response;
  try {
    resp = await fetch(backendUrl, {
      cache: "no-store",
    });
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
      { detail: "Backend returned error", status: resp.status },
      { status: 502 },
    );
  }

  const data = await resp.json();

  const backendProduct = data.product;
  if (!backendProduct) {
    return NextResponse.json(
      { detail: "Product not found in backend response" },
      { status: 404 },
    );
  }

  const variants = backendProduct.variants || [];

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
      variantId: v.variantId,
      colorName: v.color_name,
      hex: v.color_hex,
      images: v.images || [],
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
  };

  return NextResponse.json({ product: uiProduct });
}
