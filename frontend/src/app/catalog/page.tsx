

'use client'

import { useState,useRef} from 'react'
import CatalogModalRoot from '@/src/components/Catalog/CatalogModalRoot'
import CatalogTierSection from '@/src/components/Catalog/CatalogTierSection'
import OverlaySectionHud from '@/src/components/common/OverlaySectionHud'
import rawCatalogData from '@/data/catalogData.json'
import type { CatalogData, CatalogCard } from '@/types/product'
import type { TierFilters, TierFilterState, TierKey } from '@/types/filters'
import { Shirt, Sparkles, Crown, Flame } from 'lucide-react'


// Treat JSON as typed catalog data
const catalogData = rawCatalogData as unknown as CatalogData

// Helper: format tier names nicely
const formatTierLabel = (tierKey: string) =>
  tierKey.charAt(0).toUpperCase() + tierKey.slice(1)

// Optional: custom descriptions per known tier
const tierDescriptions: Partial<Record<TierKey | string, string>> = {
  casual: 'Everyday essentials made premium – your perfect go-to.',
  originals: 'Bold classics reimagined with quality and comfort.',
  designer: 'Streetwear elevated – premium materials, timeless finish.',
}

const hudSections = [
  { id: 'casual',    label: 'Casual',    icon: <Shirt size={22} /> },
  { id: 'originals', label: 'Originals', icon: <Sparkles size={22} /> },
  { id: 'designer',  label: 'Designer',  icon: <Crown size={22} /> },
  { id: 'streetwear',    label: 'Streetwear', icon: <Flame size={22} /> },
]

export type FilterMode = 'type' | 'fit' | 'material'

export default function CatalogPage() {
  // const router = useRouter()

  const [tierFilters, setTierFilters] = useState<TierFilters>({})
  const [filterMode, setFilterMode] = useState<FilterMode>('type')
  const [openAdvancedTier, setOpenAdvancedTier] = useState<TierKey | null>(null)

  const [activeTierKey, setActiveTierKey] = useState<TierKey | null>(null)

  const sectionRefs = useRef<Record<TierKey, HTMLDivElement | null>>({} as Record<
    TierKey,
    HTMLDivElement | null
  >)


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
    <main className="w-full min-h-screen bg-slate-900 flex flex-col">
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
            filterMode={filterMode}
            isAdvancedOpen={openAdvancedTier === tierKey}
            onAdvancedToggle={() =>
              setOpenAdvancedTier((prev) => (prev === tierKey ? null : tierKey))
            }
            setFilterMode={setFilterMode}
            updateFilters={(updater) => updateTierFilters(tierKey, updater)}
            // NEW:
            onInView={(visibleTier) => setActiveTierKey(visibleTier)}
            sectionRef={(el) => {
              sectionRefs.current[tierKey] = el
            }}
          />
        )
      })}

      {/* <OverlaySectionHud
        sections={hudSections}
        activeId={activeTierKey ?? 'casual'}
        onSelect={(id) => {
          const tierId = id as TierKey
          const el = sectionRefs.current[tierId]
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }
        }}
      /> */}

      <CatalogModalRoot />
    </main>
  )
}

