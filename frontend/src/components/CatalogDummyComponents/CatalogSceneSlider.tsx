'use client'

import { useState } from 'react'

import type { CatalogCard } from '@/types/product'
import type { TierFilters, TierFilterState, TierKey } from '@/types/filters'
import TierScene from './TierScene'

const formatTierLabel = (tierKey: string) =>
  tierKey.charAt(0).toUpperCase() + tierKey.slice(1)

interface CatalogSceneSliderProps {
  tierEntries: [TierKey, CatalogCard[]][]
  tierFilters: TierFilters
  updateTierFilters: (
    tierKey: TierKey,
    updater: (prev: TierFilterState) => TierFilterState
  ) => void
  tierDescriptions: Partial<Record<TierKey | string, string>>
}

type Direction = 1 | -1

export default function CatalogSceneSlider({
  tierEntries,
  tierFilters,
  updateTierFilters,
  tierDescriptions,
}: CatalogSceneSliderProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [direction, setDirection] = useState<Direction>(1)

  const [activeTierKey, activeCards] = tierEntries[activeIndex]
  const tierLabel = formatTierLabel(activeTierKey)
  const title = `Cove – ${tierLabel}`

  const description =
    tierDescriptions[activeTierKey] ?? `Explore Cove’s ${tierLabel} collection.`

  const filtersForTier: TierFilterState = tierFilters[activeTierKey] || {}

  const handleSelectTier = (nextIndex: number) => {
    if (nextIndex === activeIndex) return
    const dir: Direction = nextIndex > activeIndex ? 1 : -1
    setDirection(dir)
    setActiveIndex(nextIndex)
  }

  return (
    <section className="relative w-full min-h-screen bg-black overflow-hidden">
      {/* Scene – background morphs, content swaps */}
      <TierScene
        tierKey={activeTierKey}
        index={activeIndex}
        title={title}
        description={description}
        cards={activeCards}
        filtersForTier={filtersForTier}
        updateFilters={(updater) => updateTierFilters(activeTierKey, updater)}
        direction={direction}
      />

            {/* Floating bottom dock */}
      <div className="absolute inset-x-0 bottom-6 flex justify-center z-20">
        <div className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-black/30 backdrop-blur-md border border-white/15 shadow-sm">
          {tierEntries.map(([tierKey], idx) => {
            const isActive = idx === activeIndex
            const label = formatTierLabel(tierKey)

            return (
              <button
                key={tierKey}
                type="button"
                onClick={() => handleSelectTier(idx)}
                className={[
                  'px-4 py-1.5 rounded-full text-xs md:text-sm uppercase tracking-[0.16em]',
                  'transition-all duration-250',
                  isActive
                    ? 'bg-white text-black shadow-md'
                    : 'bg-transparent text-white/70 hover:bg-white/10',
                ].join(' ')}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

    </section>
  )
}
