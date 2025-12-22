// types/product.ts

// -------------------------------------
// Shared metadata types (rich semantics)
// -------------------------------------

export type FabricMeta = {
  materialMain?: string; // "Brushed Fleece"
  materialBlend?: string; // "80% cotton / 20% polyester"
  gsm?: number;
  stretchLevel?: "none" | "low" | "medium" | "high" | string;
  thickness?: "light" | "medium" | "heavy" | string;
  warmth?: "summer" | "all-season" | "winter" | string;
  breathability?: "low" | "medium" | "high" | string;
  softness?: "low" | "medium" | "high" | string;
};

export type StyleMeta = {
  dressCode?: "casual" | "smart-casual" | "streetwear" | "athleisure" | string;
  styleTags?: string[];
  useCases?: string[];
  pattern?: "solid" | "graphic" | "colorblock" | string;
  logoPlacement?:
  | "front-small"
  | "front-large"
  | "back-large"
  | "sleeve"
  | "none"
  | string;
};

export type FitProfileMeta = {
  fit: "slim" | "regular" | "relaxed" | "oversized" | string;
  length?: "cropped" | "regular" | "longline" | string;
  bodyShapes?: string[]; // ["slim", "athletic", "broad-shoulder"]
  recommendedGender?: "unisex" | "mens" | "womens" | string;
  stretchHelpsFit?: boolean;
};

export type CareMeta = {
  washTemp?: string; // "30°C gentle wash"
  dryer?: "no" | "low" | "yes" | string;
  iron?: "no" | "low" | "medium" | "high" | string;
  careNotes?: string;
};

// -------------------------------------
// Frontend catalog types (grouped view)
// -------------------------------------

export type ProductColor = {
  colorName: string | null;
  hex: string | null;
  variantId: string;
  images: string[];
  sizes: Record<string, number>; // per-size stock for this variant
  slug: string; // group slug (URL)
};

export type CatalogCard = {
  id: string; // groupId, e.g. "PG_HOODIE_CASUAL_FLEECE"
  groupId: string;
  slug: string; // "hoodie-casual-fleece-59.99" (group slug)
  brand?: string; // brand_id for multi-brand support (e.g. "COVE", "BoldHues")
  layoutKey?: string | number; // Card layout key for React rendering

  sizingKey?: string; // e.g. "hoodie_unisex_regular"

  name: string;
  tier: string; // "casual" | "originals" | "designer"
  type: string; // "hoodie" | "bomber" | "jeans" | "jacket" | ...
  material: string;

  price: number; // legacy display price
  basePrice: number; // canonical base price

  gender: string; // "unisex", etc.
  fit: string; // "regular", "relaxed", ...
  description: string;

  colors: ProductColor[];
  sizes: Record<string, number>; // aggregated sizes across variants
};

export type CatalogData = {
  casual: CatalogCard[];
  originals: CatalogCard[];
  designer: CatalogCard[];
  // future tiers (e.g. "limited") can be added later
};

// -------------------------------------
// Flat variant type (AI / search / RAG)
// -------------------------------------

export type ProductVariantFlat = {
  variantId: string;
  groupId: string;
  groupSlug: string; // same style as CatalogCard.slug

  sizingKey: string; // "hoodie_unisex_regular"

  name: string;
  tier: string;
  type: string;
  material: string;
  gender: string;
  fit: string;
  price: number;

  colorName: string | null;
  hex: string | null;

  sizes: Record<string, number>;
  images: string[];

  description: string;

  fabric?: FabricMeta | null;
  style?: StyleMeta | null;
  fitProfile?: FitProfileMeta | null;
  care?: CareMeta | null;

  styleNotes?: string | null;
  fitNotes?: string | null;

  tags: string[]; // flattened for search/RAG
};

// -------------------------------------
// Raw meta JSON type (clothingMeta.json)
// -------------------------------------

export type ClothingMetaEntry = {
  groupKey: string;
  name: string;
  tier: string;
  type: string;
  gender: string;
  fit: string;
  material: string;
  price: number;
  color: { name: string; hex: string };
  sizes: Record<string, number>;
  description: string;

  // optional rich props
  fabric?: FabricMeta;
  style?: StyleMeta;
  fitProfile?: FitProfileMeta;
  care?: CareMeta;
  styleNotes?: string;
  fitNotes?: string;
};

export type ClothingMeta = {
  [variantId: string]: ClothingMetaEntry;
};

// -------------------------------------
// Size charts & fit rules (size brain)
// -------------------------------------

export type SizeChartMeasurements = Record<string, number>; // e.g. chest_garment_cm, length_cm, etc.

export type SizeChartSizes = Record<
  string, // size label "S" | "M" | "L" | "XL"
  SizeChartMeasurements
>;

export type SizeChart = {
  key: string; // matches sizingKey
  type: string;
  gender: string;
  fit: string;
  notes?: string;
  sizes: SizeChartSizes;
};

export type FitPreferenceAdjust = {
  tight?: string;
  regular?: string;
  relaxed?: string;
  oversized?: string;
};

export type FitRule = {
  size: string; // base size for that band
  height_cm_min: number;
  height_cm_max: number;
  weight_kg_min: number;
  weight_kg_max: number;
  recommendedForBuild?: string[]; // ["slim", "athletic", ...]
  fitPreferenceAdjust: FitPreferenceAdjust;
};

export type FitRuleSet = {
  key: string; // matches sizingKey
  type: string;
  gender: string;
  fit: string;
  notes?: string;
  rules: FitRule[];
};
