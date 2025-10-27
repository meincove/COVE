export type ProductColor = {
  colorName: string
  hex: string
  variantId: string
  images: string[]
}

export type CatalogCard = {
  id: string
  name: string
  tier: string
  type: string
  material: string
  price: number
  gender: string
  fit: string
  description: string
  colors: ProductColor[]
  sizes: Record<string, number>
}

export type CatalogData = {
  casual: CatalogCard[]
  originals: CatalogCard[]
  designer: CatalogCard[]
}

export type ClothingMeta = {
  [variantId: string]: {
    groupKey: string
    name: string
    tier: string
    type: string
    gender: string
    fit: string
    material: string
    price: number
    color: { name: string; hex: string }
    sizes: Record<string, number>
    description: string
  }
}
