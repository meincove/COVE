
// 'use client'

// import { useRef, useState } from 'react'
// import { motion, AnimatePresence } from 'framer-motion'
// import CatalogCard from './CatalogCard'
// import { useModal } from '@/src/context/ModalContext'
// import { useInView } from 'react-intersection-observer'

// interface CatalogCarouselProps {
//   cards: any[]
//   sectionKey: string
// }

// export default function CatalogCarousel({ cards, sectionKey }: CatalogCarouselProps) {
//   const [currentIndex, setCurrentIndex] = useState(0)
//   const containerRef = useRef<HTMLDivElement>(null)
//   const { isModalOpen } = useModal()

//   const [variantMap, setVariantMap] = useState<Record<string, string>>(() => {
//     const initialMap: Record<string, string> = {}
//     cards.forEach((card) => {
//       initialMap[card.id] = card.selectedVariantId || card.colors[0]?.variantId
//     })
//     return initialMap
//   })

//   const handleColorChange = (cardId: string, newVariantId: string) => {
//     setVariantMap((prev) => ({
//       ...prev,
//       [cardId]: newVariantId,
//     }))
//   }

//   const handleNext = () => setCurrentIndex((prev) => (prev + 1) % cards.length)
//   const handlePrev = () => setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length)

//   const handleDragEnd = (_: any, info: any) => {
//     if (info.offset.x < -100) handleNext()
//     else if (info.offset.x > 100) handlePrev()
//   }

//   // 👁️ Watch if carousel is in view
//   const { ref: inViewRef, inView } = useInView({
//     threshold: 0.4,
//     triggerOnce: false,
//   })

//   return (
//     <div
//       className="relative w-full h-[500px] flex flex-col items-center justify-center z-0"
//       ref={inViewRef}
//     >
//       {/* ARROWS */}
//       {!isModalOpen && (
//         <>
//           <div className="absolute top-1/2 left-4 z-10 -translate-y-1/2">
//             <button
//               onClick={handlePrev}
//               className="bg-black text-white px-3 py-2 rounded-full shadow-md hover:bg-gray-800 transition"
//             >
//               ⬅️
//             </button>
//           </div>
//           <div className="absolute top-1/2 right-4 z-10 -translate-y-1/2">
//             <button
//               onClick={handleNext}
//               className="bg-black text-white px-3 py-2 rounded-full shadow-md hover:bg-gray-800 transition"
//             >
//               ➡️
//             </button>
//           </div>
//         </>
//       )}

//       {/* CAROUSEL */}
//       <motion.div
//         className="relative w-full h-full flex items-center justify-center"
//         drag={isModalOpen ? false : 'x'}
//         dragConstraints={{ left: 0, right: 0 }}
//         onDragEnd={handleDragEnd}
//         ref={containerRef}
//         style={{ pointerEvents: isModalOpen ? 'none' : 'auto' }}
//       >
//         {cards.map((card, i) => {
//           const offset = i - currentIndex
//           const half = Math.floor(cards.length / 2)
//           let relativeOffset = offset
//           if (offset > half) relativeOffset -= cards.length
//           if (offset < -half) relativeOffset += cards.length

//           if (Math.abs(relativeOffset) > 2) return null

//           const scale = 1.2 - Math.abs(relativeOffset) * 0.05
//           const blur = Math.abs(relativeOffset) * 1.5
//           const translateX = relativeOffset * 160
//           const translateZ = -Math.abs(relativeOffset) * 30
//           const isFront = relativeOffset === 0

//           const selectedVariantId = variantMap[card.id]
//           const selectedColor = card.colors.find(
//             (color: any) => color.variantId === selectedVariantId
//           )
//           const selectedImage = selectedColor?.images?.[0] || card.images[0]

//           const colorSwatches = card.colors.map((color: any) => ({
//             hex: color.hex,
//             isSelected: selectedVariantId === color.variantId,
//             onClick: () => handleColorChange(card.id, color.variantId),
//           }))

//           return (
//             <AnimatePresence key={`${sectionKey}-${i}`}>
//               <motion.div
//                 className="absolute"
//                 style={{ visibility: isModalOpen ? 'hidden' : 'visible' }}
//                 initial={{
//                   opacity: 0,
//                   scale: 0.8,
//                   translateX: 0,
//                   translateY: 20,
//                   filter: 'blur(10px)',
//                 }}
//                 animate={{
//                   opacity: blur > 6 ? 0 : 1,
//                   scale: inView ? scale : 0.8,
//                   filter: inView ? `blur(${blur}px)` : 'blur(10px)',
//                   transform: inView
//                     ? `translateX(${translateX}px) translateZ(${translateZ}px) scale(${scale})`
//                     : `translateX(0px) translateY(20px) scale(0.8)`,
//                   zIndex: isFront ? 100 : 50 - Math.abs(relativeOffset),
//                 }}
//                 exit={{ opacity: 0, scale: 0.8 }}
//                 transition={{ duration: 0.8, ease: 'easeInOut' }}
//               >
//                 <CatalogCard
//                   {...card}
//                   layoutKey={`${sectionKey}-${i}`}
//                   isActive={isFront && !isModalOpen}
//                   image={selectedImage}
//                   colorSwatches={colorSwatches}
//                   selectedVariantId={selectedVariantId}
//                 />
//               </motion.div>
//             </AnimatePresence>
//           )
//         })}
//       </motion.div>
//     </div>
//   )
// }




'use client'

import { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import CatalogCard from './CatalogCard'
import { useModal } from '@/src/context/ModalContext'
import { useInView } from 'react-intersection-observer'
import type { CatalogCardDTO } from '@/types/catalog'

interface CatalogCarouselProps {
  cards: CatalogCardDTO[]
  sectionKey: string
}

export default function CatalogCarousel({ cards, sectionKey }: CatalogCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const { isModalOpen } = useModal()

 const [variantMap, setVariantMap] = useState<Record<string, string>>(() => {
  const initialMap: Record<string, string> = {}
  cards.forEach((card) => {
    // 🔹 For now: default to the first color's variantId
    const firstVariantId = card.colors[0]?.variantId
    if (firstVariantId) {
      initialMap[card.id] = firstVariantId
    }
  })
  return initialMap
})


  const handleColorChange = (cardId: string, newVariantId: string) => {
    setVariantMap((prev) => ({
      ...prev,
      [cardId]: newVariantId,
    }))
  }

  const handleNext = () => setCurrentIndex((prev) => (prev + 1) % cards.length)
  const handlePrev = () => setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length)

  const handleDragEnd = (_: any, info: any) => {
    if (info.offset.x < -100) handleNext()
    else if (info.offset.x > 100) handlePrev()
  }

  // 👁️ Watch if carousel is in view
  const { ref: inViewRef, inView } = useInView({
    threshold: 0.4,
    triggerOnce: false,
  })

  return (
    <div
      className="relative w-full h-[500px] flex flex-col items-center justify-center z-0"
      ref={inViewRef}
    >
      {/* ARROWS */}
      {!isModalOpen && (
        <>
          <div className="absolute top-1/2 left-4 z-10 -translate-y-1/2">
            <button
              onClick={handlePrev}
              className="bg-black text-white px-3 py-2 rounded-full shadow-md hover:bg-gray-800 transition"
            >
              ⬅️
            </button>
          </div>
          <div className="absolute top-1/2 right-4 z-10 -translate-y-1/2">
            <button
              onClick={handleNext}
              className="bg-black text-white px-3 py-2 rounded-full shadow-md hover:bg-gray-800 transition"
            >
              ➡️
            </button>
          </div>
        </>
      )}

      {/* CAROUSEL */}
      <motion.div
        className="relative w-full h-full flex items-center justify-center"
        drag={isModalOpen ? false : 'x'}
        dragConstraints={{ left: 0, right: 0 }}
        onDragEnd={handleDragEnd}
        ref={containerRef}
        style={{ pointerEvents: isModalOpen ? 'none' : 'auto' }}
      >
        {cards.map((card, i) => {
          const offset = i - currentIndex
          const half = Math.floor(cards.length / 2)
          let relativeOffset = offset
          if (offset > half) relativeOffset -= cards.length
          if (offset < -half) relativeOffset += cards.length

          // Only render the front card + 2 neighbors (for performance)
          if (Math.abs(relativeOffset) > 2) return null

          const scale = 1.2 - Math.abs(relativeOffset) * 0.05
          const blur = Math.abs(relativeOffset) * 1.5
          const translateX = relativeOffset * 160
          const translateZ = -Math.abs(relativeOffset) * 30
          const isFront = relativeOffset === 0

          const selectedVariantId = variantMap[card.id]
          const selectedColor = card.colors.find(
            (color) => color.variantId === selectedVariantId
          ) || card.colors[0]

          const selectedImage =
            selectedColor?.images?.[0] ??
            card.colors[0]?.images?.[0] ??
            '' // fallback empty (we can harden later)

          const colorSwatches = card.colors.map((color) => ({
            hex: color.hex,
            isSelected: selectedVariantId === color.variantId,
            onClick: () => handleColorChange(card.id, color.variantId),
          }))

          return (
            <AnimatePresence key={`${sectionKey}-${i}`}>
              <motion.div
                className="absolute"
                // style={{ visibility: isModalOpen ? 'hidden' : 'visible' }}
                initial={{
                  opacity: 0,
                  scale: 0.8,
                  translateX: 0,
                  translateY: 20,
                  filter: 'blur(10px)',
                }}
                animate={{
                  opacity: blur > 6 ? 0 : 1,
                  scale: inView ? scale : 0.8,
                  filter: inView ? `blur(${blur}px)` : 'blur(10px)',
                  transform: inView
                    ? `translateX(${translateX}px) translateZ(${translateZ}px) scale(${scale})`
                    : `translateX(0px) translateY(20px) scale(0.8)`,
                  zIndex: isFront ? 100 : 50 - Math.abs(relativeOffset),
                }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.8, ease: 'easeInOut' }}
              >
                <CatalogCard
                  {...card}
                  layoutKey={`${sectionKey}-${i}`}
                  isActive={isFront && !isModalOpen}
                  // @ts-expect-error: CatalogCard doesn't explicitly accept `image` yet,
                  // but we were passing it before – we'll clean this in a later step.
                  image={selectedImage}
                  colorSwatches={colorSwatches}
                  selectedVariantId={selectedVariantId}
                />
              </motion.div>
            </AnimatePresence>
          )
        })}
      </motion.div>
    </div>
  )
}
