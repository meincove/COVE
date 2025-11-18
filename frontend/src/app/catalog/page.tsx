// 'use client'

// import { useState } from 'react'
// import { useRouter } from 'next/navigation'

// import CatalogCarousel from '@/src/components/Catalog/CatalogCarousel'
// import CatalogModalRoot from '@/src/components/Catalog/CatalogModalRoot'

// import rawCatalogData from '@/data/catalogData.json'
// import type { CatalogData, CatalogCard } from '@/types/product'
// import type { TierFilters, TierFilterState, TierKey } from '@/types/filters'
// import { applyTierFilters, getAvailableValuesForDimension } from '@/src/lib/catalogFilterBrain'

// // ---------------------------
// // Data + small helpers
// // ---------------------------

// // Treat JSON as typed catalog data
// const catalogData = rawCatalogData as unknown as CatalogData

// // Helper: format tier names nicely
// const formatTierLabel = (tierKey: string) =>
//   tierKey.charAt(0).toUpperCase() + tierKey.slice(1)

// // Optional: custom descriptions per known tier
// const tierDescriptions: Partial<Record<TierKey | string, string>> = {
//   casual: 'Everyday essentials made premium – your perfect go-to.',
//   originals: 'Bold classics reimagined with quality and comfort.',
//   designer: 'Streetwear elevated – premium materials, timeless finish.',
// }

// type FilterMode = 'type' | 'fit' | 'material'

// export default function CatalogPage() {
//   const router = useRouter()

//   // 🔹 Shared per-tier filter state: { [tierKey]: { type?, fit?, material? } }
//   const [tierFilters, setTierFilters] = useState<TierFilters>({})

//   // 🔹 Simple slider at the top: which dimension are the chips controlling?
//   const [filterMode, setFilterMode] = useState<FilterMode>('type')

//   // 🔹 Advanced panel visibility
//   const [openAdvancedTier, setOpenAdvancedTier] = useState<TierKey | null>(null)

//   const tierEntries = Object.entries(catalogData) as [TierKey, CatalogCard[]][]

//   // Helper: update one tier's filters
//   const updateTierFilters = (
//     tierKey: TierKey,
//     updater: (prev: TierFilterState) => TierFilterState
//   ) => {
//     setTierFilters((prev) => {
//       const current = prev[tierKey] || {}
//       return {
//         ...prev,
//         [tierKey]: updater(current),
//       }
//     })
//   }

//   return (
//     <main className="w-full min-h-screen bg-white flex flex-col gap-16 py-16 px-4">
//       {/* Back button */}
//       <button
//         onClick={() => router.back()}
//         className="mb-4 text-sm text-gray-700 hover:underline"
//       >
//         ← Back
//       </button>

//       {tierEntries.map(([tierKey, cards], index) => {
//         const title = `Cove – ${formatTierLabel(tierKey)}`
//         const description =
//           tierDescriptions[tierKey] ??
//           `Explore Cove’s ${formatTierLabel(tierKey)} collection.`

//         const filtersForTier: TierFilterState = tierFilters[tierKey] || {}
//         const activeType = filtersForTier.type ?? null
//         const activeFit = filtersForTier.fit ?? null
//         const activeMaterial = filtersForTier.material ?? null

//         // ---------------------------
//         // 1) Simple top-bar filter
//         // ---------------------------

//         const displayDimension: FilterMode = filterMode

//         const valuesForDisplayDimension = Array.from(
//           new Set(
//             cards
//               .map((card) => {
//                 switch (displayDimension) {
//                   case 'type':
//                     return card.type
//                   case 'fit':
//                     return card.fit
//                   case 'material':
//                     return card.material
//                   default:
//                     return null
//                 }
//               })
//               .filter(Boolean)
//           )
//         )

//         const activeSimpleValue =
//           displayDimension === 'type'
//             ? activeType
//             : displayDimension === 'fit'
//             ? activeFit
//             : activeMaterial

//         const handleSimpleChipClick = (value: string | null) => {
//           updateTierFilters(tierKey, (prev) => ({
//             ...prev,
//             [displayDimension]: value,
//           }))
//         }

//         const simpleLabel =
//           displayDimension === 'type'
//             ? 'Filter by type'
//             : displayDimension === 'fit'
//             ? 'Filter by fit'
//             : 'Filter by material'

//         // ---------------------------
//         // 2) Advanced panel (dynamic tree)
//         // ---------------------------
//         // Each row (type / fit / material) derives its options by:
//         // "filter with all OTHER active dims, then list values for THIS dim".

//         const availableTypes = getAvailableValuesForDimension(
//           cards,
//           filtersForTier,
//           'type'
//         )
//         const availableFits = getAvailableValuesForDimension(
//           cards,
//           filtersForTier,
//           'fit'
//         )
//         const availableMaterials = getAvailableValuesForDimension(
//           cards,
//           filtersForTier,
//           'material'
//         )

//         const handleAdvancedTypeClick = (value: string | null) => {
//           updateTierFilters(tierKey, (prev) => ({
//             ...prev,
//             type: value,
//           }))
//         }

//         const handleAdvancedFitClick = (value: string | null) => {
//           updateTierFilters(tierKey, (prev) => ({
//             ...prev,
//             fit: value,
//           }))
//         }

//         const handleAdvancedMaterialClick = (value: string | null) => {
//           updateTierFilters(tierKey, (prev) => ({
//             ...prev,
//             material: value,
//           }))
//         }

//         // ---------------------------
//         // 3) Final cards for carousel
//         // ---------------------------

//         const filteredCards = applyTierFilters(cards, filtersForTier)

//         return (
//           <section
//             key={tierKey}
//             className="relative my-[160px] overflow-visible flex flex-col gap-6"
//           >
//             {/* Section Title */}
//             <div className="w-full bg-gray-400 rounded-xl px-6 py-6">
//               <h2 className="text-3xl font-bold text-black">{title}</h2>
//               <p className="text-md text-gray-800 mt-1">{description}</p>
//             </div>

//             {/* Filter mode toggle (TYPE / FIT / MATERIAL) */}
//             <div className="flex items-center gap-4 px-2 pt-4 text-xs font-semibold uppercase tracking-widest text-gray-700">
//               <span>Filter mode</span>
//               <div className="inline-flex rounded-full border border-gray-300 overflow-hidden">
//                 <button
//                   className={`px-3 py-1 ${
//                     filterMode === 'type'
//                       ? 'bg-black text-white'
//                       : 'bg-white text-gray-700'
//                   }`}
//                   onClick={() => setFilterMode('type')}
//                 >
//                   TYPE
//                 </button>
//                 <button
//                   className={`px-3 py-1 ${
//                     filterMode === 'fit'
//                       ? 'bg-black text-white'
//                       : 'bg-white text-gray-700'
//                   }`}
//                   onClick={() => setFilterMode('fit')}
//                 >
//                   FIT
//                 </button>
//                 <button
//                   className={`px-3 py-1 ${
//                     filterMode === 'material'
//                       ? 'bg-black text-white'
//                       : 'bg-white text-gray-700'
//                   }`}
//                   onClick={() => setFilterMode('material')}
//                 >
//                   MATERIAL
//                 </button>
//               </div>
//             </div>

//             {/* Simple filter bar */}
//             <div className="w-full flex flex-wrap items-center gap-3 px-2 pt-2">
//               <span className="text-xs font-semibold uppercase text-gray-600 tracking-widest">
//                 {simpleLabel}
//               </span>

//               {/* "All" chip */}
//               <button
//                 className={`px-3 py-1 text-xs rounded-full border transition ${
//                   activeSimpleValue === null
//                     ? 'bg-black text-white border-black'
//                     : 'border-gray-400 text-gray-800 hover:border-black'
//                 }`}
//                 onClick={() => handleSimpleChipClick(null)}
//               >
//                 All
//               </button>

//               {/* Value chips */}
//               {valuesForDisplayDimension.map((value) => (
//                 <button
//                   key={value}
//                   className={`px-3 py-1 text-xs rounded-full border transition ${
//                     activeSimpleValue === value
//                       ? 'bg-black text-white border-black'
//                       : 'border-gray-400 text-gray-800 hover:border-black'
//                   }`}
//                   onClick={() => handleSimpleChipClick(value)}
//                 >
//                   {value}
//                 </button>
//               ))}
//             </div>

//             {/* Advanced combinations toggle */}
//             <div className="flex items-center justify-between px-2 pt-4">
//               <span className="text-[11px] font-semibold tracking-[0.2em] uppercase text-gray-500">
//                 Advanced combinations
//               </span>
//               <button
//                 onClick={() =>
//                   setOpenAdvancedTier(
//                     openAdvancedTier === tierKey ? null : tierKey
//                   )
//                 }
//                 className="text-xs px-3 py-1 rounded-full border border-gray-300 text-gray-700 hover:border-black transition"
//               >
//                 {openAdvancedTier === tierKey ? 'Close panel' : 'Open panel'}
//               </button>
//             </div>

//             {/* Advanced combinations panel */}
//             {openAdvancedTier === tierKey && (
//               <div className="w-full rounded-xl border border-gray-200 bg-white shadow-sm px-6 py-4 space-y-4">
//                 <p className="text-xs font-semibold uppercase tracking-widest text-gray-500">
//                   Refine {formatTierLabel(tierKey)} filters
//                 </p>

//                 {/* TYPE row */}
//                 <div className="space-y-2">
//                   <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-500">
//                     Type
//                   </p>
//                   <div className="flex flex-wrap gap-2">
//                     <button
//                       className={`px-3 py-1 text-xs rounded-full border ${
//                         activeType == null
//                           ? 'bg-black text-white border-black'
//                           : 'border-gray-400 text-gray-800 hover:border-black'
//                       }`}
//                       onClick={() => handleAdvancedTypeClick(null)}
//                     >
//                       All types
//                     </button>
//                     {availableTypes.map((type) => (
//                       <button
//                         key={type}
//                         className={`px-3 py-1 text-xs rounded-full border ${
//                           activeType === type
//                             ? 'bg-black text-white border-black'
//                             : 'border-gray-400 text-gray-800 hover:border-black'
//                         }`}
//                         onClick={() => handleAdvancedTypeClick(type)}
//                       >
//                         {type}
//                       </button>
//                     ))}
//                   </div>
//                 </div>

//                 {/* FIT row */}
//                 <div className="space-y-2">
//                   <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-500">
//                     Fit
//                   </p>
//                   <div className="flex flex-wrap gap-2">
//                     <button
//                       className={`px-3 py-1 text-xs rounded-full border ${
//                         activeFit == null
//                           ? 'bg-black text-white border-black'
//                           : 'border-gray-400 text-gray-800 hover:border-black'
//                       }`}
//                       onClick={() => handleAdvancedFitClick(null)}
//                     >
//                       All fits
//                     </button>
//                     {availableFits.map((fit) => (
//                       <button
//                         key={fit}
//                         className={`px-3 py-1 text-xs rounded-full border ${
//                           activeFit === fit
//                             ? 'bg-black text-white border-black'
//                             : 'border-gray-400 text-gray-800 hover:border-black'
//                         }`}
//                         onClick={() => handleAdvancedFitClick(fit)}
//                       >
//                         {fit}
//                       </button>
//                     ))}
//                   </div>
//                 </div>

//                 {/* MATERIAL row */}
//                 <div className="space-y-2">
//                   <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-500">
//                     Material
//                   </p>
//                   <div className="flex flex-wrap gap-2">
//                     <button
//                       className={`px-3 py-1 text-xs rounded-full border ${
//                         activeMaterial == null
//                           ? 'bg-black text-white border-black'
//                           : 'border-gray-400 text-gray-800 hover:border-black'
//                       }`}
//                       onClick={() => handleAdvancedMaterialClick(null)}
//                     >
//                       All materials
//                     </button>
//                     {availableMaterials.map((mat) => (
//                       <button
//                         key={mat}
//                         className={`px-3 py-1 text-xs rounded-full border ${
//                           activeMaterial === mat
//                             ? 'bg-black text-white border-black'
//                             : 'border-gray-400 text-gray-800 hover:border-black'
//                         }`}
//                         onClick={() => handleAdvancedMaterialClick(mat)}
//                       >
//                         {mat}
//                       </button>
//                     ))}
//                   </div>
//                 </div>
//               </div>
//             )}

//             {/* Carousel for this tier */}
//             <div className="w-full bg-[#d3efff] rounded-xl px-2 py-6">
//               <CatalogCarousel
//                 cards={filteredCards}
//                 sectionKey={`carousel-${index}-${tierKey}-${activeType ?? 'ALL'}-${
//                   activeFit ?? 'ALL'
//                 }-${activeMaterial ?? 'ALL'}`}
//               />
//             </div>
//           </section>
//         )
//       })}

//       {/* Global modal for all catalog carousels */}
//       <CatalogModalRoot />
//     </main>
//   )
// }










'use client'

import { useState,useRef} from 'react'
// import { useRouter } from 'next/navigation'  // ⬅ can be removed if unused later

import CatalogModalRoot from '@/src/components/Catalog/CatalogModalRoot'
import CatalogTierSection from '@/src/components/Catalog/CatalogTierSection'
import OverlaySectionHud from '@/src/components/common/OverlaySectionHud'

import rawCatalogData from '@/data/catalogData.json'
import type { CatalogData, CatalogCard } from '@/types/product'
import type { TierFilters, TierFilterState, TierKey } from '@/types/filters'

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

      {/* HUD: bottom pill navigation */}
      <OverlaySectionHud
        sections={tierEntries.map(([tierKey]) => ({
          id: tierKey,
          label: formatTierLabel(tierKey),
        }))}
        activeId={activeTierKey}
        onSelect={(id) => {
          const tierId = id as TierKey
          const el = sectionRefs.current[tierId]
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }
        }}
      />

      <CatalogModalRoot />
    </main>
  )
}

