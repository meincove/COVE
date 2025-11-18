'use client'

import type { TierFilterState } from '@/types/filters'
import DimensionBlock from '@/src/components/Catalog/DimensionBlock'

interface CatalogFilterPanelProps {
  tierLabel: string

  // filter state for this tier
  filtersForTier: TierFilterState

  // available options per dimension
  availableTypes: string[]
  availableFits: string[]
  availableMaterials: string[]

  // handlers: update underlying filters
  onTypeChange: (value: string | null) => void
  onFitChange: (value: string | null) => void
  onMaterialChange: (value: string | null) => void
}

export default function CatalogFilterPanel({
  tierLabel,
  filtersForTier,
  availableTypes,
  availableFits,
  availableMaterials,
  onTypeChange,
  onFitChange,
  onMaterialChange,
}: CatalogFilterPanelProps) {
  const activeType = filtersForTier.type ?? null
  const activeFit = filtersForTier.fit ?? null
  const activeMaterial = filtersForTier.material ?? null

  return (
    <div
      className="
        relative
        w-full h-full
        rounded-3xl
        bg-slate-950/80
        border border-white/15
        backdrop-blur-xl
        shadow-[0_18px_45px_rgba(0,0,0,0.65)]
        overflow-hidden
      "
    >
      {/* Right-side gradient fade into carousel */}
      <div
        className="
          pointer-events-none
          absolute inset-y-0 right-0 w-16
          bg-gradient-to-l from-slate-950/90 to-transparent
        "
      />

      {/* Inner content */}
      <div className="relative z-10 flex h-full flex-col px-4 py-3 gap-3">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-[0.28em] text-slate-400">
              Filtering AI
            </span>
            <span className="text-sm font-semibold text-slate-50">
              {tierLabel} stream
            </span>
          </div>

          {/* Status pill */}
          <div className="rounded-full bg-emerald-400/15 px-3 py-1 text-[10px] text-emerald-300 border border-emerald-400/40">
            Live
          </div>
        </div>

        {/* Core filter area: vertical list of dimensions */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto pr-2 space-y-3">
            <DimensionBlock
              label="Type"
              values={availableTypes}
              activeValue={activeType}
              onSelect={onTypeChange}
            />

            <DimensionBlock
              label="Fit"
              values={availableFits}
              activeValue={activeFit}
              onSelect={onFitChange}
            />

            <DimensionBlock
              label="Material"
              values={availableMaterials}
              activeValue={activeMaterial}
              onSelect={onMaterialChange}
            />
          </div>
        </div>

        {/* Footer – Advanced panel placeholder (still dummy for now) */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-[10px] uppercase tracking-[0.24em] text-slate-400">
            Advanced panel
          </span>
          <button
            className="
              text-[11px] font-medium
              px-3 py-1.5
              rounded-full
              bg-slate-800
              border border-white/15
              text-slate-50
              hover:bg-slate-700 hover:border-white/40
              transition
            "
          >
            Open
          </button>
        </div>
      </div>
    </div>
  )
}
