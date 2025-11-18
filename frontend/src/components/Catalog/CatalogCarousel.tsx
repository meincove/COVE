

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

// ---------- 3D layout helpers (Lightswind-style roles) ----------

type CardRole = 'center' | 'left1' | 'right1' | 'left2' | 'right2' | 'left3' | 'right3'| 'hidden'

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


function getCardLayout(role: CardRole) {
  switch (role) {
    case 'center':
      return {
        x: 0,
        scale: 1.15,   // hero card
        opacity: 1,
        blur: 0,
        zIndex: 100,
      }

    case 'left1':
      return {
        x: -420,       // immediate neighbor
        scale: 0.9,
        opacity: 1,
        blur: 1.6,
        zIndex: 80,
      }

    case 'right1':
      return {
        x: 420,
        scale: 0.9,
        opacity: 1,
        blur: 1.6,
        zIndex: 80,
      }

    case 'left2':
      return {
        x: -760,       // second ring
        scale: 0.75,
        opacity: 0.7,
        blur: 3.0,
        zIndex: 60,
      }

    case 'right2':
      return {
        x: 760,
        scale: 0.75,
        opacity: 0.7,
        blur: 3.0,
        zIndex: 60,
      }

    case 'left3':
      return {
        x: -1040,      // third ring, mostly a hint on the side
        scale: 0.6,
        opacity: 0.45,
        blur: 4.2,
        zIndex: 40,
      }

    case 'right3':
      return {
        x: 1040,
        scale: 0.6,
        opacity: 0.45,
        blur: 4.2,
        zIndex: 40,
      }

    case 'hidden':
    default:
      return {
        x: 0,
        scale: 0.5,
        opacity: 0,
        blur: 6,
        zIndex: 0,
      }
  }
}


export default function CatalogCarousel({ cards, sectionKey }: CatalogCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const { isModalOpen } = useModal()

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

  // 👁️ Watch if carousel is in view (for initial entrance)
  const { ref: inViewRef, inView } = useInView({
    threshold: 0.4,
    triggerOnce: false,
  })

  return (
    <div
      className="relative w-full h-full flex flex-col items-center justify-center z-0"
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
        style={{
          pointerEvents: isModalOpen ? 'none' : 'auto',
          perspective: 1400, // subtle 3D feel
        }}
      >
        {cards.map((card, i) => {
          // --- compute wrapped relative offset ---
          const offset = i - currentIndex
          const half = Math.floor(cards.length / 2)
          let relativeOffset = offset
          if (offset > half) relativeOffset -= cards.length
          if (offset < -half) relativeOffset += cards.length

          // Only care about center ±2 (like itemCount=5)
          if (Math.abs(relativeOffset) > 3) return null

          const role = getCardRole(relativeOffset)
          const layout = getCardLayout(role)
          const isCenter = role === 'center'

          const selectedVariantId = variantMap[card.id]
          const selectedColor =
            card.colors.find((color) => color.variantId === selectedVariantId) || card.colors[0]

          const selectedImage =
            selectedColor?.images?.[0] ?? card.colors[0]?.images?.[0] ?? ''

          const colorSwatches = card.colors.map((color) => ({
            hex: color.hex,
            isSelected: selectedVariantId === color.variantId,
            onClick: () => handleColorChange(card.id, color.variantId),
          }))

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
                  opacity: inView ? layout.opacity : 0,
                  scale: inView ? layout.scale : 0.7,
                  x: inView ? layout.x : 0,
                  y: 0,
                  filter: inView ? `blur(${layout.blur}px)` : 'blur(10px)',
                  zIndex: layout.zIndex,
                }}
                exit={{ opacity: 0, scale: 0.7, x: 0, filter: 'blur(10px)' }}
                transition={{
                  duration: 0.9, // slightly longer for that smooth glide
                  ease: 'easeInOut',
                }}
              >
                <CatalogCard
                  {...card}
                  layoutKey={`${sectionKey}-${i}`}
                  isActive={isCenter && !isModalOpen}
                  // @ts-expect-error: CatalogCard doesn't explicitly accept `image` yet
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
