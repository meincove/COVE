
// 'use client'

// import { CSSProperties, useEffect, useRef, useState } from 'react'
// import { motion, AnimatePresence, PanInfo } from 'framer-motion'
// import { useRouter } from 'next/navigation'
// import { useInView } from 'react-intersection-observer'
// import { ChevronLeft, ChevronRight } from 'lucide-react'

// import CatalogCard from './CatalogCard'
// import { useModal } from '@/src/context/ModalContext'
// import type { CatalogCardDTO } from '@/types/catalog'
// import CatalogDetailPanel from './CatalogDetailPanel'

// interface CatalogCarouselProps {
//   cards: CatalogCardDTO[]
//   sectionKey: string
//   onReady?: () => void
// }

// type CardRole =
//   | 'center'
//   | 'left1'
//   | 'right1'
//   | 'left2'
//   | 'right2'
//   | 'left3'
//   | 'right3'
//   | 'hidden'

// function getCardRole(relativeOffset: number): CardRole {
//   switch (relativeOffset) {
//     case 0:
//       return 'center'
//     case -1:
//       return 'left1'
//     case 1:
//       return 'right1'
//     case -2:
//       return 'left2'
//     case 2:
//       return 'right2'
//     case -3:
//       return 'left3'
//     case 3:
//       return 'right3'
//     default:
//       return 'hidden'
//   }
// }

// // still using fixed offsets for now – we’ll refactor to card-width–based
// // math in the next step.
// function getCardLayout(role: CardRole) {
//   switch (role) {
//     case 'center':
//       return { x: 0, scale: 1.15, opacity: 1, blur: 0, zIndex: 100 }
//     case 'left1':
//       return { x: -420, scale: 0.9, opacity: 1, blur: 1.6, zIndex: 80 }
//     case 'right1':
//       return { x: 420, scale: 0.9, opacity: 1, blur: 1.6, zIndex: 80 }
//     case 'left2':
//       return { x: -760, scale: 0.75, opacity: 0.7, blur: 3.0, zIndex: 60 }
//     case 'right2':
//       return { x: 760, scale: 0.75, opacity: 0.7, blur: 3.0, zIndex: 60 }
//     case 'left3':
//       return { x: -1040, scale: 0.6, opacity: 0.45, blur: 4.2, zIndex: 40 }
//     case 'right3':
//       return { x: 1040, scale: 0.6, opacity: 0.45, blur: 4.2, zIndex: 40 }
//     case 'hidden':
//     default:
//       return { x: 0, scale: 0.5, opacity: 0, blur: 6, zIndex: 0 }
//   }
// }

// // --- helper: mimic clamp(280px, 16.5vw, 620px) in JS ---
// function computeCardWidth(viewportWidth: number): number {
//   const min = 280
//   const max = 620
//   const preferred = 0.165 * viewportWidth // 16.5vw

//   return Math.min(max, Math.max(min, preferred))
// }

// export default function CatalogCarousel({
//   cards,
//   sectionKey,
//   onReady,
// }: CatalogCarouselProps) {
//   // tell parent we’re ready to replace skeleton
//   useEffect(() => {
//     if (onReady) onReady()
//   }, [onReady])

//   const [currentIndex, setCurrentIndex] = useState(0)
//   const [expandedCardId, setExpandedCardId] = useState<string | null>(null)

//   const containerRef = useRef<HTMLDivElement>(null)
//   const dragTriggeredRef = useRef(false)

//   const { isModalOpen } = useModal()
//   const router = useRouter()

//   // ---- card width / height, driven by viewport ----
//   const [cardWidth, setCardWidth] = useState<number>(() => {
//     if (typeof window === 'undefined') return 320
//     return computeCardWidth(window.innerWidth)
//   })

//   useEffect(() => {
//     const handleResize = () => {
//       setCardWidth(computeCardWidth(window.innerWidth))
//     }

//     handleResize()
//     window.addEventListener('resize', handleResize)
//     return () => window.removeEventListener('resize', handleResize)
//   }, [])

//   const cardSizingVars: CSSProperties = {
//     '--card-width': `${cardWidth}px`,
//     '--card-height': `${cardWidth * 1.35}px`,
//   } as CSSProperties

//   // drag threshold depends on card width (feels similar on all screens)
//   const dragThreshold = cardWidth * 0.22 // ~60–80px depending on width
//   const dragLimit = cardWidth * 0.35 // max distance card can be dragged

//   // variant choice per card
//   const [variantMap, setVariantMap] = useState<Record<string, string>>(() => {
//     const initialMap: Record<string, string> = {}
//     cards.forEach((card) => {
//       const firstVariantId = card.colors[0]?.variantId
//       if (firstVariantId) {
//         initialMap[card.id] = firstVariantId
//       }
//     })
//     return initialMap
//   })

//   // size + quantity per variant
//   const [sizeMap, setSizeMap] = useState<Record<string, string | null>>({})
//   const [qtyMap, setQtyMap] = useState<Record<string, number>>({})

//   const handleVariantChange = (cardId: string, variantId: string) => {
//     setVariantMap((prev) => ({ ...prev, [cardId]: variantId }))
//     setSizeMap((prev) => ({ ...prev, [variantId]: null }))
//     setQtyMap((prev) => ({ ...prev, [variantId]: 0 }))
//   }

//   const handleSizeChange = (variantId: string, size: string) => {
//     setSizeMap((prev) => ({ ...prev, [variantId]: size }))

//     // OPTIONAL: if you want suggestions to update instantly you could
//     // also reset qty here, etc.
//   }

//   const handleQuantityChange = (variantId: string, qty: number) => {
//     setQtyMap((prev) => ({ ...prev, [variantId]: Math.max(0, qty) }))
//   }

//   const handleNext = () =>
//     setCurrentIndex((prev) => (prev + 1) % cards.length)
//   const handlePrev = () =>
//     setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length)

//   // drag handlers for CENTER CARD
//   const handleCardDragStart = () => {
//     dragTriggeredRef.current = false
//   }

//   const handleCardDrag = (_: any, info: PanInfo) => {
//     if (dragTriggeredRef.current) return

//     if (info.offset.x <= -dragThreshold) {
//       dragTriggeredRef.current = true
//       handleNext()
//     } else if (info.offset.x >= dragThreshold) {
//       dragTriggeredRef.current = true
//       handlePrev()
//     }
//   }

//   const handleCardDragEnd = () => {
//     // reset for next drag
//     dragTriggeredRef.current = false
//   }

//   const { ref: inViewRef, inView } = useInView({
//     threshold: 0.4,
//     triggerOnce: false,
//   })

//   const hasExpanded = Boolean(expandedCardId)
//   const carouselInteractive = !isModalOpen && !hasExpanded

//   const expandedCard = hasExpanded
//     ? cards.find((c) => c.id === expandedCardId)
//     : null

//   const expandedVariantId = expandedCard
//     ? variantMap[expandedCard.id]
//     : undefined

//   const expandedSize =
//     expandedVariantId ? sizeMap[expandedVariantId] ?? null : null

//   const expandedQty =
//     expandedVariantId && qtyMap[expandedVariantId] !== undefined
//       ? qtyMap[expandedVariantId]
//       : 0

//   const handleGoToStore = () => {
//     if (!expandedCard) return
//     const slug = (expandedCard as any).slug ?? expandedCard.id

//     const params = new URLSearchParams()
//     if (expandedVariantId) params.set('variantId', expandedVariantId)
//     if (expandedSize) params.set('size', expandedSize)
//     if (expandedQty > 0) params.set('qty', String(expandedQty))

//     const query = params.toString()
//     const href = query ? `/product/${slug}?${query}` : `/product/${slug}`

//     router.push(href)
//   }

//   return (
//     <div
//       className="relative w-full h-full flex flex-col items-center justify-center z-0"
//       ref={inViewRef}
//       style={cardSizingVars}
//     >
//       {/* Soft blurred band when a card is expanded */}
//       {hasExpanded && (
//         <div
//           className="
//             pointer-events-none
//             absolute
//             left-1/2 -translate-x-1/2
//             top-1/2 -translate-y-1/2
//             rounded-[40px]
//             bg-slate-900/14
//             backdrop-blur-md
//           "
//           style={{
//             width: 'min(90vw, 950px)',
//             height: 'var(--card-height)' as string,
//           }}
//         />
//       )}

//       {/* ARROWS */}
//       {carouselInteractive && (
//         <>
//           <div className="absolute top-1/2 left-4 z-10 -translate-y-1/2">
//             <button
//               type="button"
//               onClick={handlePrev}
//               className="
//                 rounded-full
//                 bg-slate-900/65
//                 hover:bg-slate-900
//                 text-slate-50
//                 p-2
//                 shadow-lg
//                 backdrop-blur-sm
//                 border border-white/10
//                 transition
//               "
//             >
//               <ChevronLeft className="w-4 h-4" />
//             </button>
//           </div>
//           <div className="absolute top-1/2 right-4 z-10 -translate-y-1/2">
//             <button
//               type="button"
//               onClick={handleNext}
//               className="
//                 rounded-full
//                 bg-slate-900/65
//                 hover:bg-slate-900
//                 text-slate-50
//                 p-2
//                 shadow-lg
//                 backdrop-blur-sm
//                 border border-white/10
//                 transition
//               "
//             >
//               <ChevronRight className="w-4 h-4" />
//             </button>
//           </div>
//         </>
//       )}

//       {/* CAROUSEL CONTAINER – no drag here now */}
//       <motion.div
//         className="relative w-full h-full flex items-center justify-center"
//         ref={containerRef}
//         style={{
//           pointerEvents: 'auto',
//           perspective: 1400,
//           willChange: 'transform',
//         }}
//       >
//         {cards.map((card, i) => {
//           const offset = i - currentIndex
//           const half = Math.floor(cards.length / 2)
//           let relativeOffset = offset
//           if (offset > half) relativeOffset -= cards.length
//           if (offset < -half) relativeOffset += cards.length

//           if (Math.abs(relativeOffset) > 3) return null

//           const role = getCardRole(relativeOffset)
//           let layout = getCardLayout(role)
//           const isCenter = role === 'center'
//           const isExpanded = hasExpanded && expandedCardId === card.id

//           const selectedVariantId = variantMap[card.id]

//           if (isExpanded) {
//             layout = {
//               ...layout,
//               x: layout.x - 320, // will refactor later to use cardWidth
//               opacity: 1,
//               blur: 0,
//               zIndex: 120,
//             }
//           } else if (hasExpanded) {
//             layout = {
//               ...layout,
//               opacity: layout.opacity * 0.35,
//               blur: layout.blur + 1.5,
//             }
//           }

//           const mode = isExpanded ? 'hero' : 'normal'
//           const shouldShow = hasExpanded || inView

//           return (
//             <AnimatePresence key={`${sectionKey}-${i}`}>
//               <motion.div
//                 className="absolute"
//                 initial={{
//                   opacity: 0,
//                   scale: 0.7,
//                   x: 0,
//                   y: 20,
//                   filter: 'blur(10px)',
//                 }}
//                 animate={{
//                   opacity: shouldShow ? layout.opacity : 0,
//                   scale: shouldShow ? layout.scale : 0.7,
//                   x: shouldShow ? layout.x : 0,
//                   y: 0,
//                   filter: shouldShow
//                     ? `blur(${layout.blur}px)`
//                     : 'blur(10px)',
//                   zIndex: layout.zIndex,
//                 }}
//                 exit={{
//                   opacity: 0,
//                   scale: 0.7,
//                   x: 0,
//                   filter: 'blur(10px)',
//                 }}
//                 transition={{
//                   duration: 0.8,
//                   ease: [0.16, 1, 0.3, 1],
//                 }}
//                 // 🔹 Drag only on the center card
//                 drag={
//                   carouselInteractive && isCenter
//                     ? 'x'
//                     : false
//                 }
//                 dragConstraints={{
//                   left: -dragLimit,
//                   right: dragLimit,
//                 }}
//                 dragElastic={0.22}
//                 onDragStart={isCenter ? handleCardDragStart : undefined}
//                 onDrag={isCenter ? handleCardDrag : undefined}
//                 onDragEnd={isCenter ? handleCardDragEnd : undefined}
//               >
//                 <CatalogCard
//                   {...card}
//                   layoutKey={`${sectionKey}-${i}`}
//                   isActive={isCenter}
//                   selectedVariantId={selectedVariantId}
//                   mode={mode}
//                   onToggleExpand={
//                     isCenter
//                       ? () =>
//                           setExpandedCardId((prev) =>
//                             prev === card.id ? null : card.id
//                           )
//                       : undefined
//                   }
//                   onVariantChange={(variantId) =>
//                     handleVariantChange(card.id, variantId)
//                   }
//                 />
//               </motion.div>
//             </AnimatePresence>
//           )
//         })}
//       </motion.div>

//       {/* DETAIL PANEL (only when expanded) */}
//       {hasExpanded && expandedCard && expandedVariantId && (
//         <CatalogDetailPanel
//           card={expandedCard}
//           selectedVariantId={expandedVariantId}
//           selectedSize={expandedSize}
//           quantity={expandedQty}
//           onVariantChange={(variantId) =>
//             handleVariantChange(expandedCard.id, variantId)
//           }
//           onSizeChange={(size) =>
//             handleSizeChange(expandedVariantId, size)
//           }
//           onQuantityChange={(qty) =>
//             handleQuantityChange(expandedVariantId, qty)
//           }
//           onGoToStore={handleGoToStore}
//           onClose={() => setExpandedCardId(null)}
//         />
//       )}
//     </div>
//   )
// }


// src/components/Catalog/CatalogCarousel.tsx
'use client'

import { CSSProperties, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence, PanInfo } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useInView } from 'react-intersection-observer'
import { ChevronLeft, ChevronRight } from 'lucide-react'

import CatalogCard from './CatalogCard'
import { useModal } from '@/src/context/ModalContext'
import type { CatalogCardDTO } from '@/types/catalog'
import CatalogDetailPanel from './CatalogDetailPanel'

interface CatalogCarouselProps {
  cards: CatalogCardDTO[]
  sectionKey: string
  onReady?: () => void
}

type CardRole =
  | 'center'
  | 'left1'
  | 'right1'
  | 'left2'
  | 'right2'
  | 'left3'
  | 'right3'
  | 'hidden'

function getCardRole(relativeOffset: number): CardRole {
  switch (relativeOffset) {
    case 0:
      return 'center'
    case -1:
      return 'left1'
    case 1:
      return 'right1'
    case -2:
      return 'left2'
    case 2:
      return 'right2'
    case -3:
      return 'left3'
    case 3:
      return 'right3'
    default:
      return 'hidden'
  }
}

// still using fixed offsets for now – we’ll refactor later
function getCardLayout(role: CardRole) {
  switch (role) {
    case 'center':
      return { x: 0, scale: 1.15, opacity: 1, blur: 0, zIndex: 100 }
    case 'left1':
      return { x: -420, scale: 0.9, opacity: 1, blur: 1.6, zIndex: 80 }
    case 'right1':
      return { x: 420, scale: 0.9, opacity: 1, blur: 1.6, zIndex: 80 }
    case 'left2':
      return { x: -760, scale: 0.75, opacity: 0.7, blur: 3.0, zIndex: 60 }
    case 'right2':
      return { x: 760, scale: 0.75, opacity: 0.7, blur: 3.0, zIndex: 60 }
    case 'left3':
      return { x: -1040, scale: 0.6, opacity: 0.45, blur: 4.2, zIndex: 40 }
    case 'right3':
      return { x: 1040, scale: 0.6, opacity: 0.45, blur: 4.2, zIndex: 40 }
    case 'hidden':
    default:
      return { x: 0, scale: 0.5, opacity: 0, blur: 6, zIndex: 0 }
  }
}

// --- helper: mimic clamp(280px, 16.5vw, 620px) in JS ---
function computeCardWidth(viewportWidth: number): number {
  const min = 280
  const max = 620
  const preferred = 0.165 * viewportWidth // 16.5vw

  return Math.min(max, Math.max(min, preferred))
}

export default function CatalogCarousel({
  cards,
  sectionKey,
  onReady,
}: CatalogCarouselProps) {
  // tell parent we’re ready to replace skeleton
  useEffect(() => {
    if (onReady) onReady()
  }, [onReady])

  const [currentIndex, setCurrentIndex] = useState(0)
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const dragTriggeredRef = useRef(false)

  const { isModalOpen } = useModal()
  const router = useRouter()

  // ---- card width / height, driven by viewport ----
  const [cardWidth, setCardWidth] = useState<number>(() => {
    if (typeof window === 'undefined') return 320
    return computeCardWidth(window.innerWidth)
  })

  useEffect(() => {
    const handleResize = () => {
      setCardWidth(computeCardWidth(window.innerWidth))
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const cardSizingVars: CSSProperties = {
    '--card-width': `${cardWidth}px`,
    '--card-height': `${cardWidth * 1.35}px`,
  } as CSSProperties

  // drag threshold depends on card width (feels similar on all screens)
  const dragThreshold = cardWidth * 0.22 // ~60–80px depending on width
  const dragLimit = cardWidth * 0.35 // max distance card can be dragged

  // variant choice per card
  const [variantMap, setVariantMap] = useState<Record<string, string>>(() => {
    const initialMap: Record<string, string> = {}
    cards.forEach((card) => {
      const firstVariantId = card.colors[0]?.variantId
      if (firstVariantId) {
        initialMap[card.id] = firstVariantId
      }
    })
    return initialMap
  })

  // size + quantity per variant
  const [sizeMap, setSizeMap] = useState<Record<string, string | null>>({})
  const [qtyMap, setQtyMap] = useState<Record<string, number>>({})

  const handleVariantChange = (cardId: string, variantId: string) => {
    setVariantMap((prev) => ({ ...prev, [cardId]: variantId }))
    setSizeMap((prev) => ({ ...prev, [variantId]: null }))
    setQtyMap((prev) => ({ ...prev, [variantId]: 0 }))
  }

  const handleSizeChange = (variantId: string, size: string) => {
    setSizeMap((prev) => ({ ...prev, [variantId]: size }))
  }

  const handleQuantityChange = (variantId: string, qty: number) => {
    setQtyMap((prev) => ({ ...prev, [variantId]: Math.max(0, qty) }))
  }

  const handleNext = () =>
    setCurrentIndex((prev) => (prev + 1) % cards.length)
  const handlePrev = () =>
    setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length)

  // drag handlers for CENTER CARD
  const handleCardDragStart = () => {
    dragTriggeredRef.current = false
  }

  const handleCardDrag = (_: any, info: PanInfo) => {
    if (dragTriggeredRef.current) return

    if (info.offset.x <= -dragThreshold) {
      dragTriggeredRef.current = true
      handleNext()
    } else if (info.offset.x >= dragThreshold) {
      dragTriggeredRef.current = true
      handlePrev()
    }
  }

  const handleCardDragEnd = () => {
    // nothing else – dragSnapToOrigin will handle the snapping
    dragTriggeredRef.current = false
  }

  const { ref: inViewRef, inView } = useInView({
    threshold: 0.4,
    triggerOnce: false,
  })

  const hasExpanded = Boolean(expandedCardId)
  const carouselInteractive = !isModalOpen && !hasExpanded

  const expandedCard = hasExpanded
    ? cards.find((c) => c.id === expandedCardId)
    : null

  const expandedVariantId = expandedCard
    ? variantMap[expandedCard.id]
    : undefined

  const expandedSize =
    expandedVariantId ? sizeMap[expandedVariantId] ?? null : null

  const expandedQty =
    expandedVariantId && qtyMap[expandedVariantId] !== undefined
      ? qtyMap[expandedVariantId]
      : 0

  const handleGoToStore = () => {
    if (!expandedCard) return
    const slug = (expandedCard as any).slug ?? expandedCard.id

    const params = new URLSearchParams()
    if (expandedVariantId) params.set('variantId', expandedVariantId)
    if (expandedSize) params.set('size', expandedSize)
    if (expandedQty > 0) params.set('qty', String(expandedQty))

    const query = params.toString()
    const href = query ? `/product/${slug}?${query}` : `/product/${slug}`

    router.push(href)
  }

  return (
    <div
      className="relative w-full h-full flex flex-col items-center justify-center z-0"
      ref={inViewRef}
      style={cardSizingVars}
    >
      {/* Soft blurred band when a card is expanded */}
      {hasExpanded && (
        <div
          className="
            pointer-events-none
            absolute
            left-1/2 -translate-x-1/2
            top-1/2 -translate-y-1/2
            rounded-[40px]
            bg-slate-900/14
            backdrop-blur-md
          "
          style={{
            width: 'min(90vw, 950px)',
            height: 'var(--card-height)' as string,
          }}
        />
      )}

      {/* ARROWS */}
      {carouselInteractive && (
        <>
          <div className="absolute top-1/2 left-4 z-10 -translate-y-1/2">
            <button
              type="button"
              onClick={handlePrev}
              className="
                rounded-full
                bg-slate-900/65
                hover:bg-slate-900
                text-slate-50
                p-2
                shadow-lg
                backdrop-blur-sm
                border border-white/10
                transition
              "
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
          <div className="absolute top-1/2 right-4 z-10 -translate-y-1/2">
            <button
              type="button"
              onClick={handleNext}
              className="
                rounded-full
                bg-slate-900/65
                hover:bg-slate-900
                text-slate-50
                p-2
                shadow-lg
                backdrop-blur-sm
                border border-white/10
                transition
              "
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </>
      )}

      {/* CAROUSEL CONTAINER – no drag here now */}
      <motion.div
        className="relative w-full h-full flex items-center justify-center"
        ref={containerRef}
        style={{
          pointerEvents: 'auto',
          perspective: 1400,
          willChange: 'transform',
        }}
      >
        {cards.map((card, i) => {
          const offset = i - currentIndex
          const half = Math.floor(cards.length / 2)
          let relativeOffset = offset
          if (offset > half) relativeOffset -= cards.length
          if (offset < -half) relativeOffset += cards.length

          if (Math.abs(relativeOffset) > 3) return null

          const role = getCardRole(relativeOffset)
          let layout = getCardLayout(role)
          const isCenter = role === 'center'
          const isExpanded = hasExpanded && expandedCardId === card.id

          const selectedVariantId = variantMap[card.id]

          if (isExpanded) {
            layout = {
              ...layout,
              x: layout.x - 320, // will refactor later to use cardWidth
              opacity: 1,
              blur: 0,
              zIndex: 120,
            }
          } else if (hasExpanded) {
            layout = {
              ...layout,
              opacity: layout.opacity * 0.35,
              blur: layout.blur + 1.5,
            }
          }

          const mode = isExpanded ? 'hero' : 'normal'
          const shouldShow = hasExpanded || inView

          return (
            <AnimatePresence key={`${sectionKey}-${i}`}>
              <motion.div
                className="absolute"
                initial={{
                  opacity: 0,
                  scale: 0.7,
                  x: 0,
                  y: 20,
                  filter: 'blur(10px)',
                }}
                animate={{
                  opacity: shouldShow ? layout.opacity : 0,
                  scale: shouldShow ? layout.scale : 0.7,
                  x: shouldShow ? layout.x : 0,
                  y: 0,
                  filter: shouldShow
                    ? `blur(${layout.blur}px)`
                    : 'blur(10px)',
                  zIndex: layout.zIndex,
                }}
                exit={{
                  opacity: 0,
                  scale: 0.7,
                  x: 0,
                  filter: 'blur(10px)',
                }}
                transition={{
                  duration: 0.8,
                  ease: [0.16, 1, 0.3, 1],
                }}
                // 🔹 Drag only on the center card
                drag={
                  carouselInteractive && isCenter
                    ? 'x'
                    : false
                }
                dragConstraints={{
                  left: -dragLimit,
                  right: dragLimit,
                }}
                dragElastic={0.22}
                dragSnapToOrigin={isCenter}   
                onDragStart={isCenter ? handleCardDragStart : undefined}
                onDrag={isCenter ? handleCardDrag : undefined}
                onDragEnd={isCenter ? handleCardDragEnd : undefined}
              >
                <CatalogCard
                  {...card}
                  layoutKey={`${sectionKey}-${i}`}
                  isActive={isCenter}
                  selectedVariantId={selectedVariantId}
                  mode={mode}
                  onToggleExpand={
                    isCenter
                      ? () =>
                          setExpandedCardId((prev) =>
                            prev === card.id ? null : card.id
                          )
                      : undefined
                  }
                  onVariantChange={(variantId) =>
                    handleVariantChange(card.id, variantId)
                  }
                />
              </motion.div>
            </AnimatePresence>
          )
        })}
      </motion.div>

      {/* DETAIL PANEL (only when expanded) */}
      {hasExpanded && expandedCard && expandedVariantId && (
        <CatalogDetailPanel
          card={expandedCard}
          selectedVariantId={expandedVariantId}
          selectedSize={expandedSize}
          quantity={expandedQty}
          onVariantChange={(variantId) =>
            handleVariantChange(expandedCard.id, variantId)
          }
          onSizeChange={(size) =>
            handleSizeChange(expandedVariantId, size)
          }
          onQuantityChange={(qty) =>
            handleQuantityChange(expandedVariantId, qty)
          }
          onGoToStore={handleGoToStore}
          onClose={() => setExpandedCardId(null)}
        />
      )}
    </div>
  )
}
