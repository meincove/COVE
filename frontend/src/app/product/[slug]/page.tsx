// src/app/product/[slug]/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'

import VerticalGallery from '@/src/components/product/VerticalGallery'
import ProductInfo from '@/src/components/product/ProductInfo'
import ProductConfigurator from '@/src/components/product/ProductConfigurator'
import ReviewsSection from '@/src/components/product/ReviewsSection'
import RelatedProducts from '@/src/components/product/RelatedProducts'
import { useProductStore } from '@/src/store/productStore'
import { trackProductView } from '@/src/utils/analytics' // Analytics tracking (Dec 8)

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
  // aggregated total stock per size (across variants)
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
  const [defaultSelectedSize, setDefaultSelectedSize] = useState<string | null>(
    null
  )
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
        // Pass both slug and variantId for the most accurate data
        const apiUrl = `/api/catalog/product?slug=${encodeURIComponent(slugStr)}${urlVariantId ? `&variantId=${encodeURIComponent(urlVariantId)}` : ''}`

        const res = await fetch(apiUrl, { cache: 'no-store' })

        if (!res.ok) {
          try {
            const errorData = await res.json()
            console.error('Failed to fetch product:', res.status, errorData)
          } catch {
            console.error('Failed to fetch product:', res.status)
          }
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

        if (!uiProduct.colors || uiProduct.colors.length === 0) {
          console.error('Product has no color variants')
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

        // --- resolve color index (by variant if provided) ---
        let colorIndex = 0
        if (preferredVariantId) {
          const idxByVariant = uiProduct.colors.findIndex(
            (c) => c.variantId === preferredVariantId
          )
          if (idxByVariant !== -1) {
            colorIndex = idxByVariant
          }
        }

        const activeColor = uiProduct.colors[colorIndex] ?? uiProduct.colors[0]
        const activeSizeMap = activeColor?.sizes ?? {}

        // --- resolve default size (per-color) ---
        let resolvedSize: string | null = null

        if (preferredSize && activeSizeMap[preferredSize] !== undefined) {
          resolvedSize = preferredSize
        } else {
          const sizeKeys = Object.keys(activeSizeMap)
          resolvedSize = sizeKeys.length > 0 ? sizeKeys[0] : null
        }

        // --- resolve default quantity (per-color) ---
        const maxStock =
          resolvedSize && activeSizeMap[resolvedSize] != null
            ? activeSizeMap[resolvedSize]
            : 0

        let resolvedQty = 0
        if (preferredQtyRaw != null) {
          const parsed = Number(preferredQtyRaw)
          if (!Number.isNaN(parsed)) {
            resolvedQty = Math.max(1, parsed) // at least 1 if user chose something
          }
        }

        // If still 0 but stock exists, default to 1
        if (resolvedQty === 0 && maxStock > 0) {
          resolvedQty = 1
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

  // Track product view when product loads
  useEffect(() => {
    if (product && selectedColorIndex >= 0 && !isLoading) {
      const selectedColor = product.colors[selectedColorIndex]
      if (selectedColor?.variantId) {
        trackProductView(selectedColor.variantId, {
          product_name: product.name,
          product_slug: product.slug,
          color: selectedColor.colorName,
          price: product.price,
          tier: product.tier,
          type: product.type,
        })
      }
    }
  }, [product, selectedColorIndex, isLoading])

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
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-8">
        <div className="max-w-md text-center">
          <p className="text-2xl font-bold mb-4">Product Not Found</p>
          <p className="text-lg text-gray-400 mb-6">
            The product you're looking for doesn't exist or has been removed.
          </p>
          <p className="text-sm text-gray-500 mb-8">
            Product slug: <code className="bg-gray-800 px-2 py-1 rounded">{slugParam}</code>
          </p>
          <button
            onClick={() => window.location.href = '/shopping'}
            className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-medium transition-colors"
          >
            ← Back to Shopping
          </button>
        </div>
      </div>
    )
  }

  if (!product.colors || product.colors.length === 0) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-lg text-gray-400">No variants available for product</p>
      </div>
    )
  }

  const selectedColor =
    product.colors[selectedColorIndex] ?? product.colors[0]

  return (
    <div className="relative min-h-screen text-black bg-[#fafafa] flex flex-col font-sans pt-[140px]">
      {/* New 3-Column Layout */}
      <div className="flex-1 w-full max-w-[2400px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 p-4 md:p-8">

        {/* LEFT COLUMN: Info & Context (Sticky) */}
        <div className="hidden lg:block lg:col-span-3 xl:col-span-3 relative">
          <div className="sticky top-24 pr-4">
            {/* Breadcrumbs */}
            <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest text-black/40 mb-8">
              <a href="/" className="hover:text-black transition-colors">Home</a>
              <span>/</span>
              <a href={`/shopping/${product.type}`} className="hover:text-black transition-colors">{product.type}</a>
              <span>/</span>
              <span className="text-black">{product.name}</span>
            </div>

            <ProductInfo
              name={product.name}
              price={product.price}
              material={product.material}
              description={product.description || ''}
              tier={product.tier}
              type={product.type}
              fit={product.fit || ''}
            />
          </div>
        </div>

        {/* CENTER COLUMN: Vertical Visuals (Scrollable) */}
        <div className="col-span-1 lg:col-span-5 xl:col-span-6 min-h-screen">
          {/* Mobile Header (Only visible on mobile) */}
          <div className="block lg:hidden mb-6">
            <h1 className="text-3xl font-black uppercase tracking-tighter">{product.name}</h1>
            <p className="text-lg text-black/70 mt-1">€{product.price.toFixed(2)}</p>
          </div>

          <div className="w-full space-y-4">
            <VerticalGallery images={selectedColor.images} />
          </div>
        </div>

        {/* RIGHT COLUMN: Action & Config (Sticky) */}
        <div className="col-span-1 lg:col-span-4 xl:col-span-3 relative">
          <div className="sticky top-24 pl-4">
            <ProductConfigurator
              sizes={selectedColor.sizes}
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

            {/* Mobile Details Text (Below configuration on mobile) */}
            <div className="block lg:hidden mt-8 pt-8 border-t border-black/10">
              <p className="text-sm leading-relaxed text-black/80">{product.description}</p>
            </div>
          </div>
        </div>

      </div>

      {/* Extra Sections (Full Width) */}
      <RelatedProducts />
      <ReviewsSection />

    </div>
  )
}
