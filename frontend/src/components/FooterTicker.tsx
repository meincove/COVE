'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

const tickerMessages = [
  "New arrivals on Cove Originals. Members special discount up to 55%.",
  "Fleece hoodie is the best seller. Grab for €39.99, only 2 units left!",
  "Open Vault closing around 13:00:00 ⏳",
]

export default function FooterTicker() {
  const [currentText, setCurrentText] = useState(tickerMessages[0])
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex(prev => (prev + 1) % tickerMessages.length)
    }, 8000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    setCurrentText(tickerMessages[index])
  }, [index])

  return (
    <footer className="fixed bottom-0 left-0 w-full bg-white/1 backdrop-blur-md border-t border-white/10 text-white py-2 px-4 overflow-hidden z-50">
  {/* grain layer if needed */}
  <div className="absolute inset-0 pointer-events-none grain-overlay" />
  
  <motion.div
    key={currentText}
    className="whitespace-nowrap text-sm font-medium relative z-10"
    initial={{ x: '100%' }}
    animate={{ x: '-100%' }}
    transition={{ duration: 12, ease: 'linear' }}
  >
    {currentText}
  </motion.div>
</footer>

  )
}
