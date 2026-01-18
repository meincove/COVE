// src/lib/agentItemResolver.ts
import type { AgentItem } from "@/types/agent";

export type ResolvedProductForChat = {
  /** Canonical title to show in chat */
  title: string;
  /** e.g. "designer • jacket" */
  subtitle?: string;
  tier?: string;
  type?: string;
  colorName?: string;
  priceLabel?: string;
  /** Resolved image URL (if available) */
  imageUrl?: string;
  /** Where to navigate when the card is clicked */
  productUrl?: string;
  /** True if we found a matching variant in our catalog index */
  fromCatalog: boolean;
  /** Reason string from the agent, if any */
  reason?: string;
};

// Shape returned by /api/catalog/product
type CatalogVariant = {
  variantId: string;
  colorName: string;
  hex: string;
  images: string[];
  sizes: Record<string, number>;
  slug: string;
};

type CatalogProduct = {
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
  description?: string;
  sizes: Record<string, number>;
  colors: CatalogVariant[];
};

type CatalogProductResponse = {
  product: CatalogProduct;
};

/**
 * Fallback resolver that uses only the AgentItem fields, with
 * fromCatalog = false. Used immediately in the UI while we fetch.
 */
export function fallbackResolveAgentItemForChat(
  item: AgentItem,
): ResolvedProductForChat {
  const fallbackSubtitle = `${item.tier ?? ""}${item.type ? ` • ${item.type}` : ""
    }`.trim();

  return {
    title: item.title,
    subtitle: fallbackSubtitle || undefined,
    tier: item.tier,
    type: item.type,
    colorName: item.color,
    priceLabel: undefined,
    imageUrl: undefined,
    productUrl:
      item.url && item.url.startsWith("/") ? item.url : undefined,
    fromCatalog: false,
    reason: item.reason,
  };
}

/**
 * Fetch a catalog product (and its variants) for a given AgentItem.
 * Prefers variantId, falls back to slug/groupSlug.
 */
async function fetchCatalogProductForItem(
  item: AgentItem,
): Promise<CatalogProduct | null> {
  const params = new URLSearchParams();

  // Always pass variantId if available
  if (item.variantId) {
    params.set("variantId", item.variantId);
  }

  // Always pass slug if available (needed for the backend URL)
  if (item.slug) {
    params.set("slug", item.slug);
  }

  if (!params.toString()) {
    // nothing to look up
    return null;
  }

  try {
    const res = await fetch(`/api/catalog/product?${params.toString()}`, {
      cache: "no-store",
    });

    if (!res.ok) {
      console.warn(
        "[agentItemResolver] /api/catalog/product returned",
        res.status,
      );
      return null;
    }

    // Defensive JSON parsing - handle cases where API returns HTML
    let data: CatalogProductResponse;
    try {
      data = await res.json();
    } catch (parseError) {
      console.warn("[agentItemResolver] Failed to parse JSON response:", parseError);
      return null;
    }

    if (!data || !data.product) return null;

    return data.product;
  } catch (err) {
    console.error("[agentItemResolver] fetch error", err);
    return null;
  }
}

/**
 * Canonical resolver: now backed by Neon via /api/catalog/product.
 * Uses variantId as primary key, groupSlug (slug) + color as secondary.
 */
export async function resolveAgentItemForChat(
  item: AgentItem,
): Promise<ResolvedProductForChat> {
  // start from a safe fallback
  const base = fallbackResolveAgentItemForChat(item);

  console.log('[AgentItemResolver] Resolving item:', {
    variantId: item.variantId,
    slug: item.slug,
    color: item.color,
    title: item.title
  });

  const product = await fetchCatalogProductForItem(item);

  if (!product) {
    // can't find anything in catalog -> keep fallback
    console.warn('[AgentItemResolver] No product found in catalog for:', item.title);
    return base;
  }

  console.log('[AgentItemResolver] Found product:', product.name, 'with', product.colors?.length, 'variants');

  const variants = product.colors ?? [];

  // 1) Prefer exact variantId match
  let matchedVariant: CatalogVariant | undefined;
  if (item.variantId) {
    matchedVariant = variants.find(
      (v) => v.variantId === item.variantId,
    );
  }

  // 2) If no variantId match, try color name
  if (!matchedVariant && item.color) {
    const normColor = item.color.toLowerCase().trim();
    matchedVariant = variants.find(
      (v) => (v.colorName ?? "").toLowerCase().trim() === normColor,
    );
  }

  // 3) Fallback to first variant if none matched
  if (!matchedVariant && variants.length > 0) {
    matchedVariant = variants[0];
  }

  if (!matchedVariant) {
    // Product exists but we couldn't map a variant cleanly;
    // keep fallback but mark as fromCatalog=false.
    return {
      ...base,
      fromCatalog: false,
    };
  }

  const v = matchedVariant;

  const priceLabel =
    typeof product.price === "number"
      ? `€${product.price.toFixed(2)}`
      : undefined;

  const imgName =
    v.images && v.images.length > 0 ? v.images[0] : undefined;

  // Use external URL directly if it's a full URL, otherwise undefined
  const imageUrl = imgName && (imgName.startsWith('http://') || imgName.startsWith('https://'))
    ? imgName
    : undefined;

  const subtitle = `${product.tier ?? ""}${product.type ? ` • ${product.type}` : ""
    }`.trim();

  const productUrl = `/product/${product.slug}?variantId=${encodeURIComponent(
    v.variantId,
  )}`;

  return {
    ...base,
    title: product.name || base.title,
    subtitle: subtitle || base.subtitle,
    tier: product.tier ?? base.tier,
    type: product.type ?? base.type,
    colorName: v.colorName ?? base.colorName,
    priceLabel,
    imageUrl,
    productUrl,
    fromCatalog: true,
  };
}
