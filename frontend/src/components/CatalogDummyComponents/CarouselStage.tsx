// 'use client'

// import { motion, AnimatePresence } from 'framer-motion'

// import CatalogCarousel from '@/components/Catalog/CatalogCarousel'
// import CatalogFilterPanel from '@/components/Catalog/CatalogFilterPanel'
// import type { CatalogCard } from '@/types/product'
// import type { TierFilterState } from '@/types/filters'
// import { CSSProperties } from 'react'

// interface CarouselStageProps {
//   cards: CatalogCard[]
//   sectionKey: string
//   tierLabel: string

//   filtersForTier: TierFilterState
//   availableTypes: string[]
//   availableFits: string[]
//   availableMaterials: string[]
//   onTypeChange: (value: string | null) => void
//   onFitChange: (value: string | null) => void
//   onMaterialChange: (value: string | null) => void

//   // From CatalogTierSection
//   isFilterOpen: boolean
// }

// export default function CarouselStage({
//   cards,
//   sectionKey,
//   tierLabel,
//   filtersForTier,
//   availableTypes,
//   availableFits,
//   availableMaterials,
//   onTypeChange,
//   onFitChange,
//   onMaterialChange,
//   isFilterOpen,
// }: CarouselStageProps) {

//    const cardLayoutVars = {
//   // Card width scales with viewport, but stays within a nice range
//   '--card-width': 'clamp(220px, 40vw, 380px)',
//   // Height keeps a fixed aspect ratio to width
//   '--card-height': 'calc(var(--card-width) * 1.25)',
// }



  
//   return (
//     <div
//     className="
//       relative
//       w-full
//       h-auto
//       flex items-center justify-center
//       overflow-x-visible  /* Stage itself can be bigger; yellow clips it */
//       overflow-y-visible
//     "
//     style={{
//       ...(cardLayoutVars as CSSProperties),
//       // Give the carousel some breathing space around the card
//       height: 'calc(var(--card-height, 420px) * 1.4)',
//     }}
//   >
//       {/* BACK LAYER: 3D carousel "machine" */}
//       <div className="absolute inset-0 z-0 flex items-center justify-center">
//         <CatalogCarousel cards={cards} sectionKey={sectionKey} />
//       </div>

//       {/* FRONT LAYER: Filtering AI panel (overlay) */}
//       <AnimatePresence>
//         {isFilterOpen && (
//           <motion.div
//             key="filtering-ai-panel"
//             className="
//               absolute left-0 top-1/2 -translate-y-1/2
//               z-10
//               w-[70%] xs:w-[60%] sm:w-[45%] md:w-[35%] lg:w-[30%]
//               max-w-md h-[72%]
//               px-1
//             "
//             initial={{ opacity: 0, x: -40 }}
//             animate={{ opacity: 1, x: 0 }}
//             exit={{ opacity: 0, x: -40 }}
//             transition={{ duration: 0.28, ease: 'easeOut' }}
//           >
//             <CatalogFilterPanel
//               tierLabel={tierLabel}
//               filtersForTier={filtersForTier}
//               availableTypes={availableTypes}
//               availableFits={availableFits}
//               availableMaterials={availableMaterials}
//               onTypeChange={onTypeChange}
//               onFitChange={onFitChange}
//               onMaterialChange={onMaterialChange}
//             />
//           </motion.div>
//         )}
//       </AnimatePresence>
//     </div>
//   )
// }





// src/components/Catalog/CarouselStage.tsx
'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { CSSProperties, useState } from 'react'

import CatalogCarousel from '@/components/Catalog/CatalogCarousel'
import CatalogFilterPanel from '@/components/Catalog/CatalogFilterPanel'
import CatalogSkeleton from '@/components/Catalog/CatalogSkeleton'
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

  // From CatalogTierSection
  isFilterOpen: boolean
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
  isFilterOpen,
}: CarouselStageProps) {
  // 🔹 controls when we show the skeleton vs the real carousel
  const [isCarouselReady, setIsCarouselReady] = useState(false)

  const cardLayoutVars = {
    // Card width scales with viewport, but stays within a nice range
    '--card-width': 'clamp(220px, 40vw, 380px)',
    // Height keeps a fixed aspect ratio to width
    '--card-height': 'calc(var(--card-width) * 1.25)',
  }

  return (
    <div
      className="
        relative
        w-full
        h-auto
        flex items-center justify-center
        overflow-x-visible
        overflow-y-visible
      "
      style={{
        ...(cardLayoutVars as CSSProperties),
        // Give the carousel some breathing space around the card
        height: 'calc(var(--card-height, 420px) * 1.4)',
      }}
    >
      {/* 🔸 SKELETON: shown while the carousel is not yet ready */}
      {!isCarouselReady && (
        <div className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none">
          <CatalogSkeleton />
        </div>
      )}

      {/* BACK LAYER: 3D carousel "machine" */}
      <div
        className={`
          absolute inset-0 z-0 flex items-center justify-center
          transition-opacity duration-300
          ${isCarouselReady ? 'opacity-100' : 'opacity-0'}
        `}
      >
        <CatalogCarousel
          cards={cards}
          sectionKey={sectionKey}
          // 👇 CatalogCarousel should call this once it's ready
          onReady={() => setIsCarouselReady(true)}
        />
      </div>

      {/* FRONT LAYER: Filtering AI panel (overlay) */}
      <AnimatePresence>
        {isFilterOpen && (
          <motion.div
            key="filtering-ai-panel"
            className="
              absolute left-0 top-1/2 -translate-y-1/2
              z-10
              w-[70%] xs:w-[60%] sm:w-[45%] md:w-[35%] lg:w-[30%]
              max-w-md h-[72%]
              px-1
            "
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
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
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
