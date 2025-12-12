


'use client'

import { useRef, useState, useEffect } from 'react'
import CatalogModalRoot from '@/src/components/Catalog/CatalogModalRoot'
import CatalogTierSection from '@/src/components/Catalog/CatalogTierSection'
import type { CatalogData, CatalogCard, ProductColor } from '@/types/product'
import type { TierFilters, TierFilterState, TierKey } from '@/types/filters'

// Brand-specific gradient backgrounds for smooth visual transitions
const brandGradients: Record<string, string> = {
  'COVE': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  'UrbanPulse': 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  'NordicThread': 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  'BoldHues': 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
  'TechUrban': 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
  'EcoHaven': 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
  'ModernHeritage': 'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
  'TimelessCo': 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
  'StreetVibe': 'linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 100%)',
  'FlexFit': 'linear-gradient(135deg, #fdcbf1 0%, #e6dee9 100%)',
  'SimpleStack': 'linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)',
  'FreeSpirit': 'linear-gradient(135deg, #f7797d 0%, #fbd786 100%)',
  'CoreBasics': 'linear-gradient(135deg, #c471f5 0%, #fa71cd 100%)',
  'ComfortZone': 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
  'LuxeLine': 'linear-gradient(135deg, #fad0c4 0%, #ffd1ff 100%)',
}

const formatTierLabel = (tierKey: string) =>
  tierKey.charAt(0).toUpperCase() + tierKey.slice(1)

// Transform API products to brand-grouped catalog format (one carousel per brand)
function groupProductsByBrand(products: any[]): Record<string, CatalogCard[]> {
  const grouped: Record<string, CatalogCard[]> = {}

  products.forEach(product => {
    const brandId = product.brand_id || 'Unknown'

    if (!grouped[brandId]) {
      grouped[brandId] = []
    }

    // Get first variant's sizes for the card
    const firstVariant = product.color_variants?.[0]
    const sizes: Record<string, number> = {}
    firstVariant?.sizes?.forEach((s: any) => {
      sizes[s.size] = s.quantity
    })

    // Transform all color variants to ProductColor format
    const colors: ProductColor[] = product.color_variants?.map((v: any) => ({
      colorName: v.color_name,
      hex: v.hex,
      variantId: v.variant_id,
      images: v.images?.map((img: any) => img.image_name) || [],
      sizes: {},
      slug: v.slug
    })) || []

    // Transform backend product to CatalogCard format
    const card: CatalogCard = {
      id: product.product_id,
      groupId: product.product_id,
      slug: product.slug,
      name: product.name,
      tier: product.tier || 'casual',
      type: product.type || 'clothing',
      material: product.material || 'Cotton',
      price: parseFloat(product.base_price),
      basePrice: parseFloat(product.base_price),
      gender: product.gender || 'unisex',
      fit: product.fit || 'regular',
      description: product.description || '',
      colors: colors,
      sizes: sizes,
    }

    grouped[brandId].push(card)
  })

  return grouped
}


export default function CatalogPage() {
  const [catalogData, setCatalogData] = useState<Record<string, CatalogCard[]>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tierFilters, setTierFilters] = useState<TierFilters>({})
  const [activeTierKey, setActiveTierKey] = useState<TierKey | null>(null)

  const sectionRefs = useRef<Record<TierKey, HTMLDivElement | null>>(
    {} as Record<TierKey, HTMLDivElement | null>
  )

  // Fetch products from backend API with pagination
  useEffect(() => {
    async function fetchProducts() {
      try {
        setIsLoading(true)
        setError(null)

        let allProducts: any[] = []
        let page = 1
        let hasMore = true

        // Fetch all pages (backend now allows up to 500 per page)
        while (hasMore) {
          const response = await fetch(`http://localhost:8001/api/products/?page=${page}&page_size=500`)

          if (!response.ok) {
            throw new Error(`Failed to fetch products: ${response.statusText}`)
          }

          const data = await response.json()
          allProducts = allProducts.concat(data.results || [])

          // Check if there are more pages
          hasMore = data.next !== null
          page++

          // Add small delay to avoid rate limiting (100ms between requests)
          if (hasMore) {
            await new Promise(resolve => setTimeout(resolve, 100))
          }

          // Safety limit to prevent infinite loops
          if (page > 50) {
            console.warn('Reached maximum page limit')
            break
          }
        }

        console.log(`Fetched ${allProducts.length} products total across ${page - 1} pages`)

        // Transform to brand-grouped format
        const grouped = groupProductsByBrand(allProducts)
        console.log(`Grouped into ${Object.keys(grouped).length} brands:`, Object.keys(grouped))
        setCatalogData(grouped)

      } catch (err) {
        console.error('Error fetching catalog:', err)
        setError(err instanceof Error ? err.message : 'Failed to load catalog')
      } finally {
        setIsLoading(false)
      }
    }

    fetchProducts()
  }, [])

  const tierEntries = Object.entries(catalogData) as [TierKey, CatalogCard[]][]

  // Sort brands: COVE first, then alphabetical
  const sortedTierEntries = tierEntries.sort((a, b) => {
    const brandA = String(a[0])
    const brandB = String(b[0])

    if (brandA === 'COVE') return -1
    if (brandB === 'COVE') return 1

    return brandA.localeCompare(brandB)
  })

  const updateTierFilters = (
    tierKey: TierKey,
    updater: (prev: TierFilterState) => TierFilterState
  ) => {
    setTierFilters((prev) => {
      const current = prev[tierKey] || {}
      return {
        ...prev,
        [tierKey]: updater(current),
      }
    })
  }

  // Loading state
  if (isLoading) {
    return (
      <main className="w-full min-h-screen flex items-center justify-center bg-[#F1F3E0]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-700">Loading catalog...</p>
        </div>
      </main>
    )
  }

  // Error state
  if (error) {
    return (
      <main className="w-full min-h-screen flex items-center justify-center bg-[#F1F3E0]">
        <div className="text-center max-w-md">
          <p className="text-red-600 mb-4">Error loading catalog</p>
          <p className="text-gray-600 text-sm">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-black text-white rounded hover:bg-gray-800"
          >
            Retry
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="w-full min-h-screen flex flex-col py-4 sm:py-6 md:py-8">
      {sortedTierEntries.map(([brandId, cards], index) => {
        const title = brandId
        const description = `Explore ${brandId}'s collection`
        const gradient = brandGradients[brandId] || 'linear-gradient(135deg, #F1F3E0 0%, #E8EBD8 100%)'

        const filtersForTier: TierFilterState = tierFilters[brandId as TierKey] || {}

        return (
          <section
            key={brandId}
            style={{
              background: gradient,
              transition: 'background 0.6s ease-in-out',
            }}
            className="mb-8 px-3 sm:px-4 md:px-6 lg:px-8 py-6 shadow-lg"
          >
            <CatalogTierSection
              tierKey={brandId as TierKey}
              index={index}
              title={title}
              description={description}
              cards={cards}
              filtersForTier={filtersForTier}
              updateFilters={(updater) => updateTierFilters(brandId as TierKey, updater)}
              onInView={(visibleTier) => setActiveTierKey(visibleTier)}
              sectionRef={(el) => {
                sectionRefs.current[brandId as TierKey] = el
              }}
            />
          </section>
        )
      })}

      <CatalogModalRoot />
    </main>
  )
}
