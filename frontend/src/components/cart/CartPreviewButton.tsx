// src/components/cart/CartPreviewButton.tsx
'use client'

import { useState, useMemo } from 'react'
import { ShoppingBag } from 'lucide-react'
import CartMiniModal from './CartMiniModal'
import { useCartStore } from '@/src/store/cartStore'

export default function CartPreviewButton() {
  const [open, setOpen] = useState(false)
  const items = useCartStore((s) => s.items)

  const itemCount = useMemo(
    () => items.reduce((sum, it) => sum + it.quantity, 0),
    [items]
  )

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="
          relative
          flex items-center gap-2
          rounded-full px-3 py-1.5
          bg-black/5 hover:bg-black/10
          transition
        "
      >
        <ShoppingBag size={18} className="text-slate-800" />
        <span className="text-xs font-medium text-slate-900">Cart</span>
        {itemCount > 0 && (
          <span
            className="
              ml-1 inline-flex items-center justify-center
              min-w-[20px] h-[20px]
              rounded-full bg-slate-900 text-[11px] text-white
              px-1
            "
          >
            {itemCount}
          </span>
        )}
      </button>

      {open && <CartMiniModal onClose={() => setOpen(false)} />}
    </>
  )
}
