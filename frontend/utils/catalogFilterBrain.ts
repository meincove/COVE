// src/utils/catalogFilterBrain.ts

import type { CatalogCard } from '@/types/product'
import type { TierFilterState } from '@/types/filters'

/**
 * Central catalog filter brain.
 * Given a tier's cards and that tier's filter state,
 * returns only the cards that match.
 *
 * This is what we’ll later reuse from:
 *  - Catalog page
 *  - tools/catalogSearch backend endpoint
 *  - Cove AI “filter this carousel” tool
 */
export const applyTierFilters = (
  cards: CatalogCard[],
  filters: TierFilterState
): CatalogCard[] => {
  return cards.filter((card) => {
    // ---- TYPE ----
    if (filters.type && card.type !== filters.type) {
      return false
    }

    // ---- FIT ----
    if (filters.fit && card.fit !== filters.fit) {
      return false
    }

    // 🔜 future: material, gsmBand, color, occasion, etc.
    // if (filters.material && card.material !== filters.material) return false;

    return true
  })
}
