// 'use client'

// import { useEffect, useState } from 'react'
// import { motion, AnimatePresence } from 'framer-motion'
// import { ChevronLeft, ChevronRight } from 'lucide-react'

// interface ImageOrbitProps {
//   images: string[]
//   currentIndex: number
//   setCurrentIndex: (index: number) => void
// }

// export default function ImageOrbit({
//   images,
//   currentIndex,
//   setCurrentIndex,
// }: ImageOrbitProps) {
//   const [swapped, setSwapped] = useState(false)

//   const handlePrev = () => {
//     setSwapped(prev => !prev)
//     const newIndex = currentIndex === 0 ? images.length - 1 : currentIndex - 1
//     setCurrentIndex(newIndex)
//   }

//   const handleNext = () => {
//     setSwapped(prev => !prev)
//     const newIndex = currentIndex === images.length - 1 ? 0 : currentIndex + 1
//     setCurrentIndex(newIndex)
//   }

//   return (
//     <div className="relative flex items-center justify-center px-4 py-8 w-full overflow-visible bg-black">
//       {/* Orbit SVG wrapper allowing overflow */}
//       <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[180%] h-[180%] z-0 overflow-visible pointer-events-none" >
//         <svg
//           className="w-full h-full overflow-visible"
//           viewBox="0 0 100 100"
//           preserveAspectRatio="none"
//         >
//           {/* Orbit A */}
//           <motion.ellipse
//             cx="48"
//             cy="48"
//             rx="60"
//             ry="28"
//             stroke="#ff6b6b"
//             strokeWidth="0.3"
//             fill="none"
//             animate={{
//               transform: `rotate(${swapped ? 30 : 0}deg)`,
//             }}
//             transition={{ duration: 0.8, ease: 'easeInOut' }}
//             style={{
//               transformBox: 'fill-box',
//               transformOrigin: 'center',
//             }}
//           />

//           {/* Orbit B */}
//           <motion.ellipse
//             cx="38"
//             cy="38"
//             rx="46"
//             ry="18"
//             stroke="#ff6b6b"
//             strokeWidth="0.3"
//             fill="none"
//             animate={{
//               transform: `rotate(${swapped ? 0 : 30}deg)`,
//             }}
//             transition={{ duration: 0.8, ease: 'easeInOut' }}
//             style={{
//               transformBox: 'fill-box',
//               transformOrigin: 'center',
//             }}
//           />
//         </svg>
//       </div>

//       {/* Image Viewer */}
//       <div className="relative z-10 w-full max-w-[500px] aspect-[4/5] flex items-center justify-center bg-gray-400">
//         <AnimatePresence mode="wait">
//           <motion.img
//             key={images[currentIndex]}
//             src={`/clothing-images/${images[currentIndex]}`}
//             alt={`Product ${currentIndex + 1}`}
//             initial={{ opacity: 0, scale: 0.95 }}
//             animate={{ opacity: 1, scale: 1 }}
//             exit={{ opacity: 0, scale: 1.05 }}
//             transition={{ duration: 0.5 }}
//             className="object-contain w-full h-full rounded-xl"
//           />
//         </AnimatePresence>
//       </div>

//       {/* Navigation Buttons */}
//       <button
//         onClick={handlePrev}
//         className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white z-20"
//       >
//         <ChevronLeft size={24} />
//       </button>
//       <button
//         onClick={handleNext}
//         className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white z-20"
//       >
//         <ChevronRight size={24} />
//       </button>
//     </div>
//   )
// }

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
