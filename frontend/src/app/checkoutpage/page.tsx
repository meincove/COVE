'use client'

import Image from 'next/image'
import { useCartStore } from '@/src/store/cartStore'
import { Minus, Plus, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { CartItem } from '@/types/cart'
import { CheckoutButton } from "@/src/components/checkout/CheckoutButton";

export default function CheckoutPage() {
  const items = useCartStore((state) => state.items)
  const updateItemQuantity = useCartStore((state) => state.updateItemQuantity)
  const removeItem = useCartStore((state) => state.removeItem)
  const clearCart = useCartStore((state) => state.clearCart)
  const router = useRouter()

  const total = items.reduce((sum: number, item: CartItem) => {
    return sum + item.price * item.quantity
  }, 0)

  return (
    <div className="min-h-screen bg-white text-black px-6 py-10 max-w-4xl mx-auto">

      <button
  onClick={() => router.back()}
  className="mb-4 text-sm text-gray-700 hover:underline"
>
  ← Back
</button>


      <h1 className="text-2xl font-bold mb-8">Your Cart</h1>

      {items.length === 0 ? (
        <p className="text-gray-600">Your cart is empty.</p>
      ) : (
        <>
          <div className="space-y-8">
            {items.map((item) => (
              <div
                key={`${item.variantId}-${item.colorName}-${item.size}`}
                className="flex gap-4 items-center border-b pb-4"
              >
                <Image
                  src={item.imageUrl}
                  alt={item.name}
                  width={100}
                  height={100}
                  className="rounded-lg object-cover"
                />

                <div className="flex-1">
                  <h2 className="font-semibold text-lg">{item.name}</h2>
                  <p className="text-sm text-gray-700">
                    {item.type} | Size: {item.size} | Color: {item.colorName}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    € {item.price.toFixed(2)}
                  </p>

                  {/* Quantity Selector */}
                  <div className="flex items-center mt-2 border border-gray-400 rounded-full w-max overflow-hidden">
                    <button
                      className="px-2 py-1 text-black hover:bg-black/10"
                      onClick={() =>
                        updateItemQuantity(item.variantId, item.size, Math.max(1, item.quantity - 1))
                      }
                    >
                      <Minus size={16} />
                    </button>
                    <span className="px-4">{item.quantity}</span>
                    <button
                      className="px-2 py-1 text-black hover:bg-black/10"
                      onClick={() =>
                        updateItemQuantity(item.variantId, item.size, item.quantity + 1)
                      }
                    >
                      <Plus size={16} />
                    </button>
                  </div>

                  {/* Remove Button */}
                  <button
                    className="mt-2 text-sm text-red-600 hover:underline"
                    onClick={() => removeItem(item.variantId, item.size)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Remove All Button */}
          <button
            className="w-full mt-8 py-3 border border-red-600 text-red-600 font-semibold rounded-full hover:bg-red-50"
            onClick={() => {
              const confirmClear = confirm('Are you sure you want to remove all items?')
              if (confirmClear) clearCart()
            }}
          >
            Remove All
          </button>
        </>
      )}

      {items.length > 0 && (
        <div className="mt-10">
          <div className="flex justify-between text-lg font-semibold">
            <span>Total:</span>
            <span>€ {total.toFixed(2)}</span>
          </div>

          <CheckoutButton />

        </div>
      )}
    </div>
  )
}
