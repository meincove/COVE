


'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Search } from 'lucide-react'
import { useState } from 'react'
import Link from 'next/link'

export default function SearchBar() {
  const [isExpanded, setIsExpanded] = useState(false)
  const [query, setQuery] = useState('')

  return (
    <div
      className="relative flex justify-center items-center w-full"
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
    >
      <motion.div
        animate={{
          width: isExpanded ? 500 : 160,
          height: isExpanded ? 220 : 40,
          borderRadius: isExpanded ? 20 : 9999,
        }}
        transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
        className="bg-white border border-gray-300 shadow-md overflow-hidden px-4 py-2 flex flex-col items-start justify-start absolute"
        style={{ top: 0 }}
      >
        {/* Top Input Area */}
        <motion.div
          className="flex items-center gap-2 w-full"
          initial={false}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2, delay: 0.1 }}
        >
          <Search className="w-4 h-4 text-gray-500" />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search Cove..."
            className="w-full bg-transparent outline-none text-gray-900 placeholder-gray-500"
          />
        </motion.div>

        {/* Expanded Content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              className="pt-4 w-full text-gray-800 text-sm"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25, delay: 0.3 }}
            >
              <div className="mb-2">
                <span className="font-semibold text-gray-600">Recent Searches:</span>
                <div className="flex gap-3 mt-1">
                  <Link href="/catalog/leather" className="hover:underline">Leather Jacket</Link>
                  <Link href="/catalog/winter" className="hover:underline">Winter Wear</Link>
                </div>
              </div>

              <div className="mb-2">
                <span className="font-semibold text-gray-600">Hot Deals:</span>
                <div className="flex gap-3 mt-1">
                  <Link href="/deals/today" className="hover:underline">Today’s Picks</Link>
                  <Link href="/deals/essentials" className="hover:underline">Essentials</Link>
                </div>
              </div>

              <div>
                <span className="font-semibold text-gray-600">Cove Tiers:</span>
                <div className="flex gap-3 mt-1">
                  <Link href="/catalog/everydays-premium" className="hover:underline">Everydays Premium</Link>
                  <Link href="/catalog/originals" className="hover:underline">Originals</Link>
                  <Link href="/catalog/designer" className="hover:underline">Designer</Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}
