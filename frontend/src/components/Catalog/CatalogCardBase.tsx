// src/components/Catalog/CatalogCardBase.tsx
'use client'

import { motion } from 'framer-motion'
import { useState, type CSSProperties } from 'react'
import type { ColorTheme } from '@/utils/colorThemes'

type CardMode = 'normal' | 'hero'

interface CatalogCardBaseProps {
  layoutKey: string | number
  name: string
  images: string[]
  tier: string
  type: string
  metaLine: string
  price: number

  // sizes + qty (no longer rendered here, but kept for prop compatibility)
  sizes: Record<string, number>
  selectedSize: string | null
  onSizeChange: (size: string) => void
  quantity: number
  onQuantityChange: (next: number) => void

  // colours
  colorSwatches: {
    hex: string
    isSelected: boolean
    onClick: () => void
    colorName?: string
  }[]

  theme: ColorTheme
  selectedVariantId: string
  onSwipeBarClick?: () => void
  onImageDrag?: () => void
  isActive?: boolean
  mode?: CardMode
}

export default function CatalogCardBase({
  layoutKey,
  name,
  images,
  tier,
  type,
  metaLine,
  price,
  // sizes,
  // selectedSize,
  // onSizeChange,
  // quantity,
  // onQuantityChange,
  colorSwatches,
  theme,
  selectedVariantId, // eslint-disable-line @typescript-eslint/no-unused-vars
  onSwipeBarClick,
  onImageDrag, // eslint-disable-line @typescript-eslint/no-unused-vars
  isActive = true,
  mode = 'normal',
}: CatalogCardBaseProps) {
  const layoutId = `catalog-card-${layoutKey}`
  const [isHovered, setIsHovered] = useState(false)

  const cardStyle: CSSProperties = {
    width: mode === 'hero' ? 'min(360px, 72vw)' : 'min(340px, 70vw)',
    height: 'min(440px, 60vh)',
  }

  const textColor = theme.textColor ?? 'text-slate-900'

  const usableImages = (images ?? []).filter(
    (img) => typeof img === 'string' && img.trim().length > 0
  )
  const hasImages = usableImages.length > 0
  const primaryImage = hasImages ? usableImages[0] : null

  return (
    <motion.div
      layoutId={layoutId}
      className={`
        relative flex flex-col
        rounded-[32px]
        bg-[#f9fbff] border border-slate-200
        shadow-[0_18px_40px_rgba(15,23,42,0.22)]
        overflow-hidden
        transition-transform
        cursor-grab active:cursor-grabbing
        ${!isActive ? 'pointer-events-none opacity-60 z-10' : 'z-50'}
      `}
      style={cardStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={isActive ? { y: -6 } : {}}
      transition={{ type: 'spring', stiffness: 220, damping: 24 }}
    >
      {/* IMAGE AREA */}
      <motion.div
        className="
          relative w-full
          bg-[#e7edf5]
          flex items-center justify-center
          overflow-hidden
        "
        initial={false}
        animate={{ height: isHovered ? '60%' : '100%' }}
        transition={{ type: 'spring', stiffness: 240, damping: 26 }}
      >
        {hasImages && primaryImage ? (
          <img
            src={`/clothing-images/${primaryImage}`}
            alt={name}
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <div className="flex items-center justify-center w-full h-full text-sm font-semibold text-slate-500">
            No images available
          </div>
        )}
      </motion.div>

      {/* INFO AREA */}
      <motion.div
        layoutId={`${layoutId}-info`}
        className="
          w-full
          bg-[#f9fbff]
          border-t border-slate-200
          flex flex-col gap-3
          px-4 pb-4 pt-3
        "
        style={{
          pointerEvents: isHovered ? 'auto' : 'none',
        }}
        initial={false}
        animate={{
          height: isHovered ? '40%' : '0%',
          opacity: isHovered ? 1 : 0,
          translateY: isHovered ? 0 : 4,
        }}
        transition={{ type: 'spring', stiffness: 240, damping: 26 }}
      >
        {/* ROW 1: Tier/type + meta + price + colours */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-[0.22em] text-slate-500">
              {tier.toUpperCase()} · {type.toUpperCase()}
            </span>
            <span className={`text-[11px] text-slate-600 ${textColor}`}>
              {metaLine}
            </span>
          </div>

          <div className="flex flex-col items-end gap-2">
            <span className="text-[14px] font-semibold text-slate-900">
              €{price.toFixed(2)}
            </span>
            <div className="flex flex-wrap gap-1.5 justify-end">
              {colorSwatches.map((c, i) => (
                <button
                  key={`${c.hex}-${i}`}
                  type="button"
                  onClick={c.onClick}
                  className={`
                    inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11px]
                    ${
                      c.isSelected
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-800 border-slate-300 hover:border-slate-500'
                    }
                  `}
                >
                  <span
                    className="h-3.5 w-3.5 rounded-full border border-slate-200"
                    style={{ backgroundColor: c.hex }}
                  />
                  <span className="capitalize">
                    {c.colorName ?? 'colour'}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* SWIPE BAR */}
        <div className="mt-auto flex justify-center pt-2">
          <button
            type="button"
            onClick={isActive ? onSwipeBarClick : undefined}
            className="
              w-[32px] h-[6px] rounded-full bg-[#7165e5]
              shadow-[0_0_8px_rgba(113,101,229,0.7)]
            "
          />
        </div>
      </motion.div>
    </motion.div>
  )
}
