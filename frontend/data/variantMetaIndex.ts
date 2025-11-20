// src/data/variantMetaIndex.ts
import productVariants from '@/data/productVariantsFlat.json'

export interface ProductVariantFlat {
  variantId: string
  groupId: string
  groupSlug: string
  sizingKey?: string
  name: string
  tier: string
  type: string
  material: string
  price: number
  colorName: string
  hex: string
  sizes: Record<string, number>
  images: string[]
  description?: string

  // flattened extras
  gsm?: number
  fabricDetails?: string
  careInstructions?: string
}

const variantMetaById: Record<string, ProductVariantFlat> = {}

// 🔁 Take the raw JSON shape and FLATTEN fabric/care into top-level fields
for (const raw of productVariants as any[]) {
  const flattened: ProductVariantFlat = {
    variantId: raw.variantId,
    groupId: raw.groupId,
    groupSlug: raw.groupSlug,
    sizingKey: raw.sizingKey,
    name: raw.name,
    tier: raw.tier,
    type: raw.type,
    material: raw.material,
    price: raw.price,
    colorName: raw.colorName,
    hex: raw.hex,
    sizes: raw.sizes ?? {},
    images: raw.images ?? [],
    description: raw.description,

    // 👇 pull from nested objects
    gsm: raw.fabric?.gsm,
    fabricDetails:
      raw.fabric?.materialBlend ?? raw.fabric?.materialMain ?? undefined,
    careInstructions: raw.care?.careNotes ?? undefined,
  }

  variantMetaById[flattened.variantId] = flattened
}

export function getVariantMeta(variantId?: string | null) {
  if (!variantId) return null
  return variantMetaById[variantId] ?? null
}
