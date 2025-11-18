
// // 🔹 This matches your catalogData.json color objects
// export interface CatalogColor {
//   variantId: string
//   colorName: string
//   hex: string
//   images: string[]
//   sizes: Record<string, number>
//   slug: string
// }

// // 🔹 This matches each card in catalogData.json
// export interface CatalogCardDTO {
//   id: string
//   groupId: string
//   slug: string
//   sizingKey: string

//   name: string
//   tier: string          // e.g. 'casual' | 'originals' | 'designer'
//   type: string          // hoodie, tshirt, jogger, ...
//   material: string
//   price: number
//   basePrice: number
//   gender: string
//   fit: string
//   description: string

//   colors: CatalogColor[]

//   // aggregated stock at product level
//   sizes: Record<string, number>

//   // optional: backend can preselect a variant
//   selectedVariantId?: string

//   // optional extra fields in future (gsm, etc.)
//   gsm?: number
// }






// Re-export canonical catalog types from types/product.ts
import type { CatalogCard, ProductColor } from './product'

// For frontend pages / carousels
export type CatalogCardDTO = CatalogCard
export type CatalogColor = ProductColor
