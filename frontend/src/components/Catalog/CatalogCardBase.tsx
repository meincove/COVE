
'use client'

import { useState, useRef } from 'react'
import type React from 'react'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Heart } from 'lucide-react'
// import ThumbnailDock from '@/src/components/common/ThumbnailDock'
import CoveSuggestionPill, {
  SuggestionVariant,
} from '@/src/components/ui/CoveSuggestionPill'
import type { ColorTheme } from '@/utils/colorThemes'

type CardMode = 'normal' | 'hero'

interface CatalogCardBaseProps {
  layoutKey: string | number
  name: string
  tier: string
  type: string
  metaLine: string
  price: number
  images: string[]
  heroImage: string
  primaryHex: string
  theme: ColorTheme
  selectedVariantId: string
  isActive: boolean
  mode?: CardMode
  activeImageIndex: number
  onActiveImageChange: (index: number) => void
  onBrowseClick: () => void
  pillLabel?: string | null
  pillVariant?: SuggestionVariant | null
}

/**
 * Turn "#RRGGBB" into a soft rgba background with low opacity.
 * Falls back to a neutral gray if hex is malformed.
 */
function getSoftBackground(hex: string, alpha = 0.22): string {
  const clean = hex.replace('#', '')
  if (clean.length !== 6) {
    return `rgba(209, 213, 219, ${alpha})`
  }

  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)

  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

// long-press config
const LONG_PRESS_MS = 1200
const MOVE_TOLERANCE_PX = 10

export default function CatalogCardBase({
  name,
  tier,
  type,
  metaLine,
  price,
  images,
  heroImage,
  primaryHex,
  isActive,
  activeImageIndex,
  onActiveImageChange,
  onBrowseClick,
  pillLabel,
  pillVariant,
}: CatalogCardBaseProps) {
  const hasImages = images.length > 0
  const imageBg = getSoftBackground(primaryHex)
  const [liked, setLiked] = useState(false)

  // ---- long-press tracking ----
  const timeoutRef = useRef<number | null>(null)
  const startPosRef = useRef<{ x: number; y: number } | null>(null)
  const longPressTriggeredRef = useRef(false)

  const clearLongPress = () => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    startPosRef.current = null
    longPressTriggeredRef.current = false
  }

  const handlePointerDown: React.PointerEventHandler<HTMLElement> = (e) => {
    // only left mouse button for mouse; all touch pointers allowed
    if (e.pointerType === 'mouse' && e.button !== 0) return

    longPressTriggeredRef.current = false
    startPosRef.current = { x: e.clientX, y: e.clientY }

    timeoutRef.current = window.setTimeout(() => {
      longPressTriggeredRef.current = true
      onBrowseClick()
    }, LONG_PRESS_MS)
  }

  const handlePointerMove: React.PointerEventHandler<HTMLElement> = (e) => {
    if (!startPosRef.current || longPressTriggeredRef.current) return

    const dx = e.clientX - startPosRef.current.x
    const dy = e.clientY - startPosRef.current.y
    const distSq = dx * dx + dy * dy

    if (distSq > MOVE_TOLERANCE_PX * MOVE_TOLERANCE_PX) {
      // user is dragging: cancel long-press
      clearLongPress()
    }
  }

  const handlePointerUp: React.PointerEventHandler<HTMLElement> = () => {
    // if long-press already fired, just clean up
    clearLongPress()
  }

  const handlePointerLeave: React.PointerEventHandler<HTMLElement> = () => {
    clearLongPress()
  }

  return (
    <article
      className="
        flex flex-col overflow-hidden rounded-[22px]
        bg-white shadow-[0_18px_45px_rgba(15,23,42,0.35)]
      "
      style={{
        width: 'var(--card-width)',
        height: 'var(--card-height)',
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      onPointerCancel={handlePointerLeave}
    >
      <div className="flex h-full flex-col gap-3 p-4">
        {/* IMAGE AREA */}
        <div
          className="
            relative flex-1 rounded-2xl overflow-hidden
            flex items-center justify-center
          "
          style={{ backgroundColor: imageBg }}
        >
          {/* TOP OVERLAY: pill (left) + wishlist (right) */}
          <div
            className="
              pointer-events-none
              absolute inset-x-0 top-0 z-10
              flex items-start
              px-3 pt-3
            "
          >
            {pillLabel && pillVariant && (
              <div className="pointer-events-auto">
                <CoveSuggestionPill
                  label={pillLabel}
                  variant={pillVariant}
                />
              </div>
            )}

            <motion.button
              type="button"
              onClick={() => setLiked((prev) => !prev)}
              whileTap={{ scale: 0.8 }}
              className="
                pointer-events-auto ml-auto
                rounded-full bg-white/85
                p-1.5 shadow-md
              "
              aria-label="Toggle wishlist"
            >
              <motion.div
                key={liked ? 'filled' : 'outline'}
                initial={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.7, opacity: 0 }}
                transition={{
                  type: 'spring',
                  stiffness: 300,
                  damping: 20,
                }}
              >
                {liked ? (
                  <Heart
                    className="text-red-500 fill-red-500"
                    size={18}
                  />
                ) : (
                  <Heart
                    className="text-slate-800"
                    size={18}
                  />
                )}
              </motion.div>
            </motion.button>
          </div>

          {hasImages ? (
            <div className="relative h-full w-full">
              <Image
                src={heroImage}
                alt={name}
                fill
                sizes="(min-width: 1024px) 26vw, 80vw"
                className="object-contain"
                priority={isActive}
                unoptimized={true}
              />
            </div>
          ) : (
            <p className="text-sm font-semibold text-slate-700">
              No images available
            </p>
          )}
        </div>

        {/* THUMBNAILS (disabled for now) */}
        {/*
        <div className="flex items-center justify-center">
          {hasImages && (
            <ThumbnailDock
              thumbnails={images}
              activeIndex={activeImageIndex}
              onChange={onActiveImageChange}
            />
          )}
        </div>
        */}

        {/* TEXT + BUTTON */}
        <div
          className="
            mt-1 flex flex-col justify-between
            rounded-2xl bg-gray-400/90
            px-5 pb-4 pt-3
          "
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-[11px] uppercase tracking-[0.22em] text-slate-700">
                {tier.toUpperCase()} · {type.toUpperCase()}
              </span>
              <span className="text-[13px] font-semibold text-slate-900">
                {name}
              </span>
              <span className="text-[11px] text-slate-800/80">
                {metaLine}
              </span>
            </div>

            <span className="text-[14px] font-semibold text-slate-900">
              €{price.toFixed(2)}
            </span>
          </div>

          <button
            type="button"
            onClick={onBrowseClick}
            className="
              mt-3 w-full rounded-full bg-black
              py-2 text-sm font-semibold text-white
              transition-transform
              hover:translate-y-[1px]
              active:translate-y-[2px]
            "
          >
            Browse {type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        </div>
      </div>
    </article>
  )
}

