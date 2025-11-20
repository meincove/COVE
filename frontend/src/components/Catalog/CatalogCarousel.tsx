// src/components/Catalog/CatalogCarousel.tsx
'use client'

import { CSSProperties, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import CatalogCard from './CatalogCard'
import { useModal } from '@/src/context/ModalContext'
import { useInView } from 'react-intersection-observer'
import type { CatalogCardDTO } from '@/types/catalog'
import CatalogDetailPanel from './CatalogDetailPanel'


interface CatalogCarouselProps {
  cards: CatalogCardDTO[]
  sectionKey: string
}

// ---------- 3D layout helpers ----------
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

function getCardLayout(role: CardRole) {
  switch (role) {
    case 'center':
      return {
        x: 0,
        scale: 1.15,
        opacity: 1,
        blur: 0,
        zIndex: 100,
      }
    case 'left1':
      return {
        x: -420,
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
        x: -760,
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
        x: -1040,
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

export default function CatalogCarousel({
  cards,
  sectionKey,
}: CatalogCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null)

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

  const cardSizingVars= {
    '--card-width': 'clamp(240px, 26vw, 380px)',
    '--card-height': 'clamp(320px, 52vh, 540px)',
  }

  const handleColorChange = (cardId: string, newVariantId: string) => {
    setVariantMap((prev) => ({
      ...prev,
      [cardId]: newVariantId,
    }))
  }

  const handleNext = () => setCurrentIndex((prev) => (prev + 1) % cards.length)
  const handlePrev = () =>
    setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length)

  const handleDragEnd = (_: any, info: any) => {
    if (expandedCardId) return
    if (info.offset.x < -100) handleNext()
    else if (info.offset.x > 100) handlePrev()
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


  return (
    <div
      className="relative w-full h-full flex flex-col items-center justify-center z-0"
      ref={inViewRef}
      style={cardSizingVars as CSSProperties}
    >
      {/* Dim backdrop feel when expanded */}
             {hasExpanded && (
      <div className="absolute inset-0 rounded-xl bg-slate-900/35 pointer-events-none" />
    )}



      {/* ARROWS */}
      {carouselInteractive && (
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
        drag={carouselInteractive ? 'x' : false}
        dragConstraints={{ left: 0, right: 0 }}
        onDragEnd={handleDragEnd}
        ref={containerRef}
        style={{
          pointerEvents: carouselInteractive ? 'auto' : 'auto',
          perspective: 1400,
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
          const selectedColor =
            card.colors.find(
              (color: CatalogCardDTO['colors'][number]) =>
                color.variantId === selectedVariantId
            ) || card.colors[0]

          // Shift hero card slightly to the right + keep others dim
          if (isExpanded) {
  layout = {
    ...layout,
    // shift the center card to the LEFT instead of right,
    // and keep the scale from the base layout
    x: layout.x - 320,
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
      filter: shouldShow ? `blur(${layout.blur}px)` : 'blur(10px)',
      zIndex: layout.zIndex,
    }}

                exit={{ opacity: 0, scale: 0.7, x: 0, filter: 'blur(10px)' }}
                transition={{
  duration: 0.8,
  ease: [0.16, 1, 0.3, 1], // similar curve as panel
}}

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
                />
              </motion.div>
            </AnimatePresence>
          )
        })}
      </motion.div>

      {/* {hasExpanded && expandedCard && (
        <CatalogDetailPanel
          card={expandedCard}
          selectedVariantId={expandedVariantId}
          onClose={() => setExpandedCardId(null)}
        />
      )} */}

      {hasExpanded && expandedCard && (
  <div
    className="
      absolute inset-4 md:inset-6 lg:inset-8
      flex items-center justify-end
      pointer-events-none
      z-30
    "
  >
    {/* Inner row that actually lays out the panel */}
    <div
      className="
        h-full w-full max-w-6xl
        flex flex-col lg:flex-row
        items-center lg:items-stretch
        justify-end
        px-4 md:px-8 lg:px-10
        pointer-events-auto
      "
    >
      {/* ONLY the detail panel lives here – NO extra CatalogCard */}
      <div
        className="flex-1 h-full"
        style={{
          // panel width is responsive but never crushes the card:
          // between 260px and 720px, prefers about 58% of overlay width
          flexBasis: 'clamp(260px, 58%, 720px)',
        }}
      >
        <CatalogDetailPanel
          card={expandedCard}
          selectedVariantId={variantMap[expandedCard.id]}
          onClose={() => setExpandedCardId(null)}
        />
      </div>
    </div>
  </div>
)}




    </div>
  )
}



