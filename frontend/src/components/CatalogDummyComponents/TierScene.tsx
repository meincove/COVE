// 'use client'

// import { AnimatePresence, motion } from 'framer-motion'
// import type { CatalogCard } from '@/types/product'
// import type { TierFilterState, TierKey } from '@/types/filters'
// import CatalogTierSection, {
//   DUMMY_TIER_THEME,
//   DEFAULT_TIER_THEME,
// } from './CatalogTierSection'

// type Direction = 1 | -1

// interface TierSceneProps {
//   tierKey: TierKey
//   index: number
//   title: string
//   description: string
//   cards: CatalogCard[]
//   filtersForTier: TierFilterState
//   updateFilters: (updater: (prev: TierFilterState) => TierFilterState) => void
//   direction: Direction // kept for future text/card direction logic
// }

// /**
//  * Radial background – no scale, only opacity.
//  * This avoids ever revealing the root black background.
//  */
// const radialVariants = {
//   initial: {
//     opacity: 0,
//   },
//   animate: {
//     opacity: 1,
//   },
//   exit: {
//     opacity: 0,
//   },
// }

// const radialTransition = {
//   duration: 0.9, // in the 800–1200ms window you mentioned
//   ease: [0.22, 0.61, 0.36, 1],
// }

// export default function TierScene({
//   tierKey,
//   index,
//   title,
//   description,
//   cards,
//   filtersForTier,
//   updateFilters,
//   direction, // not used yet
// }: TierSceneProps) {
//   const theme = DUMMY_TIER_THEME[tierKey as string] ?? DEFAULT_TIER_THEME
//   const { mainBg, edgeBg } = theme

//   return (
//     <div className="relative w-full min-h-screen overflow-hidden bg-black">
//       {/* Radial background layer – fully opaque, no gaps */}
//       <AnimatePresence mode="sync">
//         <motion.div
//           key={tierKey}
//           variants={radialVariants}
//           initial="initial"
//           animate="animate"
//           exit="exit"
//           transition={radialTransition}
//           className="pointer-events-none absolute inset-0"
//           style={{
//             // center = mainBg, edges = softer edgeBg (no harsh black)
//             background: `radial-gradient(circle at center, ${mainBg} 0%, ${mainBg} 45%, ${edgeBg} 100%)`,
//           }}
//         />
//       </AnimatePresence>

//       {/* Foreground content – text + carousel */}
//       <div className="relative z-10">
//         <CatalogTierSection
//           tierKey={tierKey}
//           index={index}
//           title={title}
//           description={description}
//           cards={cards}
//           filtersForTier={filtersForTier}
//           updateFilters={updateFilters}
//           onInView={() => {}}
//           sectionRef={() => {}}
//           hideFilters
//         />
//       </div>
//     </div>
//   )
// }



'use client'

import type { CSSProperties } from 'react'
import { motion } from 'framer-motion'
import type { CatalogCard } from '@/types/product'
import type { TierFilterState, TierKey } from '@/types/filters'
import CatalogTierSection from './CatalogTierSection'

type Direction = 1 | -1

interface TierSceneProps {
  tierKey: TierKey
  index: number
  title: string
  description: string
  cards: CatalogCard[]
  filtersForTier: TierFilterState
  updateFilters: (updater: (prev: TierFilterState) => TierFilterState) => void
  direction: Direction // we’ll use later for text/card direction
}

// Simple RGB tuple
type RGB = [number, number, number]

interface BgColors {
  main: RGB
  edge: RGB
}

// 🎨 Per-tier background colors in RGB
const BG_COLORS: Record<string, BgColors> = {
  casual: {
    main: [67, 0, 120],   // #430078
    edge: [47, 0, 85],    // #2f0055
  },
  originals: {
    main: [194, 50, 23],  // #c23217
    edge: [127, 34, 16],  // #7f2210
  },
  designer: {
    main: [59, 122, 102], // #3b7a66
    edge: [40, 83, 71],   // #285347
  },
  limited: {
    main: [129, 131, 124], // #81837c
    edge: [86, 88, 83],    // #565853
  },
}

const DEFAULT_BG: BgColors = {
  main: [17, 24, 39],  // #111827
  edge: [2, 6, 23],    // #020617
}

// 800–1200ms window, we pick ~0.9s for now
const BG_TRANSITION = {
  duration: 0.9,
  ease: [0.22, 0.61, 0.36, 1],
} as const

export default function TierScene({
  tierKey,
  index,
  title,
  description,
  cards,
  filtersForTier,
  updateFilters,
  direction, // not used yet
}: TierSceneProps) {
  const colors = BG_COLORS[tierKey as string] ?? DEFAULT_BG
  const [mr, mg, mb] = colors.main
  const [er, eg, eb] = colors.edge

  // Background style uses CSS variables for the colors.
  // Framer Motion will smoothly interpolate these numbers,
  // so the gradient morphs without any flash / layer swap.
  const bgStyle: CSSProperties = {
    // tailwind won’t know these vars; that’s fine, they are runtime CSS
    background:
      'radial-gradient(circle at center, ' +
      'rgb(var(--bg-main-r), var(--bg-main-g), var(--bg-main-b)) 0%, ' +
      'rgb(var(--bg-main-r), var(--bg-main-g), var(--bg-main-b)) 45%, ' +
      'rgb(var(--bg-edge-r), var(--bg-edge-g), var(--bg-edge-b)) 100%)',
  }

  return (
    <div className="relative w-full min-h-screen overflow-hidden bg-black">
      {/* Single background canvas – colors morph, canvas never disappears */}
      <motion.div
        className="pointer-events-none absolute inset-0"
        style={bgStyle}
        initial={false} // don’t do a first-time pop
        animate={{
          // numeric CSS variables → smoothly interpolated
          '--bg-main-r': mr,
          '--bg-main-g': mg,
          '--bg-main-b': mb,
          '--bg-edge-r': er,
          '--bg-edge-g': eg,
          '--bg-edge-b': eb,
        } as any}
        transition={BG_TRANSITION}
      />

      {/* Foreground content – sits on top, unaffected by bg morph */}
      <div className="relative z-10">
        <CatalogTierSection
          tierKey={tierKey}
          index={index}
          title={title}
          description={description}
          cards={cards}
          filtersForTier={filtersForTier}
          updateFilters={updateFilters}
          onInView={() => {}}
          sectionRef={() => {}}
          hideFilters
        />
      </div>
    </div>
  )
}
