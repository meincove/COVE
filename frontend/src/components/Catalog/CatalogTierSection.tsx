// src/components/Catalog/CatalogTierSection.tsx
'use client'

import { useEffect, useState } from 'react'
import { useInView } from 'react-intersection-observer'

import {
  applyTierFilters,
  getAvailableValuesForDimension,
} from '@/lib/catalogFilterBrain'
import type { CatalogCard } from '@/types/product'
import type { TierFilterState, TierKey } from '@/types/filters'
import CarouselStage from './CarouselStage'

interface CatalogTierSectionProps {
  tierKey: TierKey
  index: number
  title: string
  description: string
  cards: CatalogCard[]
  filtersForTier: TierFilterState
  updateFilters: (updater: (prev: TierFilterState) => TierFilterState) => void
  onInView?: (tierKey: TierKey) => void
  sectionRef?: (el: HTMLDivElement | null) => void
}

const formatTierLabel = (tierKey: string) =>
  tierKey.charAt(0).toUpperCase() + tierKey.slice(1)

export default function CatalogTierSection({
  tierKey,
  index,
  title,
  description,
  cards,
  filtersForTier,
  updateFilters,
  onInView,
  sectionRef,
}: CatalogTierSectionProps) {
  const activeType = filtersForTier.type ?? null
  const activeFit = filtersForTier.fit ?? null
  const activeMaterial = filtersForTier.material ?? null

  const [isFilterOpen, setIsFilterOpen] = useState(true)
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false)

  const { ref: inViewRef, inView } = useInView({
    threshold: 0.55,
    triggerOnce: false,
  })

  useEffect(() => {
    if (inView && onInView) onInView(tierKey)
  }, [inView, onInView, tierKey])

  const combinedRef = (node: HTMLDivElement | null) => {
    inViewRef(node)
    if (sectionRef) sectionRef(node)
  }

  /* ---------------- ADVANCED PANEL DATA ---------------- */

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
  const tierLabel = formatTierLabel(tierKey)

  return (
    <section
      ref={combinedRef}
      className="
        relative w-full min-h-screen
        flex flex-col
        bg-[radial-gradient(circle_at_center,_rgba(161,188,152,0.22)_0,_rgba(210,220,182,0.7)_40%,_rgba(241,243,224,1)_90%)]
      "
    >
      {/* TITLE + DESCRIPTION */}
      <div className="w-full max-w-5xl mx-auto px-6 pt-10 pb-6 min-h-[24vh] flex flex-col justify-center">
        <h2 className="text-3xl font-semibold text-slate-900 mb-2">
          {title}
        </h2>
        <p className="text-sm text-slate-800 max-w-xl">{description}</p>
      </div>

      {/* CAROUSEL AREA – shares same radial background */}
      <div className="flex-1 w-full flex items-center justify-center">
        <div className="w-full max-w-6xl mx-auto h-full">
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

      {/* STICKY BOTTOM FILTER CONTROLS (per tier) */}
      <div className="w-full sticky bottom-6 z-20 flex justify-center pointer-events-none">
        <div
          className="
            flex gap-3
            rounded-full
            bg-slate-900/5
            backdrop-blur-sm
            px-3 py-1.5
            pointer-events-auto
          "
        >
          <button
            type="button"
            onClick={() => setIsFilterOpen((prev) => !prev)}
            className="
              text-xs px-4 py-1.5 rounded-full
              border border-slate-500/60
              bg-slate-900 text-slate-50
              hover:border-slate-200 transition
            "
          >
            {isFilterOpen ? 'Hide filters' : 'Show filters'}
          </button>

          <button
            type="button"
            onClick={() => setIsAdvancedOpen((prev) => !prev)}
            className="
              text-xs px-4 py-1.5 rounded-full
              border border-slate-500/60
              bg-white/80 text-slate-900
              hover:border-slate-900 transition
            "
          >
            {isAdvancedOpen ? 'Close advanced' : 'Open advanced'}
          </button>
        </div>
      </div>

      {/* ADVANCED PANEL */}
      {isAdvancedOpen && (
        <div className="w-full max-w-5xl mx-auto mb-10 mt-4 rounded-2xl border border-slate-500/30 bg-slate-900/80 px-6 py-4 space-y-4 shadow-lg">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-100/80">
            Refine {tierLabel} filters
          </p>

          {/* TYPE row */}
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300">
              Type
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                className={`px-3 py-1 text-xs rounded-full border ${
                  activeType == null
                    ? 'bg-white text-slate-900 border-white'
                    : 'border-slate-500 text-slate-100 hover:border-white'
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
                      ? 'bg-white text-slate-900 border-white'
                      : 'border-slate-500 text-slate-100 hover:border-white'
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
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300">
              Fit
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                className={`px-3 py-1 text-xs rounded-full border ${
                  activeFit == null
                    ? 'bg-white text-slate-900 border-white'
                    : 'border-slate-500 text-slate-100 hover:border-white'
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
                      ? 'bg-white text-slate-900 border-white'
                      : 'border-slate-500 text-slate-100 hover:border-white'
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
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-300">
              Material
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                className={`px-3 py-1 text-xs rounded-full border ${
                  activeMaterial == null
                    ? 'bg-white text-slate-900 border-white'
                    : 'border-slate-500 text-slate-100 hover:border-white'
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
                      ? 'bg-white text-slate-900 border-white'
                      : 'border-slate-500 text-slate-100 hover:border-white'
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
    </section>
  )
}




// 'use client'

// import { useEffect, useState } from 'react'
// import { useInView } from 'react-intersection-observer'
// import { AnimatePresence, motion } from 'framer-motion'

// import CarouselStage from './CarouselStage'
// import {
//   applyTierFilters,
//   getAvailableValuesForDimension,
// } from '@/lib/catalogFilterBrain'
// import type { CatalogCard } from '@/types/product'
// import type { TierFilterState, TierKey } from '@/types/filters'

// interface CatalogTierSectionProps {
//   tierKey: TierKey
//   index: number
//   title: string
//   description: string
//   cards: CatalogCard[]
//   filtersForTier: TierFilterState
//   updateFilters: (updater: (prev: TierFilterState) => TierFilterState) => void
//   onInView?: (tierKey: TierKey) => void
//   sectionRef?: (el: HTMLDivElement | null) => void
// }

// const formatTierLabel = (tierKey: string) =>
//   tierKey.charAt(0).toUpperCase() + tierKey.slice(1)

// export default function CatalogTierSection({
//   tierKey,
//   index,
//   title,
//   description,
//   cards,
//   filtersForTier,
//   updateFilters,
//   onInView,
//   sectionRef,
// }: CatalogTierSectionProps) {
//   const tierLabel = formatTierLabel(tierKey)

//   const [isFilterOpen, setIsFilterOpen] = useState(false)
//   const [isAdvancedOpen, setIsAdvancedOpen] = useState(false)

//   const activeType = filtersForTier.type ?? null
//   const activeFit = filtersForTier.fit ?? null
//   const activeMaterial = filtersForTier.material ?? null

//   const { ref: inViewRef, inView } = useInView({
//     threshold: 0.55,
//     triggerOnce: false,
//   })

//   useEffect(() => {
//     if (inView && onInView) onInView(tierKey)
//   }, [inView, onInView, tierKey])

//   const combinedRef = (node: HTMLDivElement | null) => {
//     inViewRef(node)
//     if (sectionRef) sectionRef(node)
//   }

//   // ----- available values for this tier only -----
//   const availableTypes = getAvailableValuesForDimension(
//     cards,
//     filtersForTier,
//     'type'
//   )
//   const availableFits = getAvailableValuesForDimension(
//     cards,
//     filtersForTier,
//     'fit'
//   )
//   const availableMaterials = getAvailableValuesForDimension(
//     cards,
//     filtersForTier,
//     'material'
//   )

//   const handleAdvancedTypeClick = (value: string | null) =>
//     updateFilters((prev) => ({ ...prev, type: value }))

//   const handleAdvancedFitClick = (value: string | null) =>
//     updateFilters((prev) => ({ ...prev, fit: value }))

//   const handleAdvancedMaterialClick = (value: string | null) =>
//     updateFilters((prev) => ({ ...prev, material: value }))

//   const filteredCards = applyTierFilters(cards, filtersForTier)

//   return (
//     <section
//       ref={combinedRef}
//       key={tierKey}
//       className="relative w-full min-h-screen flex flex-col "
//       style={{
//       background:
//         'radial-gradient(circle at center, #A1BC98 0%, #D2DCB6 40%, #F1F3E0 100%)',
//     }}
//     >
//       {/* 30%: Title / copy block */}
//       <div className="w-full min-h-[28vh] flex items-center px-0 py-0 backdrop-blur-sm">
//         <div className="max-w-4xl">
//           <h2 className="text-3xl font-bold text-slate-900">{title}</h2>
//           <p className="mt-2 text-sm text-slate-800">{description}</p>
//         </div>
//       </div>

//       {/* <div className="max-w-5xl mx-auto w-full">
//   <div className="w-full rounded-3xl px-6 py-6 bg-[#F1F3E0] border border-[#D2DCB6]">
//     <h2 className="text-3xl font-semibold text-[#778873]">{title}</h2>
//     <p className="text-sm text-[#778873] mt-1">{description}</p>
//   </div>
// </div> */}


//       {/* 70%: Carousel section */}
//       <div className="relative flex-1 w-full bg-[#FFE96A]">
//         {/* Advanced filter panel overlay – per tier */}
//         <AnimatePresence>
//           {isAdvancedOpen && (
//             <motion.div
//               key="advanced-panel"
//               initial={{ opacity: 0, y: 20 }}
//               animate={{ opacity: 1, y: 0 }}
//               exit={{ opacity: 0, y: 20 }}
//               transition={{ duration: 0.25, ease: 'easeOut' }}
//               className="
//                 absolute left-1/2 top-6 z-20 w-[min(90%,560px)]
//                 -translate-x-1/2 rounded-2xl border border-slate-300
//                 bg-slate-900/95 px-6 py-4 text-xs text-slate-100 shadow-lg
//               "
//             >
//               <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-gray-300">
//                 Advanced combinations – {tierLabel}
//               </p>

//               {/* TYPE row */}
//               <div className="mb-3 space-y-1.5">
//                 <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-gray-400">
//                   Type
//                 </p>
//                 <div className="flex flex-wrap gap-1.5">
//                   <button
//                     className={`px-2.5 py-1 rounded-full border text-[11px] ${
//                       activeType == null
//                         ? 'bg-white text-black border-white'
//                         : 'border-gray-500 text-gray-100 hover:border-white'
//                     }`}
//                     onClick={() => handleAdvancedTypeClick(null)}
//                   >
//                     All types
//                   </button>
//                   {availableTypes.map((t) => (
//                     <button
//                       key={t}
//                       className={`px-2.5 py-1 rounded-full border text-[11px] ${
//                         activeType === t
//                           ? 'bg-white text-black border-white'
//                           : 'border-gray-500 text-gray-100 hover:border-white'
//                       }`}
//                       onClick={() => handleAdvancedTypeClick(t)}
//                     >
//                       {t}
//                     </button>
//                   ))}
//                 </div>
//               </div>

//               {/* FIT row */}
//               <div className="mb-3 space-y-1.5">
//                 <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-gray-400">
//                   Fit
//                 </p>
//                 <div className="flex flex-wrap gap-1.5">
//                   <button
//                     className={`px-2.5 py-1 rounded-full border text-[11px] ${
//                       activeFit == null
//                         ? 'bg-white text-black border-white'
//                         : 'border-gray-500 text-gray-100 hover:border-white'
//                     }`}
//                     onClick={() => handleAdvancedFitClick(null)}
//                   >
//                     All fits
//                   </button>
//                   {availableFits.map((f) => (
//                     <button
//                       key={f}
//                       className={`px-2.5 py-1 rounded-full border text-[11px] ${
//                         activeFit === f
//                           ? 'bg-white text-black border-white'
//                           : 'border-gray-500 text-gray-100 hover:border-white'
//                       }`}
//                       onClick={() => handleAdvancedFitClick(f)}
//                     >
//                       {f}
//                     </button>
//                   ))}
//                 </div>
//               </div>

//               {/* MATERIAL row */}
//               <div className="space-y-1.5">
//                 <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-gray-400">
//                   Material
//                 </p>
//                 <div className="flex flex-wrap gap-1.5">
//                   <button
//                     className={`px-2.5 py-1 rounded-full border text-[11px] ${
//                       activeMaterial == null
//                         ? 'bg-white text-black border-white'
//                         : 'border-gray-500 text-gray-100 hover:border-white'
//                     }`}
//                     onClick={() => handleAdvancedMaterialClick(null)}
//                   >
//                     All materials
//                   </button>
//                   {availableMaterials.map((m) => (
//                     <button
//                       key={m}
//                       className={`px-2.5 py-1 rounded-full border text-[11px] ${
//                         activeMaterial === m
//                           ? 'bg-white text-black border-white'
//                           : 'border-gray-500 text-gray-100 hover:border-white'
//                       }`}
//                       onClick={() => handleAdvancedMaterialClick(m)}
//                     >
//                       {m}
//                     </button>
//                   ))}
//                 </div>
//               </div>
//             </motion.div>
//           )}
//         </AnimatePresence>

//         {/* Carousel itself (3D deck) */}
//         {/* <div className="h-full w-full flex items-center bg-[#D2DCB6] justify-center"> */}
//         <div
//   className="
//     w-full
//     rounded-none
//     flex-1
//     relative
//     overflow-x-hidden
//     overflow-y-visible
//     bg-[radial-gradient(circle_at_center,_#A1BC98_0,_#D2DCB6_42%,_#F1F3E0_120%)]
//   "
// >
//           <CarouselStage
//             cards={filteredCards}
//             sectionKey={`carousel-${index}-${tierKey}-${activeType ?? 'ALL'}-${
//               activeFit ?? 'ALL'
//             }-${activeMaterial ?? 'ALL'}`}
//             tierLabel={tierLabel}
//             filtersForTier={filtersForTier}
//             availableTypes={availableTypes}
//             availableFits={availableFits}
//             availableMaterials={availableMaterials}
//             onTypeChange={handleAdvancedTypeClick}
//             onFitChange={handleAdvancedFitClick}
//             onMaterialChange={handleAdvancedMaterialClick}
//             isFilterOpen={isFilterOpen}
//           />
//         </div>

//         {/* Per-tier toggle buttons at bottom of yellow area */}
//         <div className="absolute inset-x-0 bottom-4 flex justify-center gap-3">
//           <button
//             type="button"
//             onClick={() => setIsFilterOpen((prev) => !prev)}
//             className="rounded-full border border-slate-800 bg-slate-900/80 px-4 py-1.5 text-xs font-semibold text-slate-100 shadow-sm"
//           >
//             {isFilterOpen ? 'Hide filters' : 'Show filters'}
//           </button>
//           <button
//             type="button"
//             onClick={() => setIsAdvancedOpen((prev) => !prev)}
//             className="rounded-full border border-slate-800 bg-slate-900/80 px-4 py-1.5 text-xs font-semibold text-slate-100 shadow-sm"
//           >
//             {isAdvancedOpen ? 'Close advanced' : 'Open advanced'}
//           </button>
//         </div>
//       </div>
//     </section>
//   )
// }
