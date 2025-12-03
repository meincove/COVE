


'use client'

import { useRef, useState } from 'react'
import CatalogModalRoot from '@/src/components/Catalog/CatalogModalRoot'
import CatalogTierSection from '@/src/components/Catalog/CatalogTierSection'
import rawCatalogData from '@/data/catalogData.json'
import type { CatalogData, CatalogCard } from '@/types/product'
import type { TierFilters, TierFilterState, TierKey } from '@/types/filters'

const catalogData = rawCatalogData as unknown as CatalogData

const tierDescriptions: Partial<Record<TierKey | string, string>> = {
  casual: 'Everyday essentials made premium – your perfect go-to.',
  originals: 'Bold classics reimagined with quality and comfort.',
  limited: 'Explore Cove’s Limited collection.',
  designer: 'Streetwear elevated – premium materials, timeless finish.',
}

const formatTierLabel = (tierKey: string) =>
  tierKey.charAt(0).toUpperCase() + tierKey.slice(1)

export default function CatalogPage() {
  const [tierFilters, setTierFilters] = useState<TierFilters>({})
  const [activeTierKey, setActiveTierKey] = useState<TierKey | null>(null)

  const sectionRefs = useRef<Record<TierKey, HTMLDivElement | null>>(
    {} as Record<TierKey, HTMLDivElement | null>
  )

  const tierEntries = Object.entries(catalogData) as [TierKey, CatalogCard[]][]

  const updateTierFilters = (
    tierKey: TierKey,
    updater: (prev: TierFilterState) => TierFilterState
  ) => {
    setTierFilters((prev) => {
      const current = prev[tierKey] || {}
      return {
        ...prev,
        [tierKey]: updater(current),
      }
    })
  }

  return (
    <main className="w-full min-h-screen flex flex-col bg-[#F1F3E0]">
      {tierEntries.map(([tierKey, cards], index) => {
        const tierLabel = formatTierLabel(tierKey)
        const title = `Cove – ${tierLabel}`
        const description =
          tierDescriptions[tierKey] ?? `Explore Cove’s ${tierLabel} collection.`

        const filtersForTier: TierFilterState = tierFilters[tierKey] || {}

        return (
          <CatalogTierSection
            key={tierKey}
            tierKey={tierKey}
            index={index}
            title={title}
            description={description}
            cards={cards}
            filtersForTier={filtersForTier}
            updateFilters={(updater) => updateTierFilters(tierKey, updater)}
            onInView={(visibleTier) => setActiveTierKey(visibleTier)}
            sectionRef={(el) => {
              sectionRefs.current[tierKey] = el
            }}
          />
        )
      })}

      <CatalogModalRoot />
    </main>
  )
}
