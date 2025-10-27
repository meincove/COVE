


'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/src/components/ui/button'
import { useRouter } from 'next/navigation'
import { useProductStore } from "@/src/store/productStore"


interface CatalogCardModalProps {
  layoutKey: string | number
  name: string
  description: string
  price: number
  colors: {
    colorName: string
    hex: string
    variantId: string
    images: string[]
    slug: string 
  }[]
  sizes: Record<string, number>
  selectedVariantId: string
  quantity: number
  setQuantity: (q: number) => void
  onClose: () => void
}





export default function CatalogCardModal({
  layoutKey,
  name,
  description,
  price,
  colors,
  selectedVariantId,
  sizes,
  quantity,
  setQuantity,
  onClose,
}: CatalogCardModalProps) {
  const layoutId = `catalog-card-${layoutKey}`
  const router = useRouter()

  const setProduct = useProductStore((state) => state.setProduct)

const defaultIndex = colors.findIndex(
  (c) => c.variantId === selectedVariantId
)
const [selectedColorIndex, setSelectedColorIndex] = useState(
  defaultIndex !== -1 ? defaultIndex : 0
)



  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  const selectedColor = colors[selectedColorIndex]
  const images = selectedColor.images
  const currentImage = images[currentImageIndex]

  const handleNextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length)
  }

  const handlePrevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length)
  }


  return (
    <>
      <motion.div
        className="fixed inset-0 z-[49] backdrop-blur-sm bg-black/10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />

      <motion.div
        layoutId={layoutId}
        className="fixed top-1/2 left-1/2 z-50 rounded-2xl shadow-2xl overflow-hidden transform -translate-x-1/2 -translate-y-1/2"
        style={{ width: '50vw', height: '50vh', backgroundColor: '#e5e7eb' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-full h-full flex">
          {/* Image section */}
          <motion.div
            layoutId={`${layoutId}-image`}
            className="w-1/2 flex flex-col items-center justify-center p-4 relative bg-gray-100"
          >
            <img
              src={`/clothing-images/${currentImage}`}
              alt="Product"
              className="max-h-full max-w-full object-contain"
            />
            <button onClick={handlePrevImage} className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white text-black rounded-full p-2 shadow">
              ⬅️
            </button>
            <button onClick={handleNextImage} className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white text-black rounded-full p-2 shadow">
              ➡️
            </button>
          </motion.div>

          {/* Info */}
          <motion.div
            layoutId={`${layoutId}-text`}
            className="w-1/2 p-6 flex flex-col justify-between"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
          >
            <div className="flex flex-col gap-2">
              <motion.h2 layoutId={`${layoutId}-title`} className="text-xl font-bold">
                {name}
              </motion.h2>
              <motion.p layoutId={`${layoutId}-desc`} className="text-sm text-gray-600">
                {description}
              </motion.p>
              <p className="text-sm text-gray-800">€{price.toFixed(2)}</p>
              <p className="text-sm text-gray-800">
                Crafted from premium materials, ribbed hems, and a tailored fit — elevate your everyday style.
              </p>
            </div>

            <div>
              <p className="font-semibold mb-2">Size</p>
              <div className="flex gap-2 mb-4">
                {Object.keys(sizes).map((s) => (
                  <span key={s} className="px-3 py-1 border rounded-full text-sm cursor-pointer">
                    {s}
                  </span>
                ))}
              </div>

              <p className="font-semibold mb-2">Color</p>
              <div className="flex gap-2 mb-4">
                {colors.map((c, i) => (
                  <div
                    key={c.variantId}
                    title={c.colorName}
                    onClick={() => {
                      setSelectedColorIndex(i)
                      setCurrentImageIndex(0)
                    }}
                    className={`w-6 h-6 rounded-full border-2 cursor-pointer ${
                      selectedColorIndex === i ? 'ring-2 ring-black' : ''
                    }`}
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
              </div>

              <div className="flex items-center justify-between mb-4">
                <p className="font-semibold">Quantity</p>
                <div className="flex items-center gap-2">
                  <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="px-2 py-1 border rounded">-</button>
                  <span>{quantity}</span>
                  <button onClick={() => setQuantity(quantity + 1)} className="px-2 py-1 border rounded">+</button>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <Button className="w-full bg-black text-white hover:bg-gray-900">Add to Cart</Button>
             <Button
  className="w-full"
  onClick={() => {
    setProduct({
      id: layoutKey.toString(),
      name,
      description,
      price,
      tier: "casual", // or pass dynamically from props
      type: "hoodie",  // same here
      material: "Brushed Fleece",
      gender: "unisex",
      fit: "regular",
      sizes,
      colors,
    })

    onClose()

    // ✅ Navigate using slug directly from selected color
    const slug = colors[selectedColorIndex].slug
    router.push(`/product/${slug}`)
  }}
>
  Go to Store
</Button>


              <Button className="w-full bg-gray-300 hover:bg-gray-400 text-black" onClick={onClose}>Close</Button>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </>
  )
}
