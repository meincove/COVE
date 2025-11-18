// src/types/filters.ts

import type { CatalogData, CatalogCard } from './product'

// Tier key is just the keys of your catalog data (casual, originals, designer, ...)
export type TierKey = keyof CatalogData

// One tier's filter state (can grow over time)
export type TierFilterState = {
  type?: string | null
  fit?: string | null
  material?: string | null   // 🔹 NEW: material dimension
  // later: gsmBand?: string | null; occasion?: string | null; etc.
}

// All tiers' filter state
export type TierFilters = Partial<Record<TierKey, TierFilterState>>

// Filter dimensions currently supported; keep in sync with TierFilterState keys
export type FilterDimensionId = keyof TierFilterState // 'type' | 'fit' | 'material'

// Config for each dimension (used by UI + AI)
export type FilterDimensionConfig = {
  id: FilterDimensionId
  pillLabel: string              // label shown before chips, e.g. "Filter by type"
  getValue: (card: CatalogCard) => string | null
}

// Central registry of dimensions currently supported by the UI
export const FILTER_DIMENSIONS: FilterDimensionConfig[] = [
  {
    id: 'type',
    pillLabel: 'Filter by type',
    getValue: (card) => card.type ?? null,
  },
  {
    id: 'fit',
    pillLabel: 'Filter by fit',
    getValue: (card) => card.fit ?? null,
  },
  {
    id: 'material',
    pillLabel: 'Filter by material',          // 🔹 NEW
    getValue: (card) => card.material ?? null,
  },
]
