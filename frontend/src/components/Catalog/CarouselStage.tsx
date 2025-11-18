// src/components/Catalog/CarouselStage.tsx

'use client'

import CatalogCarousel from '@/src/components/Catalog/CatalogCarousel'
import CatalogFilterPanel from '@/src/components/Catalog/CatalogFilterPanel'
import type { CatalogCard } from '@/types/product'
import type { TierFilterState } from '@/types/filters'

interface CarouselStageProps {
  cards: CatalogCard[]
  sectionKey: string
  tierLabel: string

  filtersForTier: TierFilterState
  availableTypes: string[]
  availableFits: string[]
  availableMaterials: string[]
  onTypeChange: (value: string | null) => void
  onFitChange: (value: string | null) => void
  onMaterialChange: (value: string | null) => void
}

export default function CarouselStage({
  cards,
  sectionKey,
  tierLabel,
  filtersForTier,
  availableTypes,
  availableFits,
  availableMaterials,
  onTypeChange,
  onFitChange,
  onMaterialChange,
}: CarouselStageProps) {
  return (
    <div
      className="
        relative w-full
        h-[360px] sm:h-[400px] md:h-[460px] lg:h-[520px] xl:h-[560px]
        overflow-hidden
      "
    >
      {/* BACK LAYER: 3D carousel "machine" */}
      <div className="absolute inset-0 z-0 flex items-center justify-center">
        <CatalogCarousel cards={cards} sectionKey={sectionKey} />
      </div>

      {/* FRONT LAYER: Filtering AI panel on the left */}
      <div
        className="
          absolute left-0 top-1/2 -translate-y-1/2
          z-10
          w-[70%] xs:w-[60%] sm:w-[45%] md:w-[35%] lg:w-[30%]
          max-w-md h-[72%]
          px-1
        "
      >
        <CatalogFilterPanel
          tierLabel={tierLabel}
          filtersForTier={filtersForTier}
          availableTypes={availableTypes}
          availableFits={availableFits}
          availableMaterials={availableMaterials}
          onTypeChange={onTypeChange}
          onFitChange={onFitChange}
          onMaterialChange={onMaterialChange}
        />
      </div>
    </div>
  )
}
