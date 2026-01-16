"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import LshapedNavbar, { FilterGroup } from "@/src/components/shopping/LShapedNavbar"
import CarouselStage from "@/src/components/Catalog/CarouselStage"
import { UiProduct, resolveImgPath, FALLBACK_IMG } from "@/src/lib/catalog/shared"
import { uiProductToCatalogCard } from "@/src/lib/catalog/adapter"
import HeroScanner from "@/src/components/shopping/HeroScanner"

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
                <div className="w-full h-[40vh] min-h-[300px] relative bg-gray-100 overflow-hidden">
                    {/* Reuse HeroScanner with filtered products? Or just a simple banner? 
                        User wanted "seperate page... showing jackets using carousel".
                        Maybe a focused scanner for that category? Let's use HeroScanner but smaller.
                    */}
                    <HeroScanner
                        products={categoryProducts} // Only show products of this category in scanner
                        heightVh={70}
                        minHeight={600}
                    />

                    {/* Category Title Overlay */}
                    <div className="absolute bottom-6 left-6 md:left-12 z-20 pointer-events-none">
                        <h1 className="text-4xl md:text-6xl font-black text-black tracking-tight uppercase">
                            {currentCategory}
                        </h1>
                        <p className="text-sm md:text-base text-black/60 font-medium mt-2">
                            {filteredProducts.length} items found
                        </p>
                    </div>
                </div>
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

                {sortedBrands.length === 0 && (
                    <div className="px-10 py-20 text-center text-black/40">
                        No products found for this category.
                    </div>
                )}

                {sortedBrands.map(brandName => {
                    const products = brandsMap[brandName]
                    const cards = products.map(uiProductToCatalogCard)

                    return (
                        <div key={brandName} className="mb-20">
                            {/* Brand Header */}
                            <div className="px-6 md:px-10 mb-2 flex items-baseline gap-3">
                                <h2 className="text-3xl font-bold text-black">{brandName}</h2>
                                <span className="text-sm text-black/40 font-medium">{products.length} items</span>
                            </div>

                            {/* 3D Carousel Stage */}
                            <div className="w-full overflow-visible">
                                <CarouselStage
                                    cards={cards}
                                    sectionKey={`brand-${brandName}`}
                                    tierLabel={brandName}
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
                    )
                })}
            </div>
        </LshapedNavbar>
    )
}
