'use client'

import Image from 'next/image'
import { useCartStore } from '@/store/cartStore'
import { Minus, Plus, Trash2, ArrowLeft, Sparkles, ShieldCheck } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { CartItem } from '@/types/cart'
import { CheckoutButton } from "@/components/checkout/CheckoutButton";
import { motion, AnimatePresence } from 'framer-motion'

export default function CheckoutPage() {
  const items = useCartStore((state) => state.items)
  const updateItemQuantity = useCartStore((state) => state.updateItemQuantity)
  const removeItem = useCartStore((state) => state.removeItem)
  const clearCart = useCartStore((state) => state.clearCart)
  const router = useRouter()

  const subtotal = items.reduce((sum: number, item: CartItem) => {
    return sum + item.price * item.quantity
  }, 0)

  // Mock Tax/Shipping for display (Real calc happens in Stripe usually)
  const shipping = subtotal > 150 ? 0 : 15.00
  const total = subtotal + shipping

  if (items.length === 0) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center space-y-6 bg-white">
        <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-4">
          <Sparkles className="text-gray-300 w-10 h-10" />
        </div>
        <h1 className="text-2xl font-bold">Your cart is empty</h1>
        <p className="text-gray-500">Looks like you haven't found your style yet.</p>
        <button
          onClick={() => router.push('/shopping')}
          className="px-8 py-3 bg-black text-white rounded-full font-bold hover:scale-105 transition-transform"
        >
          Explore Catalog
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#fafafa] text-black pt-32 pb-20">
      <div className="max-w-[1400px] mx-auto px-6">

        {/* Header */}
        <div className="flex items-center gap-4 mb-10">
          <button
            onClick={() => router.back()}
            className="p-2 bg-white rounded-full border border-gray-200 hover:bg-gray-50 transition"
          >
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-3xl font-black uppercase tracking-tight">Your Bag <span className="text-gray-400 font-medium text-xl ml-2 normal-case">({items.length} items)</span></h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">

          {/* LEFT: Item List */}
          <div className="lg:col-span-8 space-y-6">
            <AnimatePresence>
              {items.map((item) => (
                <motion.div
                  key={`${item.variantId}-${item.colorName}-${item.size}`}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex gap-6 group hover:border-gray-200 transition-colors"
                >
                  {/* Image */}
                  <div className="relative w-32 aspect-[3/4] bg-gray-100 rounded-xl overflow-hidden flex-shrink-0">
                    <Image
                      src={item.imageUrl}
                      alt={item.name}
                      fill
                      className="object-cover"
                    />
                  </div>

                  {/* Details */}
                  <div className="flex-1 flex flex-col justify-between py-1">
                    <div>
                      <div className="flex justify-between items-start">
                        <div>
                          <h2 className="font-bold text-xl mb-1">{item.name}</h2>
                          <p className="text-sm text-gray-500 font-medium uppercase tracking-wider">{item.type}</p>
                        </div>
                        <p className="font-bold text-lg">€{item.price.toFixed(2)}</p>
                      </div>

                      <div className="flex gap-3 mt-4">
                        <span className="px-3 py-1 bg-gray-50 rounded-lg text-xs font-semibold uppercase text-gray-600 border border-gray-100">
                          Size: {item.size}
                        </span>
                        <div className="px-3 py-1 bg-gray-50 rounded-lg text-xs font-semibold uppercase text-gray-600 border border-gray-100 flex items-center gap-2">
                          Color: {item.colorName}
                          <span className="w-3 h-3 rounded-full border border-black/10" style={{ backgroundColor: item.colorName }} />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between items-end mt-4">
                      {/* QTY Control */}
                      <div className="flex items-center gap-4 bg-gray-50 rounded-full px-4 py-2 border border-gray-100">
                        <button
                          className="hover:text-black text-gray-400 transition ml-[-4px]"
                          onClick={() => updateItemQuantity(item.variantId, item.size, Math.max(1, item.quantity - 1))}
                        >
                          <Minus size={14} />
                        </button>
                        <span className="font-bold text-sm min-w-[1.5em] text-center">{item.quantity}</span>
                        <button
                          className="hover:text-black text-gray-400 transition mr-[-4px]"
                          onClick={() => updateItemQuantity(item.variantId, item.size, item.quantity + 1)}
                        >
                          <Plus size={14} />
                        </button>
                      </div>

                      <button
                        className="text-sm font-semibold text-red-500 hover:text-red-600 flex items-center gap-1.5 opacity-60 hover:opacity-100 transition"
                        onClick={() => removeItem(item.variantId, item.size)}
                      >
                        <Trash2 size={16} /> Remove
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            <button
              className="text-sm text-red-500 font-semibold hover:underline mt-4 pl-2"
              onClick={() => {
                if (confirm("Clear cart?")) clearCart()
              }}
            >
              Clear entire cart
            </button>

          </div>

          {/* RIGHT: Summary & Checkout */}
          <div className="lg:col-span-4 sticky top-32">

            {/* AI Insight Card - Unique Feature */}
            <div className="bg-gradient-to-br from-[#1a1a1a] to-black text-white p-6 rounded-3xl shadow-xl mb-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-3 opacity-10">
                <Sparkles size={100} />
              </div>
              <div className="flex items-center gap-2 mb-3 text-purple-300">
                <Sparkles size={18} />
                <span className="text-xs font-bold uppercase tracking-widest">Cove AI Analysis</span>
              </div>
              <p className="text-sm font-medium leading-relaxed opacity-90">
                Your styling selection is cohesive. The <span className="text-white font-bold decoration-slice bg-gradient-to-r from-purple-500/50 to-blue-500/50 px-1 rounded">Minimalist Pants</span> pair perfectly with the chosen accessories.
              </p>
              <div className="mt-4 flex gap-2">
                <div className="px-2 py-1 bg-white/10 rounded-md text-[10px] font-bold uppercase backdrop-blur-sm">Trend Match: 98%</div>
                <div className="px-2 py-1 bg-white/10 rounded-md text-[10px] font-bold uppercase backdrop-blur-sm">Sustainable</div>
              </div>
            </div>

            {/* Order Summary */}
            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-[0_20px_40px_-20px_rgba(0,0,0,0.1)]">
              <h2 className="text-xl font-bold mb-6">Order Summary</h2>

              <div className="space-y-4 mb-6 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Subtotal</span>
                  <span className="font-medium text-black">€{subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Estimated Shipping</span>
                  <span className="font-medium text-black">{shipping === 0 ? "Free" : `€${shipping.toFixed(2)}`}</span>
                </div>
                {shipping === 0 && (
                  <div className="text-xs text-green-600 font-medium text-right">
                    Free shipping applied (Orders over €150)
                  </div>
                )}
              </div>

              <div className="border-t border-dashed border-gray-200 py-4 mb-2">
                <div className="flex justify-between text-xl font-black">
                  <span>Total</span>
                  <span>€{total.toFixed(2)}</span>
                </div>
              </div>

              <CheckoutButton className="w-full" />

              <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-400">
                <ShieldCheck size={14} />
                <span>Secure SSL Encryption</span>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}

