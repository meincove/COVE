
'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { ColorTheme } from '@/utils/colorThemes'

interface CatalogCardBaseProps {
  layoutKey: string | number
  name: string
  images: string[]
  tier: string
  price: number
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
}

export default function CatalogCardBase({
  layoutKey,
  name,
  images,
  tier,
  price,
  colorSwatches,
  theme,
  selectedVariantId,
  onSwipeBarClick,
  onImageDrag,
  isActive = true,
}: CatalogCardBaseProps) {
  const layoutId = `catalog-card-${layoutKey}`
  const [isArcOpen, setIsArcOpen] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  const selectedSwatch = colorSwatches.find((c) => c.isSelected)
  const otherSwatches = colorSwatches.filter((c) => !c.isSelected)

  const frontImage = images.find((img) => img.includes('front')) ?? images[0]
  const backImage = images.find((img) => img.includes('back')) ?? images[0]
  const currentImage = isHovered ? backImage : frontImage

  return (
    <motion.div
      layoutId={layoutId}
      className={`relative flex flex-col items-center justify-between rounded-2xl shadow-xl overflow-hidden ${
        !isActive ? 'pointer-events-none opacity-60 z-10' : 'z-50'
      }`}
      style={{ width: '340px', height: '420px' }}
    >
      {/* 🔮 Background */}
      <motion.div
        layoutId={`card-bg-${layoutKey}`}
        className={`absolute inset-0 z-0 bg-gradient-to-br ${theme.gradient} ${theme.bgAnimationClass}`}
      />

      {/* 🖼️ Image */}
      <motion.div
        layoutId={`${layoutId}-image`}
        className="w-full h-[80%] flex items-center justify-center"
        draggable={isActive}
        onDragEnd={(e) => {
          e.preventDefault()
          if (isActive && onImageDrag) onImageDrag()
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <AnimatePresence mode="wait">
          <motion.img
            key={currentImage}
            src={`/clothing-images/${currentImage}`}
            alt={name}
            className="object-contain max-h-full max-w-full relative z-10"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.4 }}
          />
        </AnimatePresence>
      </motion.div>

      {/* 📝 Bottom Section */}
      <motion.div
        layoutId={`${layoutId}-text`}
        className="w-full h-[20%] px-4 py-2 flex flex-col justify-between items-start z-10"
      >
        {/* 💸 Price + Arc Color Picker */}
        <div className="w-full flex justify-between items-center mb-1">
          <div className={`text-[13px] font-medium ${theme.textColor}`}>
            €{price.toFixed(2)}
          </div>

          {colorSwatches.length > 1 && (
            <div className="relative flex items-center justify-center">
              {/* Toggle Button showing selected color */}
              <div
                onClick={() => setIsArcOpen((prev) => !prev)}
                className="w-6 h-6 rounded-full border-2 border-black flex items-center justify-center cursor-pointer z-30"
                style={{
                  position: 'relative',
                  backgroundColor: selectedSwatch?.hex || 'white',
                }}
                title={selectedSwatch?.colorName ?? ''}
              >
                <div className="w-[10px] h-[10px] bg-black rounded-full" />
              </div>

              {/* Arc Swatches */}
              <AnimatePresence>
                {isArcOpen && (
                  <motion.div
                    className="absolute right-0 top-0 origin-bottom-right p-1 z-20"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    {otherSwatches.map((c, i) => {
                      const angle = (i / (otherSwatches.length - 1 || 1)) * 90
                      const radius = 60
                      const x = Math.cos((angle * Math.PI) / 180) * radius
                      const y = -Math.sin((angle * Math.PI) / 180) * radius

                      return (
                        <motion.div
                          key={i}
                          className="absolute"
                          style={{
                            left: 0,
                            top: 0,
                            transform: `translate(${x}px, ${y}px)`,
                          }}
                          initial={{ opacity: 0, scale: 0.5 }}
                          animate={{
                            opacity: 1,
                            scale: 1,
                            transition: { delay: i * 0.05 },
                          }}
                          exit={{ opacity: 0, scale: 0.5 }}
                        >
                          <div
                            onClick={() => {
                              c.onClick()
                              setIsArcOpen(false)
                            }}
                            title={c.colorName ?? ''}
                            className={`w-5 h-5 rounded-full border-[1.5px] cursor-pointer hover:scale-110 transition-transform ${
                              c.isSelected ? 'ring-2 ring-white' : ''
                            }`}
                            style={{ backgroundColor: c.hex }}
                          />
                        </motion.div>
                      )
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* 🏷️ Tier + Brand */}
        <div className="w-full flex flex-col items-start justify-start">
          <motion.span
            layoutId={`${layoutId}-title`}
            className={`font-bold text-sm tracking-wide ${theme.textColor}`}
          >
            {tier.toUpperCase()}
          </motion.span>
          <motion.span className={`text-[10px] opacity-70 ${theme.textColor}`}>
            cove
          </motion.span>
        </div>

        {/* 🧾 Swipe Bar */}
        <div className="absolute bottom-1 left-0 w-full flex justify-center">
          <motion.div
            layoutId={`${layoutId}-swipebar`}
            className="w-[30px] h-[6px] rounded-full cursor-pointer"
            onClick={isActive ? onSwipeBarClick : undefined}
            style={{ backgroundColor: '#7165e5' }}
            initial={{ y: 0 }}
            animate={{
              y: [-2, 0, -2],
              boxShadow: '0 0 8px rgba(255, 255, 255, 0.6)',
              transition: {
                duration: 1.2,
                repeat: Infinity,
                repeatType: 'reverse',
                ease: 'easeInOut',
              },
            }}
          />
        </div>
      </motion.div>
    </motion.div>
  )
}
