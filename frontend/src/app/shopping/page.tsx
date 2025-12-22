"use client"

import { useMemo, useState, useEffect } from "react"
import { Search, Filter, X } from "lucide-react"
import { useRouter } from "next/navigation"
import LShapedNavbar, { FilterGroup } from "@/src/components/shopping/LShapedNavbar"
// Ensure we use the correct CatalogCard component. 
// Based on user context, it's located at src/components/CatalogDummyComponents/CatalogCard.tsx
import CatalogCard from "@/src/components/Catalog/CatalogCard"
import CatalogModalRoot from "@/src/components/Catalog/CatalogModalRoot"
import type { CatalogCard as CatalogCardType } from "@/types/product"

// Reusing the type from Catalog for consistency
type ProductData = CatalogCardType

export default function ShoppingPage() {
    const router = useRouter()
    const [search, setSearch] = useState("")
    // Advanced Multi-Select State
    // Structure: { "Type": ["Hoodie", "Pants"], "Color": ["Red"], "Brand": ["COVE"] }
    const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({})

    // Data State
    const [products, setProducts] = useState<ProductData[]>([])
    const [brands, setBrands] = useState<{ brand_id: string, brand_name: string }[]>([])
    const [isLoading, setIsLoading] = useState(true)

    // Data Fetching (Dynamic from Neon Database via Backend API)
    useEffect(() => {
        async function fetchProducts() {
            try {
                setIsLoading(true)

                // Fetch brands for filter dropdown
                const brandsRes = await fetch('http://localhost:8001/api/brands/')
                if (brandsRes.ok) {
                    const brandsData = await brandsRes.json()
                    setBrands(brandsData.results || [])
                }

                let allProducts: any[] = []
                let page = 1
                let hasMore = true

                while (hasMore) {
                    // Fetching from backend API
                    const response = await fetch(`http://localhost:8001/api/products/?page=${page}&page_size=500`)
                    if (!response.ok) break

                    const data = await response.json()
                    allProducts = allProducts.concat(data.results || [])
                    hasMore = data.next !== null
                    page++

                    if (page > 20) break // Safety
                }

                // Deduplicate items by ID
                const uniqueProducts = new Map<string, any>();
                allProducts.forEach(product => {
                    if (!uniqueProducts.has(product.product_id)) {
                        uniqueProducts.set(product.product_id, product);
                    }
                });

                // Transform to CatalogCard format
                const formatted: ProductData[] = Array.from(uniqueProducts.values()).map(product => {
                    // Transform color variants
                    const colors = product.color_variants?.map((v: any) => ({
                        colorName: v.color_name,
                        hex: v.hex,
                        variantId: v.variant_id,
                        // Professional Image Handling:
                        // Some images are local (/clothing-images/) and some are remote (e.g., Pexels).
                        images: v.images?.map((img: any) => {
                            const name = img.image_name;
                            if (name.startsWith('http') || name.startsWith('/')) return name;
                            return `/clothing-images/${name}`;
                        }) || [],
                        sizes: {}, // Simplified for grid view
                        slug: v.slug
                    })) || []

                    // Sizes from first variant
                    const firstVariant = product.color_variants?.[0]
                    const sizes: Record<string, number> = {}
                    firstVariant?.sizes?.forEach((s: any) => {
                        sizes[s.size] = s.quantity
                    })

                    return {
                        id: product.product_id,
                        groupId: product.product_id,
                        slug: product.slug,
                        brand: product.brand_id, // Brand identifier for filtering
                        layoutKey: 'default', // Layout configuration for card
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
                })

                setProducts(formatted)
            } catch (err) {
                console.error("Failed to load products", err)
            } finally {
                setIsLoading(false)
            }
        }
        fetchProducts()
    }, [])

    // Derive Filter Options from Data
    const filterGroups = useMemo<FilterGroup[]>(() => {
        const types = new Set<string>()
        const fits = new Set<string>()
        const colors = new Set<string>()
        const sizes = new Set<string>()

        products.forEach(p => {
            if (p.type) types.add(p.type)
            if (p.fit) fits.add(p.fit)
            p.colors?.forEach(c => c.colorName && colors.add(c.colorName))
            p.sizes && Object.keys(p.sizes).forEach(s => sizes.add(s))
        })

        // Sort sizes specifically if possible, otherwise alphabetical
        const sizeOrder = ["XS", "S", "M", "L", "XL", "XXL", "3XL"]
        const sortedSizes = Array.from(sizes).sort((a, b) => {
            const idxA = sizeOrder.indexOf(a)
            const idxB = sizeOrder.indexOf(b)
            if (idxA !== -1 && idxB !== -1) return idxA - idxB
            return a.localeCompare(b)
        })

        return [
            { label: "Brand", options: brands.map(b => b.brand_name).sort() },
            { label: "Type", options: Array.from(types).sort() },
            { label: "Fit", options: Array.from(fits).sort() },
            { label: "Color", options: Array.from(colors).sort() },
            { label: "Size", options: sortedSizes },
        ]
    }, [products, brands])

    // --- Actions ---

    const handleFilterChange = (category: string, option: string) => {
        setActiveFilters(prev => {
            const currentOptions = prev[category] || []
            const isSelected = currentOptions.includes(option)

            let newOptions
            if (isSelected) {
                // Remove
                newOptions = currentOptions.filter(o => o !== option)
            } else {
                // Add
                newOptions = [...currentOptions, option]
            }

            // Cleanup empty keys
            if (newOptions.length === 0) {
                const copy = { ...prev }
                delete copy[category]
                return copy
            }

            return { ...prev, [category]: newOptions }
        })
    }

    const handleResetAll = () => {
        setActiveFilters({})
        setSearch("")
    }

    // --- Filter Logic ---

    const fullFilteredItems = useMemo(() => {
        return products.filter((item) => {
            // 1. Search
            const matchesSearch = search.trim() === ""
                ? true
                : (item.name.toLowerCase().includes(search.toLowerCase()) ||
                    item.type.toLowerCase().includes(search.toLowerCase()))

            if (!matchesSearch) return false

            // 2. Advanced Multi-Select Logic
            // Iterate over all active filter categories. 
            // The item must match AT LEAST ONE option in EACH active category (AND logic between categories).

            const entries = Object.entries(activeFilters)
            if (entries.length === 0) return true

            return entries.every(([category, options]) => {
                if (options.length === 0) return true // Should not happen due to cleanup but safe to handle

                // Check based on category name
                if (category === "Brand") {
                    // Match brand_id from product data
                    const productBrand = brands.find(b => b.brand_id === item.brand)
                    return productBrand && options.includes(productBrand.brand_name)
                }
                if (category === "Type") {
                    return options.includes(item.type)
                }
                if (category === "Fit") {
                    return options.includes(item.fit)
                }
                if (category === "Color") {
                    // Item has color variants. Check if ANY of item's colors match ANY of the selected options.
                    return item.colors?.some(c => c.colorName && options.includes(c.colorName))
                }
                if (category === "Size") {
                    // Check if item has ANY of the selected sizes
                    return item.sizes && Object.keys(item.sizes).some(s => options.includes(s))
                }

                // Fallback for unknown categories (Tier etc if added later)
                return false
            })
        })
    }, [products, search, activeFilters])

    // Helper to calculate total active filters count
    const totalActiveFilters = Object.values(activeFilters).reduce((acc, curr) => acc + curr.length, 0)

    return (
        <div className="relative min-h-screen w-full bg-[#FAFAFA]">
            {/* 
                L-Shaped Navbar 
                - Controls search and filters
                - Wraps the content visually ("L" shape)
            */}
            <LShapedNavbar
                searchValue={search}
                onSearchChange={setSearch}
                activeFilters={activeFilters}
                onFilterChange={handleFilterChange}
                onResetAll={handleResetAll}
                filterGroups={filterGroups}
            />

            {/* Main Content Area - Padded to sit inside the L-Frame */}
            <main
                className="relative z-10 w-full min-h-screen"
                style={{
                    paddingLeft: "calc(112px + 18px + 18px)", // rail + gap + spacing
                    paddingTop: "calc(76px + 18px + 18px)", // top + gap + spacing
                    paddingRight: "calc(10vw + 18px)", // cut + gap
                    paddingBottom: "40px",
                    '--card-width': '280px',
                    '--card-height': '380px',
                } as any}
            >
                {/* Header / Context */}
                <div className="px-6 mb-6">
                    <div className="flex items-baseline justify-between mb-2">
                        <div>
                            <h1 className="text-3xl font-light text-black/90">
                                {totalActiveFilters === 0 ? "New Arrivals" : "Filtered Results"}
                            </h1>
                            <p className="text-sm text-black/40 mt-1">
                                {fullFilteredItems.length} items found
                            </p>
                        </div>
                    </div>

                    {/* Active Filters Breadcrumbs - The "Advanced" Display */}
                    {totalActiveFilters > 0 && (
                        <div className="flex flex-wrap items-center gap-2 pt-2">
                            {Object.entries(activeFilters).map(([category, options]) => (
                                <div key={category} className="flex items-center gap-2 mr-2">
                                    <span className="text-xs font-bold text-black/30 uppercase tracking-widest">{category}:</span>
                                    {options.map(option => (
                                        <button
                                            key={option}
                                            onClick={() => handleFilterChange(category, option)}
                                            className="group flex items-center gap-1.5 bg-white border border-black/10 px-3 py-1.5 rounded-full text-xs text-black/70 hover:border-black/30 hover:text-black transition-all shadow-sm"
                                        >
                                            {option}
                                            <svg className="w-3 h-3 text-black/30 group-hover:text-black" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                                <line x1="6" y1="6" x2="18" y2="18"></line>
                                            </svg>
                                        </button>
                                    ))}
                                </div>
                            ))}
                            <button
                                onClick={handleResetAll}
                                className="text-xs text-black/40 underline hover:text-black ml-2"
                            >
                                Clear all
                            </button>
                        </div>
                    )}
                </div>

                {/* Grid */}
                {isLoading ? (
                    <div className="flex h-[40vh] w-full items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black/10"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-x-6 gap-y-10 px-6">
                        {fullFilteredItems.map((item) => (
                            <CatalogCard
                                key={item.id}
                                layoutKey={item.id}
                                {...item}
                                mode="normal"
                            />
                        ))}
                    </div>
                )}

                {/* Empty State */}
                {!isLoading && fullFilteredItems.length === 0 && (
                    <div className="flex h-[40vh] w-full flex-col items-center justify-center text-black/40">
                        <div className="text-lg">No items found</div>
                        <button onClick={handleResetAll} className="mt-2 text-sm underline hover:text-black">Clear filters</button>
                    </div>
                )}
            </main>

            {/* Modal Root for Card Interactions */}
            <CatalogModalRoot />
        </div>
    )
}
