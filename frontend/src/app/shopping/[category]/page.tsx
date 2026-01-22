"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import LshapedNavbar, { FilterGroup } from "@/src/components/shopping/LShapedNavbar"
import CarouselStage from "@/src/components/Catalog/CarouselStage"
import { UiProduct, resolveImgPath, FALLBACK_IMG } from "@/src/lib/catalog/shared"
import { uiProductToCatalogCard } from "@/src/lib/catalog/adapter"
import HeroScanner from "@/src/components/shopping/HeroScanner"
import CategoryBanner from "@/src/components/shopping/CategoryBanner"
import ProductGridCard from "@/src/components/shopping/ProductGridCard"

// --- Shared Types & Utils (duplicated from shopping/page.tsx for isolation) ---
type ApiImage = { image_name?: string; url?: string }
type ApiVariant = { variant_id?: string; images?: ApiImage[] }
type ApiProduct = {
    product_id: string
    slug?: string
    name: string
    brand_id?: string
    base_price?: number | string
    old_price?: number | string
    is_new?: boolean
    type?: string
    fit?: string
    tier?: string
    color_variants?: ApiVariant[]
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8001"

const TYPE_SECTIONS = [
    { type: "jacket", title: "Jacket" },
    { type: "hoodie", title: "Hoodie" },
    { type: "shirt", title: "Shirt" },
    { type: "tee", title: "Tee" },
    { type: "pants", title: "Pants" },
] as const

function num(v: unknown, fallback = 0) {
    const n = Number(v)
    return Number.isFinite(n) ? n : fallback
}

function pickBestApiImage(p: ApiProduct): string {
    const img = p.color_variants?.[0]?.images?.[0]
    const preferred = img?.image_name || img?.url || FALLBACK_IMG
    return resolveImgPath(String(preferred))
}

function mapApi(p: ApiProduct): UiProduct {
    const img = pickBestApiImage(p)
    return {
        id: String(p.product_id),
        slug: p.slug,
        variantId: p.color_variants?.[0]?.variant_id,
        name: p.name,
        brandId: p.brand_id,
        price: num(p.base_price, 0),
        oldPrice: p.old_price != null ? num(p.old_price, 0) : undefined,
        badge: p.is_new ? "NEW" : "",
        type: p.type,
        fit: p.fit,
        tier: p.tier,
        images: [img],
        imageSrc: img,
        colorNames: [],
        sizes: [],
    } as UiProduct
}

function uniq(arr: string[]) {
    return Array.from(new Set(arr)).filter(Boolean)
}

function capitalize(s: string) {
    if (!s) return ""
    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()
}

export default function CategoryPage() {
    const params = useParams()
    const router = useRouter()

    // "category" from URL
    const categoryRaw = (params?.category as string) || ""
    const currentCategory = categoryRaw.toLowerCase()

    const [allProducts, setAllProducts] = useState<UiProduct[]>([])
    const [searchValue, setSearchValue] = useState("")
    const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({})

    // Fetch All Data (could be optimized to fetch by category, but simplified for now)
    useEffect(() => {
        let cancelled = false
            ; (async () => {
                try {
                    // Fetch reasonably large page to get good coverage
                    const res = await fetch(`${API_BASE}/api/products/?page=1&page_size=300`, { cache: "no-store" })
                    if (!res.ok) throw new Error(`HTTP ${res.status}`)
                    const json = await res.json()
                    const items: ApiProduct[] = json.results || []
                    const mapped = items.map(mapApi)
                    if (!cancelled) setAllProducts(mapped)
                } catch {
                    if (!cancelled) setAllProducts([])
                }
            })()
        return () => {
            cancelled = true
        }
    }, [])

    // --- Filter logic ---

    // 1. Filter by Current Category (URL)
    const categoryProducts = useMemo(() => {
        return allProducts.filter(p => (p.type ?? "").toLowerCase().includes(currentCategory))
    }, [allProducts, currentCategory])

    // 2. Compute available Sidebar Filters based on the Category Products
    const filterGroups: FilterGroup[] = useMemo(() => {
        if (!categoryProducts.length) return []

        const tiers = uniq(categoryProducts.map((p) => (p.tier ?? "").trim()).filter(Boolean))
        const fits = uniq(categoryProducts.map((p) => (p.fit ?? "").trim()).filter(Boolean))
        const brands = uniq(categoryProducts.map((p) => (p.brandId ?? "COVE").trim()).filter(Boolean))

        return [
            { label: "Brand", options: brands },
            ...(tiers.length ? [{ label: "Tier", options: tiers }] : []),
            ...(fits.length ? [{ label: "Fit", options: fits }] : []),
        ]
    }, [categoryProducts])

    // 3. Apply Sidebar Filters + Search
    const filteredProducts = useMemo(() => {
        return categoryProducts.filter((p) => {
            // Search
            if (searchValue) {
                const hay = `${p.name} ${p.brandId} ${p.tier}`.toLowerCase()
                if (!hay.includes(searchValue.toLowerCase())) return false
            }

            // Sidebar filters
            const tierSel = new Set(activeFilters["Tier"] ?? [])
            const fitSel = new Set(activeFilters["Fit"] ?? [])
            const brandSel = new Set(activeFilters["Brand"] ?? [])

            if (tierSel.size && !tierSel.has((p.tier ?? "").trim())) return false
            if (fitSel.size && !fitSel.has((p.fit ?? "").trim())) return false
            if (brandSel.size && !brandSel.has((p.brandId ?? "COVE").trim())) return false

            return true
        })
    }, [categoryProducts, activeFilters, searchValue])

    // Memoize products to avoid re-layout
    const products = useMemo(() => filteredProducts, [filteredProducts])

    // Derive "Best Sellers" (for now, just the first 10 items)
    const bestSellers = useMemo(() => products.slice(0, 10).map(uiProductToCatalogCard), [products])

    // --- Group by Brand for Carousels ---
    const brandsMap = useMemo(() => {
        const groups: Record<string, UiProduct[]> = {}

        filteredProducts.forEach(p => {
            // Default to 'COVE' if no brand
            const brand = p.brandId || "COVE"
            if (!groups[brand]) groups[brand] = []
            groups[brand].push(p)
        })

        return groups
    }, [filteredProducts])

    // Sorted brand names (put COVE first if present, or alphabetical)
    const sortedBrands = useMemo(() => {
        return Object.keys(brandsMap).sort((a, b) => {
            if (a === "COVE") return -1
            if (b === "COVE") return 1
            return a.localeCompare(b)
        })
    }, [brandsMap])

    // Handlers
    const onFilterToggle = (group: string, option: string) => {
        setActiveFilters((prev) => {
            const set = new Set(prev[group] ?? [])
            if (set.has(option)) set.delete(option)
            else set.add(option)
            return { ...prev, [group]: Array.from(set) }
        })
    }
    const onResetAll = () => setActiveFilters({})

    return (
        <LshapedNavbar
            searchValue={searchValue}
            onSearchChange={setSearchValue}
            filterGroups={filterGroups}
            activeFilters={activeFilters}
            onFilterToggle={onFilterToggle}
            onResetAll={onResetAll}
            // Optional: We can show a smaller hero or specific hero for the category
            hero={
                <HeroScanner
                    products={categoryProducts}
                    heightVh={70}
                    minHeight={600}
                />
            }
        >
            <div className="relative pb-32">
                <div className="px-4 py-4 mb-4">
                    <button
                        onClick={() => router.push('/shopping')}
                        className="text-sm font-medium text-black/50 hover:text-black transition flex items-center gap-1"
                    >
                        ← Back to Shopping
                    </button>
                </div>

                <div className="relative pb-32">
                    {/* 1. Editorial Section (Single View) */}
                    <div className="mb-16 border-b border-black/5 pb-16">
                        <div className="flex flex-col md:flex-row h-[320px] md:h-[35vh] min-h-[300px] w-full mb-6">
                            {/* Text Area (CTA inside) */}
                            <div className="w-full md:w-[35%] bg-gray-50 flex flex-col justify-center px-6 md:px-10 py-8 border-r border-black/5 relative">
                                <div className="text-xs font-bold tracking-widest text-black/40 mb-3 uppercase">
                                    {currentCategory} Collection
                                </div>
                                <h2 className="text-3xl md:text-4xl font-black text-black mb-3 uppercase tracking-tighter">
                                    {currentCategory}
                                </h2>
                                <p className="text-sm text-black/60 leading-relaxed max-w-sm mb-6 line-clamp-3">
                                    Curated selection of premium {currentCategory}s from top global brands.
                                </p>

                                {/* "Scroll to Grid" Button */}
                                <div>
                                    <button
                                        onClick={() => {
                                            document.getElementById('product-grid')?.scrollIntoView({ behavior: 'smooth' })
                                        }}
                                        className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white rounded-full font-semibold text-xs hover:scale-105 active:scale-95 transition-all shadow-lg shadow-black/20"
                                    >
                                        View All {products.length} Items
                                        <span>↓</span>
                                    </button>
                                </div>
                            </div>

                            {/* Banner Image with Brand Loop */}
                            <div className="w-full md:w-[65%] relative overflow-hidden rounded-r-3xl">
                                <CategoryBanner
                                    title={currentCategory}
                                    imageSrc={products[0]?.imageSrc || FALLBACK_IMG}
                                    products={products}
                                />
                            </div>
                        </div>

                        {/* 2. Best Sellers Carousel (Compact) */}
                        {bestSellers.length > 0 && (
                            <div className="w-full overflow-hidden px-2 md:px-6">
                                <div className="mb-6 px-4">
                                    <h3 className="text-lg font-bold text-black/80">Trending Now</h3>
                                </div>
                                <div className="relative w-full scale-90 origin-top-left">
                                    <CarouselStage
                                        cards={bestSellers}
                                        sectionKey={`stage-${currentCategory}-best`}
                                        tierLabel="Best Sellers"
                                        isFilterOpen={false}
                                        filtersForTier={{}}
                                        availableTypes={[]}
                                        availableFits={[]}
                                        availableMaterials={[]}
                                        onTypeChange={() => { }}
                                        onFitChange={() => { }}
                                        onMaterialChange={() => { }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 3. Product Grid (The Rest) */}
                    <div id="product-grid" className="px-6 md:px-12 scroll-mt-24">
                        <div className="mb-8 flex items-end justify-between">
                            <div>
                                <h2 className="text-2xl font-bold text-black mb-1">All {currentCategory}s</h2>
                                <p className="text-sm text-black/40">{products.length} items available</p>
                            </div>

                            {/* Simple Quick Filters (Placeholder for Phase 3) */}
                            <div className="flex gap-2">
                                {['Price', 'Brand', 'Size'].map(f => (
                                    <button key={f} className="px-4 py-2 rounded-full border border-black/10 text-xs font-medium hover:bg-black hover:text-white transition-colors">
                                        {f} +
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-12">
                            {products.map(p => (
                                <ProductGridCard key={p.id} product={p} />
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </LshapedNavbar>
    )
}

