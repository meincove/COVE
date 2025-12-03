'use client'

import { useRef, useState } from 'react'

// ✅ Use dummy components + new slider
import CatalogModalRoot from '@/src/components/CatalogDummyComponents/CatalogModalRoot'
import CatalogSceneSlider from '@/src/components/CatalogDummyComponents/CatalogSceneSlider'

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

export default function CatalogDummyPage() {
  const [tierFilters, setTierFilters] = useState<TierFilters>({})
  const [activeTierKey, setActiveTierKey] = useState<TierKey | null>(null)

  // still here if you want in the future (for HUD / dock sync)
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
    // 🔥 main dummy page background = black
    <main className="w-full min-h-screen flex flex-col bg-black">
      <CatalogSceneSlider
        tierEntries={tierEntries}
        tierFilters={tierFilters}
        updateTierFilters={updateTierFilters}
        tierDescriptions={tierDescriptions}
      />

      <CatalogModalRoot />
    </main>
  )
}
