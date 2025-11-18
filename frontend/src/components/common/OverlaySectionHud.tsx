// 'use client'

// type SectionItem = {
//   id: string
//   label: string
// }

// interface OverlaySectionHudProps {
//   sections: SectionItem[]
//   activeId: string | null
//   onSelect: (id: string) => void
// }

// export default function OverlaySectionHud({
//   sections,
//   activeId,
//   onSelect,
// }: OverlaySectionHudProps) {
//   if (!sections.length) return null

//   return (
//     <div
//       className="
//         fixed left-1/2 bottom-6 -translate-x-1/2
//         z-50
//         flex items-center gap-2
//         px-3 py-2
//         rounded-full
//         bg-black/70
//         border border-white/15
//         backdrop-blur-xl
//       "
//     >
//       {sections.map((section) => {
//         const isActive = section.id === activeId
//         return (
//           <button
//             key={section.id}
//             onClick={() => onSelect(section.id)}
//             className={`
//               text-xs md:text-sm font-medium px-3 py-1 rounded-full transition
//               ${
//                 isActive
//                   ? 'bg-white text-black shadow-sm'
//                   : 'bg-transparent text-gray-200 hover:bg-white/10'
//               }
//             `}
//           >
//             {section.label}
//           </button>
//         )
//       })}
//     </div>
//   )
// }

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

type SectionItem = {
  id: string
  label: string
  icon: React.ReactNode
  badgeCount?: number
}

interface OverlaySectionHudProps {
  sections: SectionItem[]
  activeId: string | null
  onSelect: (id: string) => void
}

/* ----------- Lightswind dock sizing helper (unchanged) ----------- */

function useDockItemSize(
  mouseX: MotionValue<number>,
  baseItemSize: number,
  magnification: number,
  distance: number,
  ref: React.RefObject<HTMLDivElement | null>,
  spring: { mass: number; stiffness: number; damping: number }
) {
  const mouseDistance = useTransform(mouseX, (val) => {
    if (typeof val !== 'number' || isNaN(val)) return 0
    const rect = ref.current?.getBoundingClientRect() ?? {
      x: 0,
      width: baseItemSize,
    }
    return val - rect.x - baseItemSize / 2
  })

  const targetSize = useTransform(
    mouseDistance,
    [-distance, 0, distance],
    [baseItemSize, magnification, baseItemSize]
  )

  return useSpring(targetSize, spring)
}

/* ---------------------- DockItem (icon bubble) -------------------- */

interface InternalDockItemProps {
  icon: React.ReactNode
  label: string
  onClick: () => void
  mouseX: MotionValue<number>
  baseItemSize: number
  magnification: number
  distance: number
  spring: { mass: number; stiffness: number; damping: number }
  badgeCount?: number
  isActive: boolean
}

function DockItem({
  icon,
  label,
  onClick,
  mouseX,
  baseItemSize,
  magnification,
  distance,
  spring,
  badgeCount,
  isActive,
}: InternalDockItemProps) {
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
    const unsub = isHovered.on('change', (value) => setShowLabel(value === 1))
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
        bg-white shadow-md
        transition-transform
        ${isActive ? 'ring-2 ring-black/80' : ''}
      `}
      tabIndex={0}
      role="button"
      aria-haspopup="true"
    >
      <div className="flex items-center justify-center text-black">{icon}</div>

      {badgeCount !== undefined && badgeCount > 0 && (
        <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
          {badgeCount > 99 ? '99+' : badgeCount}
        </span>
      )}

      <AnimatePresence>
        {showLabel && (
          <motion.div
            initial={{ opacity: 0, y: 0 }}
            animate={{ opacity: 1, y: -10 }}
            exit={{ opacity: 0, y: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute -top-6 left-1/2 w-fit whitespace-pre rounded-md
                       border border-black/60 bg-[#060606] px-2 py-0.5 text-xs text-white"
            style={{ x: '-50%' }}
            role="tooltip"
          >
            {label}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/* ------------------ OverlaySectionHud as Dock --------------------- */

export default function OverlaySectionHud({
  sections,
  activeId,
  onSelect,
}: OverlaySectionHudProps) {
  if (!sections.length) return null

  // exact defaults from Lightswind Dock
  const spring = { mass: 0.1, stiffness: 150, damping: 12 }
  const magnification = 70
  const distance = 200
  const panelHeight = 64
  const dockHeight = 256
  const baseItemSize = 50

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

  return (
    <motion.div
      style={{ height: animatedHeight }}
      className="pointer-events-auto mx-2 flex max-w-full items-center"
    >
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
          fixed bottom-4 left-1/2 -translate-x-1/2 transform
          flex w-fit items-end gap-4 rounded-2xl
          border border-neutral-200 bg-white/90
          px-4 pb-2 shadow-lg backdrop-blur-md
          z-50
        "
        style={{ height: panelHeight }}
        role="toolbar"
        aria-label="Section dock"
      >
        {sections.map((section) => (
          <DockItem
            key={section.id}
            icon={section.icon}
            label={section.label}
            onClick={() => onSelect(section.id)}
            mouseX={mouseX}
            baseItemSize={baseItemSize}
            magnification={magnification}
            distance={distance}
            spring={spring}
            badgeCount={section.badgeCount}
            isActive={section.id === activeId}
          />
        ))}
      </motion.div>
    </motion.div>
  )
}
