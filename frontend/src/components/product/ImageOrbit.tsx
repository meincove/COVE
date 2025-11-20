
'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface ImageOrbitProps {
  images: string[]
  currentIndex: number
  setCurrentIndex: (index: number) => void
}

export default function ImageOrbit({
  images,
  currentIndex,
  setCurrentIndex,
}: ImageOrbitProps) {
  const handlePrev = () => {
    const newIndex = currentIndex === 0 ? images.length - 1 : currentIndex - 1
    setCurrentIndex(newIndex)
  }

  const handleNext = () => {
    const newIndex = currentIndex === images.length - 1 ? 0 : currentIndex + 1
    setCurrentIndex(newIndex)
  }

  return (
    <div className="bg-transparent relative flex items-center justify-center w-full h-[90vh] px-4 py-4 overflow-visible ">
      {/* Image Viewer */}
      <div className="relative z-10 w-full max-w-[90vw] h-full flex items-center justify-center  mt-15">
        <AnimatePresence mode="wait">
          <motion.img
            key={images[currentIndex]}
            src={`/clothing-images/${images[currentIndex]}`}
            alt={`Product ${currentIndex + 1}`}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.5 }}
            className="object-contain w-full h-full"
          />
        </AnimatePresence>
      </div>

      {/* Navigation Buttons */}
      <button
        onClick={handlePrev}
        className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white z-20"
      >
        <ChevronLeft size={24} />
      </button>
      <button
        onClick={handleNext}
        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white z-20"
      >
        <ChevronRight size={24} />
      </button>
    </div>
  )
}
