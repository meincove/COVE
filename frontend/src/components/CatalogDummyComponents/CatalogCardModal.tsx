// 'use client'

// import { useState } from 'react'
// import { motion } from 'framer-motion'
// import { Button } from '@/components/ui/button'
// import { useRouter } from 'next/navigation'
// import { useProductStore } from '@/store/productStore'
// // import type { CatalogCard as ProductCatalogCard } from '@/types/product'
// import type { CatalogColor } from '@/types/catalog'

// interface CatalogCardModalProps {
//   layoutKey: string | number
//   name: string
//   description: string
//   price: number
//   colors: CatalogColor[]            // 🔹 unified with catalogData.json
//   sizes: Record<string, number>     // card-level stock sum
//   selectedVariantId: string
//   quantity: number
//   setQuantity: (q: number) => void
//   onClose: () => void

//    // 🔹 new meta props we want available in the UI
//   tier: string
//   type: string
//   material: string
//   gender: string
//   fit: string
// }

// export default function CatalogCardModal({
//   layoutKey,
//   name,
//   description,
//   price,
//   colors,
//   selectedVariantId,
//   sizes,
//   quantity,
//   setQuantity,
//   onClose,
//   tier,
//   type,
//   material,
//   gender,
//   fit,
// }: CatalogCardModalProps) {
//   const router = useRouter()
//   const setProduct = useProductStore((state) => state.setProduct)

//   const defaultIndex = colors.findIndex((c) => c.variantId === selectedVariantId)
//   const [selectedColorIndex, setSelectedColorIndex] = useState(
//     defaultIndex !== -1 ? defaultIndex : 0
//   )

//   const [currentImageIndex, setCurrentImageIndex] = useState(0)

//   const selectedColor = colors[selectedColorIndex]
//   // Normalize images: always an array of non-empty strings
// const images = (selectedColor?.images ?? []).filter(
//   (img) => typeof img === 'string' && img.trim().length > 0
// )
// const hasImages = images.length > 0
// const currentImage = hasImages ? images[currentImageIndex] : null

//     const sizeKeys = Object.keys(sizes)
//   const [selectedSize, setSelectedSize] = useState(
//     sizeKeys[0] ?? ''
//   )


//   const handleNextImage = () => {
//   if (!hasImages) return
//   setCurrentImageIndex((prev) => (prev + 1) % images.length)
// }

// const handlePrevImage = () => {
//   if (!hasImages) return
//   setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length)
// }


//   return (
//     <>
//       {/* Backdrop */}
//       <motion.div
//         className="fixed inset-0 z-[98]"
//         initial={{ opacity: 0 }}
//         animate={{ opacity: 1 }}
//         exit={{ opacity: 0 }}
//         onClick={onClose}
//       />

//       {/* Modal card */}
//       <motion.div
//         className="fixed top-1/2 left-1/2 z-[99] rounded-2xl shadow-2xl overflow-hidden transform -translate-x-1/2 -translate-y-1/2"
//         style={{ width: '50vw', height: '40vh', backgroundColor: '#e5e7eb' }}
//         initial={{ opacity: 0, y: 20 }}
//         animate={{ opacity: 1,  y: 0 }}
//         exit={{ opacity: 0,  y: 20 }}
//         transition={{ duration: 0.25, ease: 'easeOut' }}
//         onClick={(e) => e.stopPropagation()}
//       >
//         <div className="w-full h-full flex">
          
//           {/* Image section */}
//           <div className="w-1/2 flex flex-col items-center justify-center p-4 relative ">
//   {hasImages ? (
//     <>
//       <img
//         src={`/clothing-images/${currentImage}`}
//         alt="Product"
//         className="max-h-full max-w-full object-contain"
//       />
//       <button
//         onClick={handlePrevImage}
//         className="absolute left-4 top-1/2 transform -translate-y-1/2  text-black rounded-full p-2 "
//       >
//         ⬅️
//       </button>
//       <button
//         onClick={handleNextImage}
//         className="absolute right-4 top-1/2 transform -translate-y-1/2  text-black rounded-full p-2 "
//       >
//         ➡️
//       </button>
//     </>
//   ) : (
//     <div className="flex items-center justify-center w-full h-full text-base font-semibold text-gray-500">
//       No images available
//     </div>
//   )}
// </div>



//           {/* Info */}
//           <motion.div
//             className="w-1/2 p-6 flex flex-col justify-between"
//             initial={{ opacity: 0, y: 20 }}
//             animate={{ opacity: 1, y: 0 }}
//             transition={{ duration: 0.3, ease: 'easeInOut' }}
//           >
//               <div className="flex flex-col gap-3">
//     {/* Name + meta chips */}
//     <div className="flex flex-col gap-2">
//       <h2 className="text-xl font-bold">{name}</h2>

//       <div className="flex flex-wrap gap-2 text-[11px] font-medium text-gray-700">
//         <span className="px-2 py-1 rounded-full bg-gray-200 uppercase tracking-wide">
//           {tier}
//         </span>
//         <span className="px-2 py-1 rounded-full bg-gray-200">
//           {type}
//         </span>
//         <span className="px-2 py-1 rounded-full bg-gray-200">
//           {gender} · {fit}
//         </span>
//         <span className="px-2 py-1 rounded-full bg-gray-200">
//           {material}
//         </span>
//       </div>
//     </div>

//     {/* Description + price */}
//     <p className="text-sm text-gray-600">{description}</p>
//     <p className="text-sm font-semibold text-gray-900">€{price.toFixed(2)}</p>
//   </div>


//             <div>
//               <p className="font-semibold mb-2">Size</p>
// <div className="flex gap-2 mb-4">
//   {sizeKeys.map((s) => {
//     const isActive = s === selectedSize
//     return (
//       <button
//         key={s}
//         type="button"
//         onClick={() => setSelectedSize(s)}
//         className={[
//           "px-3 py-1 rounded-full text-sm border transition",
//           isActive
//             ? "bg-black text-white border-black"
//             : "bg-white text-gray-800 border-gray-300 hover:border-black"
//         ].join(" ")}
//       >
//         {s}
//       </button>
//     )
//   })}
// </div>


//               <p className="font-semibold mb-2">Color</p>
//               <div className="flex gap-2 mb-4">
//                 {colors.map((c, i) => (
//                   <div
//                     key={c.variantId}
//                     title={c.colorName ?? undefined}
//                     onClick={() => {
//                       setSelectedColorIndex(i)
//                       setCurrentImageIndex(0)
//                     }}
//                     className={`w-6 h-6 rounded-full border-2 cursor-pointer ${
//                       selectedColorIndex === i ? 'ring-2 ring-black' : ''
//                     }`}
//                     style={{ backgroundColor: c.hex ?? '#000000' }}
//                   />
//                 ))}
//               </div>

//               <div className="flex items-center justify-between mb-4">
//                 <p className="font-semibold">Quantity</p>
//                 <div className="flex items-center gap-2">
//                   <button
//                     onClick={() => setQuantity(Math.max(1, quantity - 1))}
//                     className="px-2 py-1 border rounded"
//                   >
//                     -
//                   </button>
//                   <span>{quantity}</span>
//                   <button
//                     onClick={() => setQuantity(quantity + 1)}
//                     className="px-2 py-1 border rounded"
//                   >
//                     +
//                   </button>
//                 </div>
//               </div>
//             </div>

//             <div className="flex flex-col gap-2">
//               <Button className="w-full bg-black text-white hover:bg-gray-900">
//                 Add to Cart
//               </Button>

//               {/* <Button
//                 className="w-full"
//                 onClick={() => {
//                   // 🔹 Build a product object that matches CatalogCard (types/product)
//                   const product: ProductCatalogCard = {
//                     id: layoutKey.toString(),
//                     name,
//                     description,
//                     price,
//                     tier: 'casual', // TODO: pass real tier via props if needed
//                     type: 'hoodie',
//                     material: 'Brushed Fleece',
//                     gender: 'unisex',
//                     fit: 'regular',
//                     sizes,
//                     colors: colors.map((c) => ({
//                       colorName: c.colorName,
//                       hex: c.hex,
//                       variantId: c.variantId,
//                       images: c.images,
//                       sizes: c.sizes,
//                       slug: c.slug,
//                     })),
//                   }

//                   setProduct(product)
//                   onClose()

//                   const slug = colors[selectedColorIndex].slug
//                   router.push(`/product/${slug}`)
//                 }}
//               >
//                 Go to Store
//               </Button> */}

//               <Button
//   className="w-full"
//   onClick={() => {
//     const selectedColor = colors[selectedColorIndex]

//     // Minimal product snapshot for the product page.
//     const product = {
//       id: layoutKey.toString(),
//       name,
//       description,
//       price,
//       tier,          // from props
//       type,
//       material,
//       gender,
//       fit,
//       sizes,
//       colors,        // CatalogColor[]
//       selectedSize,  // 🔹 what user picked in this modal
//       selectedVariantId: selectedColor.variantId, // 🔹 which color/variant
//     }

//     // We still cast here to avoid fighting the strict CatalogCard type.
//     // Later, if we define a SelectedProduct type, we can remove this.
//     // eslint-disable-next-line @typescript-eslint/no-explicit-any
//     setProduct(product as any)

//     onClose()

//     const slug = selectedColor.slug
//     router.push(`/product/${slug}`)
//   }}
// >
//   Go to Store
// </Button>



//               <Button
//                 className="w-full bg-gray-300 hover:bg-gray-400 text-black"
//                 onClick={onClose}
//               >
//                 Close
//               </Button>
//             </div>
//           </motion.div>
//         </div>
//       </motion.div>
//     </>
//   )
// }



'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { useProductStore } from '@/store/productStore'
import type { CatalogColor } from '@/types/catalog'

interface CatalogCardModalProps {
  layoutKey: string | number
  name: string
  description: string
  price: number
  colors: CatalogColor[]
  sizes: Record<string, number>
  selectedVariantId: string
  quantity: number
  setQuantity: (q: number) => void
  onClose: () => void

  // meta
  tier: string
  type: string
  material: string
  gender: string
  fit: string
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
  tier,
  type,
  material,
  gender,
  fit,
}: CatalogCardModalProps) {
  const router = useRouter()
  const setProduct = useProductStore((state) => state.setProduct)

  const defaultIndex = colors.findIndex((c) => c.variantId === selectedVariantId)
  const [selectedColorIndex, setSelectedColorIndex] = useState(
    defaultIndex !== -1 ? defaultIndex : 0
  )

  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  const selectedColor = colors[selectedColorIndex]
  const images = (selectedColor?.images ?? []).filter(
    (img) => typeof img === 'string' && img.trim().length > 0
  )
  const hasImages = images.length > 0
  const currentImage = hasImages ? images[currentImageIndex] : null

  const sizeKeys = Object.keys(sizes)
  const [selectedSize, setSelectedSize] = useState(sizeKeys[0] ?? '')

  const handleNextImage = () => {
    if (!hasImages) return
    setCurrentImageIndex((prev) => (prev + 1) % images.length)
  }

  const handlePrevImage = () => {
    if (!hasImages) return
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length)
  }

  return (
    <motion.div
      className="fixed inset-0 z-[98] flex items-center justify-center pointer-events-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      {/* Soft blurred band behind card + modal – same height as modal approx */}
      <div
        className="
          absolute inset-x-0 mx-auto
          max-w-6xl
          rounded-[40px]
          bg-slate-900/14
          backdrop-blur-md
        "
        style={{
          // roughly card height (card max ~380px * 1.25 = 475px)
          height: 'min(70vh, 480px)',
        }}
      />

      {/* Modal container */}
      <motion.div
        className="
          relative z-[99]
          pointer-events-auto
          flex flex-col md:flex-row
          bg-[#F1F3E0]
          rounded-[32px]
          shadow-2xl
          overflow-hidden
        "
        style={{
          // roughly 2.5x max card width (380px) but responsive
          width: 'min(90vw, 950px)',
          // height tracks card height, but grows on mobile when stacked
          minHeight: 'min(70vh, 480px)',
        }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* IMAGE SECTION */}
        <div
          className="
            flex-1
            md:basis-1/2
            flex flex-col items-center justify-center
            p-4
            relative
          "
        >
          {hasImages ? (
            <>
              <img
                src={`/clothing-images/${currentImage}`}
                alt="Product"
                className="max-h-full max-w-full object-contain"
              />

              {/* Prev / next arrows */}
              <button
                type="button"
                onClick={handlePrevImage}
                className="
                  absolute left-4 md:left-6
                  top-1/2 -translate-y-1/2
                  rounded-full
                  bg-slate-900/55
                  hover:bg-slate-900
                  text-slate-50
                  p-2
                  shadow-md
                  transition
                "
              >
                ‹
              </button>
              <button
                type="button"
                onClick={handleNextImage}
                className="
                  absolute right-4 md:right-6
                  top-1/2 -translate-y-1/2
                  rounded-full
                  bg-slate-900/55
                  hover:bg-slate-900
                  text-slate-50
                  p-2
                  shadow-md
                  transition
                "
              >
                ›
              </button>
            </>
          ) : (
            <div className="flex items-center justify-center w-full h-full text-base font-semibold text-gray-500">
              No images available
            </div>
          )}
        </div>

        {/* INFO SECTION */}
        <motion.div
          className="
            flex-1
            md:basis-1/2
            p-6
            flex flex-col justify-between gap-4
          "
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
        >
          <div className="flex flex-col gap-3">
            {/* Name + meta chips */}
            <div className="flex flex-col gap-2">
              <h2 className="text-xl font-bold text-slate-900">{name}</h2>

              <div className="flex flex-wrap gap-2 text-[11px] font-medium text-gray-700">
                <span className="px-2 py-1 rounded-full bg-[#D2DCB6] uppercase tracking-wide">
                  {tier}
                </span>
                <span className="px-2 py-1 rounded-full bg-[#D2DCB6]">
                  {type}
                </span>
                <span className="px-2 py-1 rounded-full bg-[#D2DCB6]">
                  {gender} · {fit}
                </span>
                <span className="px-2 py-1 rounded-full bg-[#D2DCB6]">
                  {material}
                </span>
              </div>
            </div>

            {/* Description + price */}
            <p className="text-sm text-gray-700">{description}</p>
            <p className="text-sm font-semibold text-slate-900">
              €{price.toFixed(2)}
            </p>
          </div>

          {/* Controls */}
          <div className="flex flex-col gap-4">
            {/* Size selector */}
            <div>
              <p className="font-semibold mb-2 text-slate-900">Size</p>
              <div className="flex flex-wrap gap-2 mb-2">
                {sizeKeys.map((s) => {
                  const isActive = s === selectedSize
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSelectedSize(s)}
                      className={[
                        'px-3 py-1 rounded-full text-sm border transition',
                        isActive
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-white text-slate-800 border-gray-300 hover:border-slate-900',
                      ].join(' ')}
                    >
                      {s}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Color selector */}
            <div>
              <p className="font-semibold mb-2 text-slate-900">Color</p>
              <div className="flex flex-wrap gap-2 mb-2">
                {colors.map((c, i) => (
                  <div
                    key={c.variantId}
                    title={c.colorName ?? undefined}
                    onClick={() => {
                      setSelectedColorIndex(i)
                      setCurrentImageIndex(0)
                    }}
                    className={`w-6 h-6 rounded-full border-2 cursor-pointer transition
                      ${
                        selectedColorIndex === i
                          ? 'ring-2 ring-slate-900 border-white'
                          : 'border-slate-300 hover:border-slate-900'
                      }`}
                    style={{ backgroundColor: c.hex ?? '#000000' }}
                  />
                ))}
              </div>
            </div>

            {/* Quantity */}
            <div className="flex items-center justify-between mb-1">
              <p className="font-semibold text-slate-900">Quantity</p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-2 py-1 border rounded bg-white hover:bg-[#D2DCB6] transition"
                >
                  -
                </button>
                <span className="min-w-[24px] text-center text-slate-900">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity(quantity + 1)}
                  className="px-2 py-1 border rounded bg-white hover:bg-[#D2DCB6] transition"
                >
                  +
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2">
              <Button className="w-full bg-slate-900 text-white hover:bg-black">
                Add to Cart
              </Button>

              <Button
                className="w-full"
                onClick={() => {
                  const selColor = colors[selectedColorIndex]

                  const product = {
                    id: layoutKey.toString(),
                    name,
                    description,
                    price,
                    tier,
                    type,
                    material,
                    gender,
                    fit,
                    sizes,
                    colors,
                    selectedSize,
                    selectedVariantId: selColor.variantId,
                  }

                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  setProduct(product as any)

                  onClose()

                  const slug = selColor.slug
                  router.push(`/product/${slug}`)
                }}
              >
                Go to Store
              </Button>

              <Button
                className="w-full bg-gray-300 hover:bg-gray-400 text-black"
                onClick={onClose}
              >
                Close
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  )
}
