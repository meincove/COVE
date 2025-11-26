// src/lib/agentCatalogResolver.ts (or whatever file this lives in)
import type { AgentItem } from "@/types/agent";
import type { CatalogCard as CatalogCardModel } from "@/types/product";

export type ResolvedAgentCatalog = {
  card: CatalogCardModel;
  selectedVariantId?: string;
};

type ApiProductResponse = {
  product: CatalogCardModel;
};

/**
 * Best-effort helper to extract a slug from item.url if agent only gave a URL.
 * e.g. "/product/hoodie-casual-fleece-19.99?x=1" -> "hoodie-casual-fleece-19.99"
 */
function inferSlugFromUrl(url?: string | null): string | undefined {
  if (!url) return undefined;
  if (!url.startsWith("/product/")) return undefined;

  const after = url.split("/product/")[1] ?? "";
  return after.split(/[?#]/)[0] || undefined;
}

/**
 * Resolve an AgentItem to a catalog card backed by Neon via /api/catalog/product.
 * Prefers variantId; falls back to slug / URL slug.
 *
 * NOTE: this is async now. Wherever you used the old sync version,
 * call it with `await` (e.g. inside an API route or useEffect).
 */
export async function resolveAgentItemToCatalogCard(
  item: AgentItem,
): Promise<ResolvedAgentCatalog | null> {
  const { slug: rawSlug, variantId, color } = item;

  const slugFromUrl = inferSlugFromUrl(item.url);
  const slug = rawSlug || slugFromUrl;

  const params = new URLSearchParams();

  if (variantId) {
    params.set("variantId", variantId);
  } else if (slug) {
    params.set("slug", slug);
  } else {
    // nothing to resolve against backend
    return null;
  }

  let res: Response;
  try {
    res = await fetch(`/api/catalog/product?${params.toString()}`, {
      cache: "no-store",
    });
  } catch (err) {
    console.error("[resolveAgentItemToCatalogCard] fetch error", err);
    return null;
  }

  if (!res.ok) {
    console.warn(
      "[resolveAgentItemToCatalogCard] /api/catalog/product returned",
      res.status,
    );
    return null;
  }

  const data: ApiProductResponse = await res.json().catch(() => ({
    product: null as any,
  }));

  const product = data.product;
  if (!product) return null;

  const colorsArr = (product as any).colors as any[] | undefined;
  if (!colorsArr || !colorsArr.length) {
    return {
      card: product as CatalogCardModel,
      selectedVariantId: undefined,
    };
  }

  // --- pick selectedVariantId (same logic as before) ------------------------
  let selectedVariantId: string | undefined = undefined;

  // 1) Direct variantId match
  if (variantId) {
    const match = colorsArr.find((c) => c.variantId === variantId);
    if (match) {
      selectedVariantId = variantId;
    }
  }

  // 2) Match by color name
  if (!selectedVariantId && color) {
    const norm = color.toLowerCase();
    const colorMatch = colorsArr.find((c) => {
      const cName = (c.colorName ?? c.name ?? "").toLowerCase();
      return cName === norm;
    });
    if (colorMatch) {
      selectedVariantId = colorMatch.variantId;
    }
  }

  // 3) Fallback: first variant
  if (!selectedVariantId) {
    selectedVariantId = colorsArr[0]?.variantId;
  }

  return {
    card: product as CatalogCardModel,
    selectedVariantId,
  };
}
