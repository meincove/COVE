// src/lib/catalogFilterBrain.ts

import type { CatalogCard } from '@/types/product'
import type { TierFilterState, FilterDimensionId } from '@/types/filters'
import { FILTER_DIMENSIONS } from '@/types/filters'

/**
 * Core filter: apply all active fields of a TierFilterState
 * to a list of CatalogCard and return the intersection.
 *
 * This powers BOTH:
 * - simple bar (independent props)
 * - advanced panel (tree UI, same underlying state)
 */
export function applyTierFilters(
  cards: CatalogCard[],
  filters: TierFilterState | undefined
): CatalogCard[] {
  if (!filters) return cards

  return cards.filter((card) => {
    // type
    if (filters.type && card.type !== filters.type) return false

    // fit
    if (filters.fit && card.fit !== filters.fit) return false

    // material
    if (filters.material && card.material !== filters.material) return false

    // 🔜 later we can add gsmBand, colorName, etc. here.

    return true
  })
}

/**
 * Dynamic tree helper:
 *
 * For a given dimension (type / fit / material), we:
 * 1. Clear only THIS dimension from the filter state.
 * 2. Apply all the OTHER active filters.
 * 3. From the remaining cards, collect all distinct values
 *    for THIS dimension.
 *
 * This is what makes "whichever you click first becomes the parent"
 * behaviour possible.
 */
export function getAvailableValuesForDimension(
  cards: CatalogCard[],
  filters: TierFilterState,
  dimensionId: FilterDimensionId
): string[] {
  // 1) Clear just this dimension from the current filters
  const filtersWithoutThisDim: TierFilterState = {
    ...filters,
    [dimensionId]: null,
  }

  // 2) Filter cards using the remaining active dimensions
  const constrainedCards = applyTierFilters(cards, filtersWithoutThisDim)

  // 3) Use the FILTER_DIMENSIONS registry to extract the right field
  const dimConfig = FILTER_DIMENSIONS.find((d) => d.id === dimensionId)
  if (!dimConfig) return []

  const values = new Set<string>()
  for (const card of constrainedCards) {
    const v = dimConfig.getValue(card)
    if (v) values.add(v)
  }

  // Sorted just for a nicer UI
  return Array.from(values).sort()
}

/**
 * Helper: tiny utility to check if a card matches one single dimension.
 * Not currently used by the page, but we might reuse it later.
 */
export function matchesDimension(
  dim: FilterDimensionId,
  card: CatalogCard,
  filters: TierFilterState
): boolean {
  switch (dim) {
    case 'type':
      return !filters.type || card.type === filters.type
    case 'fit':
      return !filters.fit || card.fit === filters.fit
    case 'material':
      return !filters.material || card.material === filters.material
    default:
      return true
  }
}
