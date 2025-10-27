'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus } from 'lucide-react'

export default function FluidHeroButtons() {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="relative flex flex-col items-center space-y-4">
      {/* Toggle Button */}
      <motion.button
        onClick={() => setExpanded(!expanded)}
        className="w-12 h-12 rounded-full flex items-center justify-center backdrop-blur-md bg-white/10 border border-white/20 shadow-md text-gray-800 dark:text-white hover:scale-105 transition-transform"
        whileTap={{ scale: 0.9 }}
      >
        <Plus size={20} />
      </motion.button>

      {/* Expanding Fluid Button */}
      <AnimatePresence>
        {expanded && (
          <motion.button
            initial={{ opacity: 0, y: -10, scale: 0.6 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.6 }}
            transition={{ duration: 0.4, ease: [0.18, 0.89, 0.32, 1.28] }}
            className="px-6 py-2 rounded-full backdrop-blur-md bg-white/10 border border-white/30 shadow-[inset_1px_1px_4px_rgba(255,255,255,0.4)] text-sm text-gray-800 dark:text-white hover:scale-105 transition"
          >
            Join Membership
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}
