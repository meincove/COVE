// // src/components/Catalog/CatalogCardBase.tsx
// 'use client'

// import { motion, AnimatePresence } from 'framer-motion'
// import { useState } from 'react'
// import { ColorTheme } from '@/utils/colorThemes'

// type CardMode = 'normal' | 'hero'

// interface CatalogCardBaseProps {
//   layoutKey: string | number
//   name: string
//   images: string[]
//   tier: string
//   price: number
//   colorSwatches: {
//     hex: string
//     isSelected: boolean
//     onClick: () => void
//     colorName?: string
//   }[]
//   theme: ColorTheme
//   selectedVariantId: string
//   onSwipeBarClick?: () => void
//   onImageDrag?: () => void
//   isActive?: boolean

//   // NEW
//   mode?: CardMode
// }

// export default function CatalogCardBase({
//   layoutKey,
//   name,
//   images,
//   tier,
//   price,
//   colorSwatches,
//   theme,
//   selectedVariantId,
//   onSwipeBarClick,
//   onImageDrag,
//   isActive = true,
//   mode = 'normal',
// }: CatalogCardBaseProps) {
//   const layoutId = `catalog-card-${layoutKey}`
//   const [isArcOpen, setIsArcOpen] = useState(false)
//   const [isHovered, setIsHovered] = useState(false)

//   const selectedSwatch = colorSwatches.find((c) => c.isSelected)
//   const otherSwatches = colorSwatches.filter((c) => !c.isSelected)

//   const frontImage = images.find((img) => img.includes('front')) ?? images[0]
//   const backImage = images.find((img) => img.includes('back')) ?? images[0]
//   const currentImage = isHovered ? backImage : frontImage
//   const isHero = mode === 'hero'



//   return (
//     <motion.div
//       layoutId={layoutId}
//       className={`relative flex flex-col items-center justify-between rounded-2xl shadow-xl overflow-hidden ${
//         !isActive ? 'pointer-events-none opacity-60 z-10' : 'z-50'
//       }`}

//       style={{
//     // base width: between 260px and 360px; prefers ~22vw in the middle
//     // hero card is slightly larger, but still respects the same min width
//     '--card-width': isHero
//       ? 'clamp(260px, 26vw, 360px)'
//       : 'clamp(260px, 24vw, 340px)',
//     '--card-height': 'calc(var(--card-width) * 1.235)', // keep aspect ratio

//     width: 'var(--card-width)',
//     height: 'var(--card-height)',
//   } as React.CSSProperties}

//   //      style={{
//   //   width: 'var(--card-width, 340px)',
//   //   height: 'var(--card-height, 420px)',
//   // }}
//     >
//       {/* 🔮 Background */}
//       <motion.div
//         layoutId={`card-bg-${layoutKey}`}
//         className={`absolute inset-0 z-0 bg-gradient-to-br ${theme.gradient} ${theme.bgAnimationClass}`}
//       />

//       {/* 🖼️ Image */}
//       <motion.div
//         layoutId={`${layoutId}-image`}
//         className="w-full h-[80%] flex items-center justify-center"
//         draggable={isActive}
//         onDragEnd={(e) => {
//           e.preventDefault()
//           if (isActive && onImageDrag) onImageDrag()
//         }}
//         onMouseEnter={() => setIsHovered(true)}
//         onMouseLeave={() => setIsHovered(false)}
//       >
//         <AnimatePresence mode="wait">
//           <motion.img
//             key={currentImage}
//             src={`/clothing-images/${currentImage}`}
//             alt={name}
//             className="object-contain max-h-full max-w-full relative z-10"
//             initial={{ opacity: 0, scale: 0.95 }}
//             animate={{ opacity: 1, scale: 1 }}
//             exit={{ opacity: 0, scale: 1.05 }}
//             transition={{ duration: 0.4 }}
//           />
//         </AnimatePresence>
//       </motion.div>

//       {/* 📝 Bottom Section */}
//       <motion.div
//         layoutId={`${layoutId}-text`}
//         className="w-full h-[20%] px-4 py-2 flex flex-col justify-between items-start z-10"
//       >
//         {/* 💸 Price + Arc Color Picker */}
//         <div className="w-full flex justify-between items-center mb-1">
//           <div className={`text-[13px] font-medium ${theme.textColor}`}>
//             €{price.toFixed(2)}
//           </div>

//           {colorSwatches.length > 1 && (
//             <div className="relative flex items-center justify-center">
//               {/* Toggle Button showing selected color */}
//               <div
//                 onClick={() => setIsArcOpen((prev) => !prev)}
//                 className="w-6 h-6 rounded-full border-2 border-black flex items-center justify-center cursor-pointer z-30"
//                 style={{
//                   position: 'relative',
//                   backgroundColor: selectedSwatch?.hex || 'white',
//                 }}
//                 title={selectedSwatch?.colorName ?? ''}
//               >
//                 <div className="w-[10px] h-[10px] bg-black rounded-full" />
//               </div>

//               {/* Arc Swatches */}
//               <AnimatePresence>
//                 {isArcOpen && (
//                   <motion.div
//                     className="absolute right-0 top-0 origin-bottom-right p-1 z-20"
//                     initial={{ opacity: 0 }}
//                     animate={{ opacity: 1 }}
//                     exit={{ opacity: 0 }}
//                   >
//                     {otherSwatches.map((c, i) => {
//                       const angle =
//                         (i / (otherSwatches.length - 1 || 1)) * 90
//                       const radius = 60
//                       const x =
//                         Math.cos((angle * Math.PI) / 180) * radius
//                       const y =
//                         -Math.sin((angle * Math.PI) / 180) * radius

//                       return (
//                         <motion.div
//                           key={i}
//                           className="absolute"
//                           style={{
//                             left: 0,
//                             top: 0,
//                             transform: `translate(${x}px, ${y}px)`,
//                           }}
//                           initial={{ opacity: 0, scale: 0.5 }}
//                           animate={{
//                             opacity: 1,
//                             scale: 1,
//                             transition: { delay: i * 0.05 },
//                           }}
//                           exit={{ opacity: 0, scale: 0.5 }}
//                         >
//                           <div
//                             onClick={() => {
//                               c.onClick()
//                               setIsArcOpen(false)
//                             }}
//                             title={c.colorName ?? ''}
//                             className={`w-5 h-5 rounded-full border-[1.5px] cursor-pointer hover:scale-110 transition-transform ${
//                               c.isSelected ? 'ring-2 ring-white' : ''
//                             }`}
//                             style={{ backgroundColor: c.hex }}
//                           />
//                         </motion.div>
//                       )
//                     })}
//                   </motion.div>
//                 )}
//               </AnimatePresence>
//             </div>
//           )}
//         </div>

//         {/* 🏷️ Tier + Brand */}
//         <div className="w-full flex flex-col items-start justify-start">
//           <motion.span
//             layoutId={`${layoutId}-title`}
//             className={`font-bold text-sm tracking-wide ${theme.textColor}`}
//           >
//             {tier.toUpperCase()}
//           </motion.span>
//           <motion.span
//             className={`text-[10px] opacity-70 ${theme.textColor}`}
//           >
//             cove
//           </motion.span>
//         </div>

//         {/* 🧾 Swipe Bar */}
//         <div className="absolute bottom-1 left-0 w-full flex justify-center">
//           <motion.div
//             layoutId={`${layoutId}-swipebar`}
//             className="w-[30px] h-[6px] rounded-full cursor-pointer"
//             onClick={isActive ? onSwipeBarClick : undefined}
//             style={{ backgroundColor: '#7165e5' }}
//             initial={{ y: 0 }}
//             animate={{
//               y: [-2, 0, -2],
//               boxShadow: '0 0 8px rgba(255, 255, 255, 0.6)',
//               transition: {
//                 duration: 1.2,
//                 repeat: Infinity,
//                 repeatType: 'reverse',
//                 ease: 'easeInOut',
//               },
//             }}
//           />
//         </div>
//       </motion.div>
//     </motion.div>
//   )
// }


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

  // sizes + qty
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
  sizes,
  selectedSize,
  onSizeChange,
  quantity,
  onQuantityChange,
  colorSwatches,
  theme,
  selectedVariantId, // eslint quiet
  onSwipeBarClick,
  onImageDrag,
  isActive = true,
  mode = 'normal',
}: CatalogCardBaseProps) {
  const layoutId = `catalog-card-${layoutKey}`
  const [isHovered, setIsHovered] = useState(false)

  const cardStyle: CSSProperties = {
    width: mode === 'hero' ? 'min(360px, 72vw)' : 'min(340px, 70vw)',
    height: 'min(440px, 60vh)', // stays within ~60% of the yellow section
  }

  const frontImage =
    images.find((img) => img.includes('front')) ?? images[0]

  const textColor = theme.textColor ?? 'text-slate-900'

  // helpers
  const handleMinus = () => {
    if (quantity <= 0) return
    onQuantityChange(quantity - 1)
  }

  const handlePlus = () => {
    onQuantityChange(quantity + 1)
  }

  return (
    <motion.div
      layoutId={layoutId}
      className={`
        relative flex flex-col rounded-[32px]
        bg-[#f9fbff] border border-slate-200
        shadow-[0_24px_60px_rgba(15,23,42,0.22)]
        overflow-hidden
        ${!isActive ? 'pointer-events-none opacity-60 z-10' : 'z-50'}
      `}
      style={cardStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* IMAGE AREA — grows/shrinks 100% ↔ 50% on hover */}
      <motion.div
        layoutId={`${layoutId}-image`}
        className="w-full flex items-center justify-center bg-[#e7edf5]"
        style={{ overflow: 'hidden' }}
        animate={{ height: isHovered ? '50%' : '100%' }}
        transition={{ type: 'spring', stiffness: 260, damping: 26 }}
        draggable={isActive}
        onDragEnd={(e) => {
          e.preventDefault()
          if (isActive && onImageDrag) onImageDrag()
        }}
      >
        <motion.img
          key={frontImage}
          src={`/clothing-images/${frontImage}`}
          alt={name}
          className="object-contain w-full h-full p-4"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.04 }}
          transition={{ duration: 0.35 }}
        />
      </motion.div>

      {/* INFO AREA — 0% ↔ 50% height on hover, slides up */}
      <motion.div
        layoutId={`${layoutId}-info`}
        className="
          w-full px-4 pb-4 pt-3
          bg-[#f9fbff]
          border-t border-slate-200
          flex flex-col gap-3
        "
        style={{
          overflow: 'hidden',
          pointerEvents: isHovered ? 'auto' : 'none',
        }}
        initial={{ height: '0%', opacity: 0, y: 16 }}
        animate={{
          height: isHovered ? '50%' : '0%',
          opacity: isHovered ? 1 : 0,
          y: isHovered ? 0 : 16,
        }}
        transition={{ type: 'spring', stiffness: 260, damping: 26 }}
      >
        {/* ROW 1: text + price + colours */}
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

        {/* ROW 2: sizes (left) + qty (right) */}
        <div className="flex items-start justify-between gap-3">
          {/* Sizes */}
          <div className="flex-1">
            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500 mb-1">
              Sizes
            </p>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(sizes).map(([size, stock]) => {
                const disabled = stock <= 0
                const isSelected = selectedSize === size
                return (
                  <button
                    key={size}
                    type="button"
                    disabled={disabled}
                    onClick={() => onSizeChange(size)}
                    className={`
                      px-2.5 py-1.5 rounded-full border text-[11px] min-w-[40px]
                      ${
                        disabled
                          ? 'border-slate-200 text-slate-400 bg-slate-100 cursor-not-allowed line-through'
                          : isSelected
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-300 bg-white text-slate-800 hover:border-slate-600'
                      }
                    `}
                  >
                    {size}
                    <span className="ml-1 text-[9px] text-slate-400">
                      ({stock})
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Quantity */}
          <div className="w-[34%] flex flex-col">
            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500 mb-1">
              Qty
            </p>
            <div className="flex items-center justify-between rounded-full border border-slate-400 bg-white px-2 py-1">
              <button
                type="button"
                onClick={handleMinus}
                className="h-6 w-6 flex items-center justify-center text-slate-700 hover:bg-slate-100 rounded-full text-xs"
              >
                –
              </button>
              <span className="text-[12px] font-medium min-w-[1.5rem] text-center">
                {quantity}
              </span>
              <button
                type="button"
                onClick={handlePlus}
                className="h-6 w-6 flex items-center justify-center text-slate-700 hover:bg-slate-100 rounded-full text-xs"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Swipe bar (kept at bottom) */}
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
