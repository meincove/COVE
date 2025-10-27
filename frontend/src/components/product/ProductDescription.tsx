'use client'

import { X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

type ProductDescriptionProps = {
  show: boolean
  onClose: () => void
  name: string
  description: string
  material: string
  tier: string
  type: string
  fit: string
}

export default function ProductDescription({
  show,
  onClose,
  name,
  description,
  material,
  tier,
  type,
  fit,
}: ProductDescriptionProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed bottom-0 left-0 w-full h-[80vh] bg-white z-50 px-8 py-6 overflow-y-scroll rounded-t-2xl shadow-2xl text-black"
        >
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Product Details</h2>
            <button onClick={onClose} aria-label="Close">
              <X size={22} />
            </button>
          </div>

          <div className="space-y-4">
            <p className="text-lg font-medium">{name}</p>
            <p className="text-sm text-gray-700">{description}</p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-6">
              <div>
                <h4 className="text-xs text-gray-500 uppercase">Material</h4>
                <p className="text-sm">{material}</p>
              </div>
              <div>
                <h4 className="text-xs text-gray-500 uppercase">Tier</h4>
                <p className="text-sm">{tier}</p>
              </div>
              <div>
                <h4 className="text-xs text-gray-500 uppercase">Fit</h4>
                <p className="text-sm">{fit}</p>
              </div>
              <div>
                <h4 className="text-xs text-gray-500 uppercase">Type</h4>
                <p className="text-sm">{type}</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
