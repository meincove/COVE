// src/components/common/ColorPicker.tsx
'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  AnimatePresence,
  type MotionValue,
} from 'framer-motion'

export type ColorOption = {
  id: string
  name: string
  hex: string
}

interface ColorPickerProps {
  colors: ColorOption[]
  activeId: string | null
  onSelect: (id: string) => void
  className?: string
}

/* -------- dock sizing helper (same as overlay) -------- */

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

/* ------------------- single color bubble ------------------- */

interface ColorDockItemProps {
  color: ColorOption
  mouseX: MotionValue<number>
  baseItemSize: number
  magnification: number
  distance: number
  spring: { mass: number; stiffness: number; damping: number }
  isActive: boolean
  onClick: () => void
}

function ColorDockItem({
  color,
  mouseX,
  baseItemSize,
  magnification,
  distance,
  spring,
  isActive,
  onClick,
}: ColorDockItemProps) {
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
        bg-white shadow-md transition-transform
        ${isActive ? 'ring-[2px] ring-[#4F46E5]' : ''}
      `}
      tabIndex={0}
      role="button"
      aria-label={color.name}
    >
      {/* INNER BLOB: % sizing so gap is small even when magnified */}
      <div
        className="rounded-full border border-black/10"
        style={{
          backgroundColor: color.hex,
          width: '80%',   // tighten / loosen gap here
          height: '80%',
        }}
      />

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
              text-[10px] font-semibold text-slate-900 capitalize
              shadow-sm
            "
            role="tooltip"
          >
            {color.name}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/* -------------------------- ColorPicker --------------------------- */

export default function ColorPicker({
  colors,
  activeId,
  onSelect,
  className,
}: ColorPickerProps) {
  if (!colors.length) return null

  // ⬇ Deck size controls (smaller but same animation)
  const spring = { mass: 0.1, stiffness: 150, damping: 12 }
  const magnification = 40  // how big the biggest bubble gets
  const distance = 120
  const panelHeight = 35     // VISIBLE DECK HEIGHT
  const dockHeight = 0     // MAX animated height
  const baseItemSize = 22    // base bubble size

  const mouseX = useMotionValue(Infinity)
  const isHovered = useMotionValue(0)

  const maxHeight = useMemo(
    () => Math.max(dockHeight, magnification + magnification / 2 + 4),
    [magnification, dockHeight]
  )

  const animatedHeight = useSpring(
    useTransform(isHovered, [0, 1], [panelHeight, maxHeight]),
    spring
  )

  const rootClass = [
    'pointer-events-auto flex w-full justify-center',
    className,
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <motion.div style={{ height: animatedHeight }} className={rootClass}>
      <motion.div
        onMouseMove={({ pageX }) => {
          isHovered.set(1)
          mouseX.set(pageX)
        }}
        onMouseLeave={() => {
          isHovered.set(0)
          mouseX.set(Infinity)
        }}
        className="
          flex w-fit items-end gap-1.5 rounded-full
          border border-slate-200 bg-white/95
          px-3 pb-1.5 shadow-sm
        "
        style={{ height: panelHeight }}    
        role="radiogroup"
        aria-label="Color picker"
      >
        {colors.map((color) => (
          <ColorDockItem
            key={color.id}
            color={color}
            mouseX={mouseX}
            baseItemSize={baseItemSize}
            magnification={magnification}
            distance={distance}
            spring={spring}
            isActive={color.id === activeId}
            onClick={() => onSelect(color.id)}
          />
        ))}
      </motion.div>
    </motion.div>
  )
}
