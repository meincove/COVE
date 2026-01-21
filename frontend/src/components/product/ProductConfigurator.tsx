// src/components/product/ProductConfigurator.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Minus, Plus, Heart, ChevronDown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import clsx from 'clsx'
import { useCartStore } from '@/src/store/cartStore'
import { trackAddToCart } from '@/src/utils/analytics'

type Color = {
  colorName: string
  hex: string
  variantId: string
  images: string[]
}

type ProductConfiguratorProps = {
  sizes: Record<string, number>
  colors: Color[]
  defaultColor: Color
  variantId: string
  selectedColorIndex: number
  setSelectedColorIndex: (i: number) => void
  name: string
  description: string
  material: string
  tier: string
  type: string
  fit: string
  price: number

  defaultSelectedSize?: string | null
  initialQuantity?: number
}

// Simple Accordion for extra details
function Accordion({ title, children }: { title: string, children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-black/10 last:border-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between py-4 text-sm font-medium text-black hover:text-black/70 transition-colors"
      >
        {title}
        <ChevronDown size={16} className={clsx("transition-transform", open && "rotate-180")} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="pb-4 text-xs text-black/60 leading-relaxed">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function ProductConfigurator({
  sizes,
  colors,
  defaultColor,
  variantId,
  selectedColorIndex,
  setSelectedColorIndex,
  name,
  description,
  material,
  tier,
  type,
  fit,
  price,
  defaultSelectedSize,
  initialQuantity = 0,
}: ProductConfiguratorProps) {
  const [selectedSize, setSelectedSize] = useState<string | null>(
    defaultSelectedSize ?? null
  )
  const [quantity, setQuantity] = useState<number>(initialQuantity)
  const [liked, setLiked] = useState(false)
  const [stockAlert, setStockAlert] = useState('')
  const router = useRouter()

  const selectedColor = colors[selectedColorIndex]
  const stockLeft = selectedSize ? sizes[selectedSize] ?? 0 : 0

  const { addItem } = useCartStore()
  const isCurrentItemInCart = useCartStore
    .getState()
    .isInCart(selectedColor.variantId, selectedSize ?? '')

  useEffect(() => {
    if (defaultSelectedSize) {
      setSelectedSize(defaultSelectedSize)
    }
  }, [defaultSelectedSize])

  useEffect(() => {
    setQuantity(initialQuantity)
    setStockAlert('')
  }, [initialQuantity, selectedSize])

  const handleAddToCart = () => {
    if (!selectedSize) {
      setStockAlert('Please select a size.')
      return
    }

    if (quantity <= 0) {
      setStockAlert('Please select at least 1 piece.')
      return
    }

    if (quantity > stockLeft) {
      setStockAlert('Maximum piece reached')
      return
    }

    addItem({
      productId: `${name}-${tier}-${material}-${variantId}`,
      variantId: selectedColor.variantId,
      name,
      type,
      tier,
      size: selectedSize,
      color: selectedColor.hex,
      colorName: selectedColor.colorName,
      quantity,
      price,
      imageUrl: selectedColor.images[1] || selectedColor.images[0],
      material,
    })

    trackAddToCart(selectedColor.variantId, {
      product_name: name,
      color: selectedColor.colorName,
      size: selectedSize,
      quantity,
      price,
      tier,
      type,
    })

    setStockAlert('')
  }

  const decQuantity = () => {
    setStockAlert('')
    setQuantity((prev) => Math.max(0, prev - 1))
  }

  const incQuantity = () => {
    if (!selectedSize) {
      setStockAlert('Select a size first.')
      return
    }

    const max = stockLeft
    if (max <= 0) {
      setStockAlert('No stock available for this size.')
      return
    }

    setQuantity((prev) => {
      if (prev >= max) {
        setStockAlert('Maximum piece reached')
        return prev
      }
      setStockAlert('')
      return prev + 1
    })
  }

  const fewPiecesLeft =
    selectedSize && stockLeft > 0 && stockLeft < 10

  return (
    <div className="w-full flex flex-col gap-8">
      {/* Colors */}
      <div className="space-y-4">
        <p className="text-xs uppercase font-bold text-black/50 tracking-widest">
          Available Colors
        </p>
        <div className="flex flex-wrap gap-3">
          {colors.map((color, i) => (
            <button
              key={color.variantId || `color-${i}`}
              onClick={() => {
                setSelectedColorIndex(i)
                setStockAlert('')
              }}
              className="transition-all duration-200 hover:scale-105 rounded-3xl"
              title={color.colorName}
            >
              <div
                className={clsx(
                  "w-12 h-10 rounded-2xl relative overflow-hidden flex items-center justify-center shadow-sm",
                  selectedColorIndex === i
                    ? "border-2 border-black/50"
                    : "border border-black/5"
                )}
              >
                <div className="absolute inset-0" style={{ backgroundColor: color.hex }} />
                {/* Subtle gloss */}
                <div className="absolute inset-0 bg-gradient-to-tr from-black/0 via-white/10 to-white/20" />
              </div>
            </button>
          ))}
        </div>
        <p className="text-xs text-black/60 font-medium ml-1">
          Selected: <span className="text-black font-bold">{selectedColor.colorName}</span>
        </p>
      </div>

      {/* Sizes */}
      <div className="space-y-4">
        <div className="flex justify-between items-baseline">
          <p className="text-xs uppercase font-bold text-black/50 tracking-widest">Select Size</p>
          <button className="text-[10px] underline text-black/40 hover:text-black">Size Guide</button>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {Object.entries(sizes).map(([size, stock]) => {
            const isSelected = selectedSize === size
            const isOut = stock <= 0

            return (
              <button
                key={size}
                disabled={isOut}
                onClick={() => {
                  if (isOut) return
                  setSelectedSize(size)
                  setQuantity(0)
                  setStockAlert('')
                }}
                className={clsx(
                  'h-12 rounded-3xl text-sm font-bold transition-all duration-200 shadow-sm flex items-center justify-center',
                  isSelected
                    ? 'bg-black text-white shadow-md'
                    : 'bg-gray-100 text-black hover:bg-gray-200',
                  isOut && 'opacity-30 bg-gray-50 cursor-not-allowed line-through shadow-none'
                )}
              >
                {size}
              </button>
            )
          })}
        </div>
        {fewPiecesLeft && (
          <p className="text-xs text-red-600 font-medium animate-pulse">
            🔥 Only {stockLeft} left in stock for this size
          </p>
        )}
      </div>

      {/* Action Area */}
      <div className="space-y-4 pt-4 border-t border-black/5">
        {stockAlert && (
          <div className="p-3 bg-red-50 text-red-600 text-xs font-medium rounded-lg">
            {stockAlert}
          </div>
        )}

        <div className="flex gap-3">
          {/* Quantity Stepper */}
          <div className="flex items-center bg-gray-100 rounded-full h-12 px-2">
            <button onClick={decQuantity} className="w-9 h-full flex items-center justify-center hover:bg-white rounded-full transition-colors"><Minus size={14} /></button>
            <span className="w-8 text-center text-sm font-semibold">{quantity}</span>
            <button onClick={incQuantity} className="w-9 h-full flex items-center justify-center hover:bg-white rounded-full transition-colors"><Plus size={14} /></button>
          </div>

          {/* Add To Cart */}
          {!isCurrentItemInCart ? (
            <button
              onClick={handleAddToCart}
              disabled={!selectedSize || quantity <= 0}
              className="flex-1 bg-black text-white h-12 rounded-full font-bold text-sm uppercase tracking-widest hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-black/10 transition-all active:scale-[0.98]"
            >
              Add to Cart
            </button>
          ) : (
            <button
              onClick={() => router.push('/checkoutpage')}
              className="flex-1 bg-white text-black border-2 border-black h-12 rounded-full font-bold text-sm uppercase tracking-widest hover:bg-gray-50 flex items-center justify-center gap-2 transition-all"
            >
              Checkout →
            </button>
          )}

          {/* Like */}
          <button
            onClick={() => setLiked(!liked)}
            className="h-12 w-12 flex items-center justify-center rounded-full border border-gray-200 text-gray-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-colors"
          >
            <Heart size={20} className={clsx("transition-transform", liked && "fill-red-500 text-red-500 scale-110")} />
          </button>
        </div>
      </div>

      {/* Extra Info Accordions */}
      <div className="pt-6">
        <Accordion title="Shipping & Returns">
          We offer free standard shipping on all orders over €150. Returns are accepted within 30 days of delivery.
        </Accordion>
        <Accordion title="Care Instructions">
          Machine wash cold with like colors. Tumble dry low. Do not bleach. Iron on low heat if needed.
        </Accordion>
      </div>
    </div>
  )
}

