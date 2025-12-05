// src/app/product/[slug]/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'

import ProductGallery from '@/src/components/product/ProductGallery'
import ProductInfo from '@/src/components/product/ProductInfo'
import ProductConfigurator from '@/src/components/product/ProductConfigurator'
import ImageOrbit from '@/src/components/product/ImageOrbit'
import { useProductStore } from '@/src/store/productStore'

// --- Types matching the UI shape we already use -----------------------------

type UiSizeMap = Record<string, number>

type UiColor = {
  variantId: string
  colorName: string
  hex: string
  images: string[]
  slug: string
  sizes: UiSizeMap
}

type UiProduct = {
  productId: string
  slug: string
  name: string
  tier: string
  type: string
  gender?: string
  fit?: string | null
  material: string
  price: number
  basePrice: number
  description: string
  // aggregated total stock per size (across variants) for the configurator
  sizes: UiSizeMap
  colors: UiColor[]
}

export default function ProductPage() {
  const params = useParams()
  const slugParam = params?.slug as string | string[] | undefined

  const searchParams = useSearchParams()

  // query params (from catalog modal URL)
  const urlVariantId = searchParams.get('variantId')
  const urlSize = searchParams.get('size')
  const urlQty = searchParams.get('qty')

  const [product, setProduct] = useState<UiProduct | null>(null)
  const [selectedColorIndex, setSelectedColorIndex] = useState(0)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [defaultSelectedSize, setDefaultSelectedSize] = useState<string | null>(null)
  const [defaultQuantity, setDefaultQuantity] = useState<number>(0)
  const [isLoading, setIsLoading] = useState(true)

  // Snapshot coming from the catalog modal (if user came via "Go to Store")
  const storedProduct = useProductStore((state) => state.product) as any

  useEffect(() => {
    if (!slugParam) return

    const slugStr = Array.isArray(slugParam) ? slugParam[0] : slugParam

    async function fetchProduct() {
      try {
        setIsLoading(true)

        // hit our Next.js proxy, which already returns UiProduct shape
        const res = await fetch(
          `/api/catalog/product?slug=${encodeURIComponent(slugStr)}`,
          { cache: 'no-store' }
        )

        if (!res.ok) {
          console.error('Failed to fetch product', res.status)
          setProduct(null)
          setDefaultSelectedSize(null)
          setDefaultQuantity(0)
          return
        }

        const data = await res.json()
        const uiProduct: UiProduct | undefined = data.product

        if (!uiProduct) {
          setProduct(null)
          setDefaultSelectedSize(null)
          setDefaultQuantity(0)
          return
        }

        // ---------- resolve preferred variant / size / qty ----------
        const preferredVariantId =
          urlVariantId || storedProduct?.selectedVariantId || null
        const preferredSize = urlSize || storedProduct?.selectedSize || null
        const preferredQtyRaw =
          urlQty ?? storedProduct?.quantity ?? storedProduct?.qty ?? null

        // resolve color index
        let colorIndex = 0
        if (preferredVariantId) {
          const idxByVariant = uiProduct.colors.findIndex(
            (c) => c.variantId === preferredVariantId
          )
          if (idxByVariant !== -1) {
            colorIndex = idxByVariant
          }
        }

        // resolve default size
        const sizeMap = uiProduct.sizes
        let resolvedSize: string | null = null
        if (preferredSize && sizeMap[preferredSize] !== undefined) {
          resolvedSize = preferredSize
        } else {
          const sizeKeys = Object.keys(sizeMap)
          resolvedSize = sizeKeys.length > 0 ? sizeKeys[0] : null
        }

        // resolve default quantity
        const maxStock =
          resolvedSize && sizeMap[resolvedSize] != null ? sizeMap[resolvedSize] : 0

        let resolvedQty = 0
        if (preferredQtyRaw != null) {
          const parsed = Number(preferredQtyRaw)
          if (!Number.isNaN(parsed)) {
            resolvedQty = Math.max(0, parsed)
          }
        }
        if (maxStock > 0) {
          resolvedQty = Math.min(resolvedQty, maxStock)
        } else {
          resolvedQty = 0
        }

        setProduct(uiProduct)
        setSelectedColorIndex(colorIndex)
        setDefaultSelectedSize(resolvedSize)
        setDefaultQuantity(resolvedQty)
      } catch (err) {
        console.error('Error fetching product', err)
        setProduct(null)
        setDefaultSelectedSize(null)
        setDefaultQuantity(0)
      } finally {
        setIsLoading(false)
      }
    }

    fetchProduct()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slugParam, storedProduct, urlVariantId, urlSize, urlQty])

  // reset main image on product / color change
  useEffect(() => {
    if (product) setCurrentImageIndex(0)
  }, [product, selectedColorIndex])

  // ---- RENDER ----------------------------------------------------------------

  // don’t show the error while we’re still loading
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center" />
    )
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-lg text-gray-400">Invalid or missing product</p>
      </div>
    )
  }

  const selectedColor = product.colors[selectedColorIndex]

  return (
    <div className="relative min-h-screen text-white bg-[#2e4053] flex flex-col overflow-hidden">
      {/* Page Content */}
      <div className="relative z-10 flex-1 w-full max-w-[1800px] xl:max-w-[2000px] 2xl:max-w-[2400px] mx-auto flex flex-col md:flex-row lg:flex-row gap-3 sm:gap-4 md:gap-5 lg:gap-6 px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-5 md:py-6">
        {/* LEFT COLUMN - Product Info & Gallery */}
        <div className="w-full md:w-1/3 lg:w-1/4 xl:w-1/5 rounded-xl overflow-hidden">
          <ProductInfo
            name={product.name}
            price={product.price}
            material={product.material}
            description={product.description || ''}
            tier={product.tier}
            type={product.type}
            fit={product.fit || ''}
          />
          <ProductGallery
            images={selectedColor.images}
            selectedIndex={currentImageIndex}
            onSelect={setCurrentImageIndex}
          />
        </div>

        {/* MIDDLE VIEWER - Main Image Display */}
        <div className="w-full md:w-2/3 lg:w-1/2 xl:w-3/5 flex items-center justify-center rounded-xl overflow-hidden">
          <ImageOrbit
            images={selectedColor.images}
            currentIndex={currentImageIndex}
            setCurrentIndex={setCurrentImageIndex}
          />
        </div>

        {/* RIGHT CONFIGURATOR - Size/Color Selection */}
        <div className="w-full md:w-full lg:w-1/3 xl:w-1/4 rounded-xl overflow-hidden flex flex-col justify-end">
          <ProductConfigurator
            sizes={product.sizes}
            colors={product.colors}
            defaultColor={selectedColor}
            variantId={selectedColor.variantId}
            selectedColorIndex={selectedColorIndex}
            setSelectedColorIndex={setSelectedColorIndex}
            name={product.name}
            description={product.description || ''}
            material={product.material}
            tier={product.tier}
            type={product.type}
            fit={product.fit || ''}
            price={product.price}
            defaultSelectedSize={defaultSelectedSize}
            initialQuantity={defaultQuantity}
          />
        </div>
      </div>
    </div>
  )
}