'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import ProductGallery from '@/src/components/product/ProductGallery'
import ProductInfo from '@/src/components/product/ProductInfo'
import ProductConfigurator from '@/src/components/product/ProductConfigurator'
import ImageOrbit from '@/src/components/product/ImageOrbit'
import catalogData from '@/data/catalogData.json'
import { useProductStore } from '@/src/store/productStore'

export default function ProductPage() {
  const { slug } = useParams()
  const [product, setProduct] = useState<any>(null)
  const [selectedColorIndex, setSelectedColorIndex] = useState(0)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [defaultSelectedSize, setDefaultSelectedSize] = useState<string | null>(null)

  // 🔹 Snapshot coming from the catalog modal (if user came via "Go to Store")
  const storedProduct = useProductStore((state) => state.product) as any

  // Load product by slug, optionally respecting stored variant + size
  useEffect(() => {
    if (!slug) return

    const slugStr = Array.isArray(slug) ? slug[0] : slug

    const allProducts = Object.values(catalogData as any).flat() as any[]

    for (const prod of allProducts) {
      // Does this product belong to this slug?
      const belongsToSlug =
        prod.slug === slugStr ||
        prod.colors?.some((c: any) => c.slug === slugStr)

      if (!belongsToSlug) continue

      // --- Decide which color index to use ---
      let colorIndex = 0

      if (storedProduct?.selectedVariantId) {
        // Prefer variant chosen in the catalog modal
        const idxByVariant = prod.colors.findIndex(
          (c: any) => c.variantId === storedProduct.selectedVariantId
        )

        if (idxByVariant !== -1) {
          colorIndex = idxByVariant
        } else {
          // Fallback: try to match by slug for this product
          const idxBySlug = prod.colors.findIndex(
            (c: any) => c.slug === slugStr
          )
          if (idxBySlug !== -1) colorIndex = idxBySlug
        }
      } else {
        // No store info → fall back to slug-based color resolution
        const idxBySlug = prod.colors.findIndex(
          (c: any) => c.slug === slugStr
        )
        if (idxBySlug !== -1) colorIndex = idxBySlug
      }

      setProduct(prod)
      setSelectedColorIndex(colorIndex)

      // --- Decide default selected size ---
      if (storedProduct?.selectedSize) {
        setDefaultSelectedSize(storedProduct.selectedSize)
      } else {
        setDefaultSelectedSize(null)
      }

      return
    }

    // If we reach here: no matching product
    setProduct(null)
    setDefaultSelectedSize(null)
  }, [slug, storedProduct])

  // When product or color changes, reset main image to first one
  useEffect(() => {
    if (product) {
      setCurrentImageIndex(0)
    }
  }, [product, selectedColorIndex])

  if (!product) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-lg text-gray-400">Invalid or missing product</p>
      </div>
    )
  }

  const selectedColor = product.colors[selectedColorIndex]

  return (
    <div className="relative min-h-[calc(100vh-64px)] text-white overflow-hidden bg-[#2e4053]">
      {/* Grainy Overlay */}
      <div className="grainy" />

      {/* Page Content */}
      <div className="relative z-10 w-full max-w-[1800px] mx-auto flex flex-col lg:flex-row flex-grow gap-4 px-4 py-6">
        {/* LEFT COLUMN */}
        <div className="w-full lg:w-1/4 rounded-xl overflow-hidden">
          <ProductInfo
            name={product.name}
            price={product.price}
            material={product.material}
            description={product.description}
            tier={product.tier}
            type={product.type}
            fit={product.fit}
          />
          <ProductGallery
            images={selectedColor.images}
            selectedIndex={currentImageIndex}
            onSelect={setCurrentImageIndex}
          />
        </div>

        {/* MIDDLE VIEWER */}
        <div className="w-full lg:w-1/2 flex items-center justify-center rounded-xl overflow-hidden">
          <ImageOrbit
            images={selectedColor.images}
            currentIndex={currentImageIndex}
            setCurrentIndex={setCurrentImageIndex}
          />
        </div>

        {/* RIGHT CONFIGURATOR */}
        <div className="w-full lg:w-1/3 rounded-xl overflow-hidden flex flex-col justify-end">
          <ProductConfigurator
            sizes={product.sizes}
            colors={product.colors}
            defaultColor={selectedColor}
            variantId={selectedColor.variantId}
            selectedColorIndex={selectedColorIndex}
            setSelectedColorIndex={setSelectedColorIndex}
            name={product.name}
            description={product.description}
            material={product.material}
            tier={product.tier}
            type={product.type}
            fit={product.fit}
            price={product.price}
            defaultSelectedSize={defaultSelectedSize} 
          />
        </div>
      </div>
    </div>
  )
}
