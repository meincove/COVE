// src/components/cart/CartMiniModal.tsx
'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { useCartStore } from '@/store/cartStore'

interface CartMiniModalProps {
  onClose: () => void
}

export default function CartMiniModal({ onClose }: CartMiniModalProps) {
  const { items, removeItem, clearCart } = useCartStore()

  const subtotal = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  )

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[80] flex items-center justify-end bg-black/40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          initial={{ x: 320, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 320, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 26 }}
          className="
            relative
            w-full max-w-sm h-full
            bg-slate-950 text-slate-50
            shadow-2xl
            flex flex-col
          "
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-xs tracking-[0.18em] uppercase text-slate-400">
                Cart
              </span>
              <span className="text-xs text-slate-500">
                ({items.length})
              </span>
            </div>
            <button
              onClick={onClose}
              className="h-7 w-7 rounded-full bg-slate-800 flex items-center justify-center"
            >
              <X size={16} />
            </button>
          </div>

          {/* Items list */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
            {items.length === 0 && (
              <p className="text-xs text-slate-400 px-1 py-4">
                Your cart is empty. Items added via catalog / product page / Cove
                AI will appear here.
              </p>
            )}

            {items.map((item) => (
              <div
                key={`${item.variantId}-${item.size}`}
                className="flex gap-3 rounded-lg bg-slate-900/60 border border-slate-800 p-2"
              >
                {/* Thumbnail */}
                <div className="relative h-16 w-16 rounded-md bg-slate-800 overflow-hidden flex-shrink-0">
                  {item.imageUrl && (
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="h-full w-full object-contain"
                    />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <p className="text-[11px] font-semibold leading-tight">
                      {item.name}
                    </p>
                    <p className="text-[10px] text-slate-400">
                      {item.tier} · {item.type}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      Size {item.size}
                      {item.colorName && <> · {item.colorName}</>}
                    </p>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-[11px] font-semibold">
                      €{item.price.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Qty: {item.quantity}
                    </span>
                  </div>
                </div>

                {/* Remove */}
                <button
                  onClick={() => removeItem(item.variantId, item.size)}
                  className="self-start text-[10px] text-slate-400 hover:text-red-400"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-800 px-4 py-3 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-xs text-slate-400">Subtotal</span>
              <span className="text-sm font-semibold">
                €{subtotal.toFixed(2)}
              </span>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={clearCart}
                disabled={items.length === 0}
                className="
                  flex-1 text-[11px] rounded-full border border-slate-700
                  px-3 py-2 text-slate-300
                  disabled:border-slate-900 disabled:text-slate-600
                  hover:bg-slate-900 transition
                "
              >
                Clear cart
              </button>
              <button
                type="button"
                disabled={items.length === 0}
                className="
                  flex-1 text-[11px] rounded-full bg-slate-100 text-slate-900
                  px-3 py-2 font-semibold
                  disabled:bg-slate-700 disabled:text-slate-400
                  hover:bg-white transition
                "
                // hook this up to your /checkoutpage route if you want
                // onClick={() => router.push('/checkoutpage')}
              >
                View checkout
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
