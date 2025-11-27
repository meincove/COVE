'use client'

import React, { useEffect, useRef, useState } from 'react'
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  AnimatePresence,
  type MotionValue,
} from 'framer-motion'
import Image from 'next/image'

interface ThumbnailDockProps {
  thumbnails: string[]
  activeIndex: number
  onChange: (index: number) => void
  className?: string
}

/* -------- dock sizing helper (same as ColorPicker) -------- */

function useDockItemSize(
  mouseX: MotionValue<number>,
  baseItemSize: number,
  magnification: number,
  distance: number,
  ref: React.RefObject<HTMLDivElement | null>,
  spring: { mass: number; stiffness: number; damping: number }
) {
  const mouseDistance = useTransform(mouseX, (val) => {
    if (typeof val !== 'number' || Number.isNaN(val)) return 0
    const rect =
      ref.current?.getBoundingClientRect() ??
      ({ x: 0, width: baseItemSize } as DOMRect)

    return val - rect.x - baseItemSize / 2
  })

  const targetSize = useTransform(
    mouseDistance,
    [-distance, 0, distance],
    [baseItemSize, magnification, baseItemSize]
  )

  return useSpring(targetSize, spring)
}

/* ------------------- single thumbnail bubble ------------------- */

interface ThumbnailDockItemProps {
  src: string
  alt: string
  index: number
  mouseX: MotionValue<number>
  baseItemSize: number
  magnification: number
  distance: number
  spring: { mass: number; stiffness: number; damping: number }
  isActive: boolean
  onClick: () => void
}

function ThumbnailDockItem({
  src,
  alt,
  index,
  mouseX,
  baseItemSize,
  magnification,
  distance,
  spring,
  isActive,
  onClick,
}: ThumbnailDockItemProps) {
  const ref = useRef<HTMLDivElement>(null)
  const isHovered = useMotionValue(0)
  const size = useDockItemSize(
    mouseX,
    baseItemSize,
    magnification,
    distance,
    ref,
    spring
  )
  const [showLabel, setShowLabel] = useState(false)

  useEffect(() => {
    const unsub = isHovered.on('change', (v) => setShowLabel(v === 1))
    return () => unsub()
  }, [isHovered])

  return (
    <motion.div
      ref={ref}
      style={{ width: size, height: size }}
      onHoverStart={() => isHovered.set(1)}
      onHoverEnd={() => isHovered.set(0)}
      onFocus={() => isHovered.set(1)}
      onBlur={() => isHovered.set(0)}
      onClick={onClick}
      className={`
        relative inline-flex items-center justify-center rounded-full
        bg-white border border-slate-200
        transition-transform
        ${isActive ? 'ring-[2px] ring-[#4F46E5]' : ''}
      `}
      tabIndex={0}
      role="button"
      aria-label={alt}
    >
      {/* inner thumbnail */}
      <div className="relative h-[80%] w-[80%] overflow-hidden rounded-full">
        <Image
          src={`/clothing-images/${src}`}
          alt={alt}
          fill
          sizes="40px"
          className="object-cover"
        />
      </div>

      <AnimatePresence>
        {showLabel && (
          <motion.div
            initial={{ opacity: 0, y: 0 }}
            animate={{ opacity: 1, y: -10 }}
            exit={{ opacity: 0, y: 0 }}
            transition={{ duration: 0.2 }}
            className="
              absolute -top-7 left-1/2 -translate-x-1/2
              whitespace-pre rounded-full border border-slate-200
              bg-white px-2.5 py-0.5
              text-[10px] font-semibold text-slate-900
              shadow-sm
            "
            role="tooltip"
          >
            {`View ${index + 1}`}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/* -------------------------- ThumbnailDock --------------------------- */

export default function ThumbnailDock({
  thumbnails,
  activeIndex,
  onChange,
  className,
}: ThumbnailDockProps) {
  if (!thumbnails.length) return null

  const spring = { mass: 0.1, stiffness: 150, damping: 12 }
  const magnification = 54
  const distance = 80
  const panelHeight = 40
  const baseItemSize = 42

  const mouseX = useMotionValue(Infinity)

  const rootClass = [
    'pointer-events-auto flex w-full justify-center',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div style={{ height: panelHeight }} className={rootClass}>
      <motion.div
        onMouseMove={({ pageX }) => {
          mouseX.set(pageX)
        }}
        onMouseLeave={() => {
          mouseX.set(Infinity)
        }}
        className="
          flex w-fit items-center gap-2 rounded-full
          border border-slate-200 bg-white
          px-3 py-2
        "
        style={{ height: panelHeight }}
        role="radiogroup"
        aria-label="Image picker"
      >
        {thumbnails.map((thumb, idx) => (
          <ThumbnailDockItem
            key={`${thumb}-${idx}`}
            src={thumb}
            alt={`Thumbnail ${idx + 1}`}
            index={idx}
            mouseX={mouseX}
            baseItemSize={baseItemSize}
            magnification={magnification}
            distance={distance}
            spring={spring}
            isActive={idx === activeIndex}
            onClick={() => onChange(idx)}
          />
        ))}
      </motion.div>
    </div>
  )
}
