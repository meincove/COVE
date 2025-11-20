'use client'

import CatalogCarousel from '@/src/components/Catalog/CatalogCarousel'
import { applyTierFilters, getAvailableValuesForDimension } from '@/src/lib/catalogFilterBrain'
import type { CatalogCard } from '@/types/product'
import type { TierFilterState, TierKey } from '@/types/filters'
import { useEffect, useState } from 'react'
import { useInView } from 'react-intersection-observer'
import CarouselStage from './CarouselStage'


// same union as in page.tsx, just local
type FilterMode = 'type' | 'fit' | 'material'

interface CatalogTierSectionProps {
  tierKey: TierKey
  index: number
  title: string
  description: string
  cards: CatalogCard[]
  filtersForTier: TierFilterState
  filterMode: FilterMode
  isAdvancedOpen: boolean
  onAdvancedToggle: () => void
  setFilterMode: (mode: FilterMode) => void
  updateFilters: (updater: (prev: TierFilterState) => TierFilterState) => void
    // NEW:
  onInView?: (tierKey: TierKey) => void
  sectionRef?: (el: HTMLDivElement | null) => void
}

const formatTierLabel = (tierKey: string) =>
  tierKey.charAt(0).toUpperCase() + tierKey.slice(1)

export default function CatalogTierSection(props: CatalogTierSectionProps) {
  const {
    tierKey,
    index,
    title,
    description,
    cards,
    filtersForTier,
    filterMode,
    isAdvancedOpen,
    onAdvancedToggle,
    setFilterMode,
    updateFilters,
  } = props

  const activeType = filtersForTier.type ?? null
  const activeFit = filtersForTier.fit ?? null
  const activeMaterial = filtersForTier.material ?? null
  const [isFilterOpen, setIsFilterOpen] = useState(true)


    const tierLabel = formatTierLabel(tierKey)


    const { onInView, sectionRef } = props

  const { ref: inViewRef, inView } = useInView({
    threshold: 0.55, // ~half the screen
    triggerOnce: false,
  })

  useEffect(() => {
    if (inView && onInView) {
      onInView(tierKey)
    }
  }, [inView, onInView, tierKey])

  const combinedRef = (node: HTMLDivElement | null) => {
    inViewRef(node)
    if (sectionRef) sectionRef(node)
  }


  // ---------------------------
  // 1) Simple top-bar filter
  // ---------------------------

  const displayDimension: FilterMode = filterMode

  const valuesForDisplayDimension = Array.from(
    new Set(
      cards
        .map((card) => {
          switch (displayDimension) {
            case 'type':
              return card.type
            case 'fit':
              return card.fit
            case 'material':
              return card.material
            default:
              return null
          }
        })
        .filter(Boolean)
    )
  )

  const activeSimpleValue =
    displayDimension === 'type'
      ? activeType
      : displayDimension === 'fit'
      ? activeFit
      : activeMaterial

  const handleSimpleChipClick = (value: string | null) => {
    updateFilters((prev) => ({
      ...prev,
      [displayDimension]: value,
    }))
  }

  const simpleLabel =
    displayDimension === 'type'
      ? 'Filter by type'
      : displayDimension === 'fit'
      ? 'Filter by fit'
      : 'Filter by material'

  // ---------------------------
  // 2) Advanced panel (dynamic tree)
  // ---------------------------

  const availableTypes = getAvailableValuesForDimension(
    cards,
    filtersForTier,
    'type'
  )
  const availableFits = getAvailableValuesForDimension(
    cards,
    filtersForTier,
    'fit'
  )
  const availableMaterials = getAvailableValuesForDimension(
    cards,
    filtersForTier,
    'material'
  )

  const handleAdvancedTypeClick = (value: string | null) => {
    updateFilters((prev) => ({
      ...prev,
      type: value,
    }))
  }

  const handleAdvancedFitClick = (value: string | null) => {
    updateFilters((prev) => ({
      ...prev,
      fit: value,
    }))
  }

  const handleAdvancedMaterialClick = (value: string | null) => {
    updateFilters((prev) => ({
      ...prev,
      material: value,
    }))
  }

      const filteredCards = applyTierFilters(cards, filtersForTier)

  return (
    <section
      key={tierKey}
      ref={combinedRef}
      // className="relative w-full h-screen overflow-hidden flex flex-col gap-6 py-10 px-4 bg-slate-800"
      className="
    relative w-full
    min-h-screen        /* ✅ allow taller than viewport */
    flex flex-col gap-6
    py-10 px-4
    bg-slate-800
  "
    >
      {/* Section Title (debug: green box) */}
      <div className="max-w-5xl">
        <div className="w-full rounded-xl px-6 py-6 bg-emerald-300">
          <h2 className="text-3xl font-bold text-black">{title}</h2>
          <p className="text-md text-gray-800 mt-1">{description}</p>
        </div>
      </div>

      {/* Main content: filters + advanced + carousel (debug: light overlay) */}
      <div className="flex-1 flex flex-col gap-4 bg-sky-200/20 rounded-xl px-2 py-2">
        {/* Filter mode toggle (TYPE / FIT / MATERIAL) */}
        <div className="flex items-center gap-4 px-2 pt-2 text-xs font-semibold uppercase tracking-widest text-gray-100">
          <span>Filter mode</span>
          <div className="inline-flex rounded-full border border-gray-500 overflow-hidden bg-slate-900">
            <button
              className={`px-3 py-1 ${
                filterMode === 'type'
                  ? 'bg-white text-black'
                  : 'bg-slate-900 text-gray-200'
              }`}
              onClick={() => setFilterMode('type')}
            >
              TYPE
            </button>
            <button
              className={`px-3 py-1 ${
                filterMode === 'fit'
                  ? 'bg-white text-black'
                  : 'bg-slate-900 text-gray-200'
              }`}
              onClick={() => setFilterMode('fit')}
            >
              FIT
            </button>
            <button
              className={`px-3 py-1 ${
                filterMode === 'material'
                  ? 'bg-white text-black'
                  : 'bg-slate-900 text-gray-200'
              }`}
              onClick={() => setFilterMode('material')}
            >
              MATERIAL
            </button>
          </div>
        </div>

        {/* Simple filter bar */}
        <div className="w-full flex flex-wrap items-center gap-3 px-2 pt-2">
          <span className="text-xs font-semibold uppercase text-gray-100 tracking-widest">
            {simpleLabel}
          </span>

          <button
            className={`px-3 py-1 text-xs rounded-full border transition ${
              activeSimpleValue === null
                ? 'bg-white text-black border-white'
                : 'border-gray-400 text-gray-200 hover:border-white'
            }`}
            onClick={() => handleSimpleChipClick(null)}
          >
            All
          </button>

          {valuesForDisplayDimension.map((value) => (
            <button
              key={value}
              className={`px-3 py-1 text-xs rounded-full border transition ${
                activeSimpleValue === value
                  ? 'bg-white text-black border-white'
                  : 'border-gray-400 text-gray-200 hover:border-white'
              }`}
              onClick={() => handleSimpleChipClick(value)}
            >
              {value}
            </button>
          ))}
        </div>

        {/* Advanced combinations toggle */}
       <div className="flex items-center justify-between px-2 pt-4">
  <span className="text-[11px] font-semibold tracking-[0.2em] uppercase text-gray-300">
    Advanced combinations
  </span>

  <div className="flex items-center gap-2">
    {/* NEW: Filtering AI toggle */}
    <button
      type="button"
      onClick={() => setIsFilterOpen((prev) => !prev)}
      className="text-xs px-3 py-1 rounded-full border border-gray-500 text-gray-100 hover:border-white transition bg-slate-900/60"
    >
      {isFilterOpen ? 'Hide filtering AI' : 'Show filtering AI'}
    </button>

    {/* Existing advanced panel toggle */}
    <button
      onClick={onAdvancedToggle}
      className="text-xs px-3 py-1 rounded-full border border-gray-500 text-gray-100 hover:border-white transition bg-slate-900/60"
    >
      {isAdvancedOpen ? 'Close panel' : 'Open panel'}
    </button>
  </div>
</div>


        {/* Advanced combinations panel */}
        {isAdvancedOpen && (
          <div className="w-full rounded-xl border border-gray-500 bg-slate-900/80 shadow-sm px-6 py-4 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-300">
              Refine {formatTierLabel(tierKey)} filters
            </p>

            {/* TYPE row */}
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-400">
                Type
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  className={`px-3 py-1 text-xs rounded-full border ${
                    activeType == null
                      ? 'bg-white text-black border-white'
                      : 'border-gray-500 text-gray-100 hover:border-white'
                  }`}
                  onClick={() => handleAdvancedTypeClick(null)}
                >
                  All types
                </button>
                {availableTypes.map((type) => (
                  <button
                    key={type}
                    className={`px-3 py-1 text-xs rounded-full border ${
                      activeType === type
                        ? 'bg-white text-black border-white'
                        : 'border-gray-500 text-gray-100 hover:border-white'
                    }`}
                    onClick={() => handleAdvancedTypeClick(type)}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* FIT row */}
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-400">
                Fit
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  className={`px-3 py-1 text-xs rounded-full border ${
                    activeFit == null
                      ? 'bg-white text-black border-white'
                      : 'border-gray-500 text-gray-100 hover:border-white'
                  }`}
                  onClick={() => handleAdvancedFitClick(null)}
                >
                  All fits
                </button>
                {availableFits.map((fit) => (
                  <button
                    key={fit}
                    className={`px-3 py-1 text-xs rounded-full border ${
                      activeFit === fit
                        ? 'bg-white text-black border-white'
                        : 'border-gray-500 text-gray-100 hover:border-white'
                    }`}
                    onClick={() => handleAdvancedFitClick(fit)}
                  >
                    {fit}
                  </button>
                ))}
              </div>
            </div>

            {/* MATERIAL row */}
            <div className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-400">
                Material
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  className={`px-3 py-1 text-xs rounded-full border ${
                    activeMaterial == null
                      ? 'bg-white text-black border-white'
                      : 'border-gray-500 text-gray-100 hover:border-white'
                  }`}
                  onClick={() => handleAdvancedMaterialClick(null)}
                >
                  All materials
                </button>
                {availableMaterials.map((mat) => (
                  <button
                    key={mat}
                    className={`px-3 py-1 text-xs rounded-full border ${
                      activeMaterial === mat
                        ? 'bg-white text-black border-white'
                        : 'border-gray-500 text-gray-100 hover:border-white'
                    }`}
                    onClick={() => handleAdvancedMaterialClick(mat)}
                  >
                    {mat}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

       
{/* Carousel stage for this tier (debug: yellow outer, staged inner) */}
{/* <div className="w-full rounded-xl px-2 py-6 mt-2 flex-1 bg-yellow-200"> */}

<div
  className="
    w-full
    rounded-xl
    px-2 py-6 mt-2
    flex-1
    bg-yellow-200
    relative
    overflow-x-hidden   /* ✅ nothing can bleed out sideways */
    overflow-y-visible  /* but allow vertical growth */
  "
>
  <CarouselStage
    cards={filteredCards}
    sectionKey={`carousel-${index}-${tierKey}-${activeType ?? 'ALL'}-${
      activeFit ?? 'ALL'
    }-${activeMaterial ?? 'ALL'}`}
    tierLabel={tierLabel}
    filtersForTier={filtersForTier}
    availableTypes={availableTypes}
    availableFits={availableFits}
    availableMaterials={availableMaterials}
    onTypeChange={handleAdvancedTypeClick}
    onFitChange={handleAdvancedFitClick}
    onMaterialChange={handleAdvancedMaterialClick}
    isFilterOpen={isFilterOpen}
  />
</div>



      </div>
    </section>
  )
}
