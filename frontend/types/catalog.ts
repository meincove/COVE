
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

// --- Flat per-variant record (productVariantsFlat.json) ---

export interface FlatVariantRecord {
    variantId: string;
    groupId: string;
    groupSlug: string;
  
    brandId: string;
    merchantId: string;
    tenantId: string;
    currency: string;
    taxCategory: string;
    status: string;
  
    sizingKey: string;
    tier: string;
    type: string;
    gender: string;
    fit: string;
    material: string;
  
    price: number;
    colorName: string;
    hex: string;
  
    // size key -> quantity
    sizes: Record<string, number>;
  
    images: string[];
  
    name: string;
    description?: string;
  
    fabric?: {
      materialMain?: string;
      materialBlend?: string;
      gsm?: number;
      stretchLevel?: string;
      thickness?: string;
      warmth?: string;
      breathability?: string;
      softness?: string;
    };
  
    style?: {
      dressCode?: string;
      styleTags?: string[];
      useCases?: string[];
      pattern?: string;
      logoPlacement?: string;
    };
  
    fitProfile?: {
      fit?: string;
      length?: string;
      bodyShapes?: string[];
      recommendedGender?: string;
      stretchHelpsFit?: boolean;
    };
  
    care?: {
      washTemp?: string;
      dryer?: string;
      iron?: string;
      careNotes?: string;
    };
  
    styleNotes?: string;
    fitNotes?: string;
    tags?: string[];
  }