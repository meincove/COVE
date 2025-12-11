// src/components/product/ProductConfigurator.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Minus, Plus, Heart } from 'lucide-react'
import { motion } from 'framer-motion'
import clsx from 'clsx'
import { useCartStore } from '@/src/store/cartStore'
import ProductDescription from '@/src/components/product/ProductDescription'
import { trackAddToCart } from '@/src/utils/analytics' // Analytics tracking (Dec 8)

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

export default function ProductConfigurator({
  sizes,
  colors,
  defaultColor, // currently unused, but kept for future
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
  const [showDetails, setShowDetails] = useState(false)
  const [liked, setLiked] = useState(false)
  const [stockAlert, setStockAlert] = useState('')
  const router = useRouter()

  const selectedColor = colors[selectedColorIndex]
  const stockLeft = selectedSize ? sizes[selectedSize] ?? 0 : 0

  const { addItem } = useCartStore()
  const isCurrentItemInCart = useCartStore
    .getState()
    .isInCart(selectedColor.variantId, selectedSize ?? '')

  // sync when external defaults change (e.g. navigated from catalog modal)
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

    // Track add to cart event
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
    <>
      <div className="h-[50vh] w-full bg-transparent text-black px-8 rounded-2xl lg:space-y-10 lg:space-x-30">
        {/* Size Selection */}
        <div className="space-y-4 pt-4">
          <p className="text-sm uppercase text-gray-800 font-semibold tracking-widest">
            Select Size
          </p>
          <div className="flex flex-wrap gap-3">
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
                    // when changing size, start from 0 again
                    setQuantity(0)
                    setStockAlert('')
                  }}
                  className={clsx(
                    'px-4 py-2 rounded-full border-2 text-sm font-medium transition-all',
                    isSelected
                      ? 'bg-black text-white border-black'
                      : 'border-gray-400 text-black hover:border-gray-800',
                    isOut && 'opacity-40 cursor-not-allowed'
                  )}
                >
                  {size}
                </button>
              )
            })}
          </div>
          {fewPiecesLeft && (
            <p className="text-sm text-red-600 font-medium">
              ⚠️ Few pieces left
            </p>
          )}
        </div>

        {/* Color + Quantity + Cart */}
        <div className="space-y-5">
          <div className="space-y-5">
            <p className="text-sm uppercase font-semibold text-gray-800 tracking-widest">
              Select Color
            </p>
            <div className="flex gap-3">
              {colors.map((color, i) => (
                <button
                  key={color.variantId}
                  onClick={() => {
                    setSelectedColorIndex(i)
                    setStockAlert('')
                  }}
                  className={clsx(
                    'p-[2px] rounded-full transition-all duration-150',
                    selectedColorIndex === i
                      ? 'border-2 border-black'
                      : 'border-2 border-transparent hover:border-black'
                  )}
                  aria-label={color.colorName}
                >
                  <div
                    className="w-7 h-7 rounded-full"
                    style={{ backgroundColor: color.hex }}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Quantity & Add to Cart */}
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pt-4">
            <div className="flex items-center border border-gray-500 rounded-full overflow-hidden">
              <button
                className="px-2 py-4 text-black hover:bg-black/10"
                onClick={decQuantity}
              >
                <Minus size={16} />
              </button>
              <span className="w-10 text-center font-medium">
                {quantity}
              </span>
              <button
                className="px-2 py-4 text-black hover:bg-black/10"
                onClick={incQuantity}
              >
                <Plus size={16} />
              </button>
            </div>

            {/* Cart Button */}
            <div className="flex items-center gap-4 flex-1">
              {!isCurrentItemInCart ? (
                <motion.button
                  initial={{ opacity: 0.3, scale: 0.98 }}
                  animate={{
                    opacity:
                      selectedSize && quantity > 0 ? 1 : 0.3,
                    scale:
                      selectedSize && quantity > 0 ? 1 : 0.98,
                  }}
                  whileTap={{ scale: 0.96 }}
                  disabled={!selectedSize || quantity <= 0}
                  onClick={handleAddToCart}
                  className="flex-1 py-4 px-5 ml-2 bg-black text-white font-medium rounded-full disabled:cursor-not-allowed transition-all"
                >
                  Add to Cart
                </motion.button>
              ) : (
                <motion.button
                  whileTap={{ scale: 0.96 }}
                  onClick={() => router.push('/checkoutpage')}
                  className="flex-1 py-4 px-5 ml-2 bg-white text-black font-medium border border-black rounded-full transition-all"
                >
                  Go to Checkout
                </motion.button>
              )}

              <motion.button
                onClick={() => setLiked(!liked)}
                whileTap={{ scale: 0.8 }}
                className="p-2 rounded-full border transition-colors"
                aria-label="Toggle Wishlist"
              >
                <motion.div
                  key={liked ? 'filled' : 'outline'}
                  initial={{ scale: 0.7, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.7, opacity: 0 }}
                  transition={{
                    type: 'spring',
                    stiffness: 300,
                    damping: 20,
                  }}
                >
                  {liked ? (
                    <Heart
                      className="text-red-500 fill-red-500"
                      size={28}
                    />
                  ) : (
                    <Heart
                      className="text-gray-700"
                      size={28}
                    />
                  )}
                </motion.div>
              </motion.button>
            </div>
          </div>

          {stockAlert && (
            <p className="text-sm text-red-600 mt-2">
              {stockAlert}
            </p>
          )}
        </div>

        {/* Product Details */}
        <div className="flex items-center gap-3 mt-4">
          <span
            className="text-3xl font-light leading-none animate-bounce transition-transform duration-200 cursor-pointer"
            onClick={() => setShowDetails(true)}
          >
            ↓
          </span>
          <button
            onClick={() => setShowDetails(true)}
            className="text-xs tracking-widest uppercase text-black font-semibold cursor-pointer"
          >
            Product Details
          </button>
        </div>
      </div>

      <ProductDescription
        show={showDetails}
        onClose={() => setShowDetails(false)}
        name={name}
        description={description}
        material={material}
        tier={tier}
        type={type}
        fit={fit}
      />
    </>
  )
}

