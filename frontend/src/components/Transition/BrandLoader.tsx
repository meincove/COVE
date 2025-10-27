'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export default function BrandLoader({ onComplete }: { onComplete: () => void }) {
  const [startExit, setStartExit] = useState(false)

  useEffect(() => {
    const entryTimeout = setTimeout(() => setStartExit(true), 1000) // Show for 1s
    const exitTimeout = setTimeout(onComplete, 1800) // Exit after animation

    return () => {
      clearTimeout(entryTimeout)
      clearTimeout(exitTimeout)
    }
  }, [onComplete])

  return (
    <AnimatePresence>
      {!startExit && (
        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[99] flex items-center justify-center bg-black text-white"
        >
          <motion.h1
            initial={{ scale: 1.4, y: 0 }}
            animate={{ scale: 1, y: '-40vh' }}
            transition={{ duration: 0.8, ease: 'easeInOut' }}
            className="text-4xl font-bold tracking-widest"
          >
            COVE
          </motion.h1>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
