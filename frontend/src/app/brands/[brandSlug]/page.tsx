"use client"

import { useEffect, useMemo, useState, use } from "react"
import { useRouter } from "next/navigation"
import LshapedNavbar, { FilterGroup } from "@/src/components/shopping/LShapedNavbar"
import CarouselStage from "@/src/components/Catalog/CarouselStage"
import { UiProduct, resolveImgPath, FALLBACK_IMG } from "@/src/lib/catalog/shared"
import { uiProductToCatalogCard } from "@/src/lib/catalog/adapter"
import HeroScanner from "@/src/components/shopping/HeroScanner"
import CategoryBanner from "@/src/components/shopping/CategoryBanner"
import ProductGridCard from "@/src/components/shopping/ProductGridCard"

// --- Shared Types & Utils (duplicated) ---
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

export default function BrandStorefrontPage({ params }: { params: Promise<{ brandSlug: string }> }) {
    const { brandSlug } = use(params)
    const router = useRouter()

    const [allProducts, setAllProducts] = useState<UiProduct[]>([])
    const [searchValue, setSearchValue] = useState("")
    const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({})

    // Fetch All Data (could be optimized)
    useEffect(() => {
        let cancelled = false
            ; (async () => {
                try {
                    // Fetch products filtered by brand ID if possible, or just fetch all and filter client side
                    // Assuming API supports ?brand_id, but here we fetch all for simplicity like CategoryPage
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

    // 1. Filter by Current Brand (URL)
    // slug matching brand name usually needs normalization
    const normalizedBrandSlug = brandSlug.toLowerCase()

    const brandProducts = useMemo(() => {
        return allProducts.filter(p => (p.brandId ?? "").toLowerCase().replace(/\s+/g, '-') === normalizedBrandSlug)
    }, [allProducts, normalizedBrandSlug])

    // 2. Compute available Sidebar Filters based on the Brand Products
    const filterGroups: FilterGroup[] = useMemo(() => {
        if (!brandProducts.length) return []

        const types = uniq(brandProducts.map((p) => (p.type ?? "").trim()).filter(Boolean))
        const tiers = uniq(brandProducts.map((p) => (p.tier ?? "").trim()).filter(Boolean))
        const fits = uniq(brandProducts.map((p) => (p.fit ?? "").trim()).filter(Boolean))

        return [
            { label: "Type", options: types },
            ...(tiers.length ? [{ label: "Tier", options: tiers }] : []),
            ...(fits.length ? [{ label: "Fit", options: fits }] : []),
        ]
    }, [brandProducts])

    // 3. Apply Sidebar Filters + Search
    const filteredProducts = useMemo(() => {
        return brandProducts.filter((p) => {
            // Search
            if (searchValue) {
                const hay = `${p.name} ${p.type} ${p.tier}`.toLowerCase()
                if (!hay.includes(searchValue.toLowerCase())) return false
            }

            // Sidebar filters
            const typeSel = new Set(activeFilters["Type"] ?? [])
            const tierSel = new Set(activeFilters["Tier"] ?? [])
            const fitSel = new Set(activeFilters["Fit"] ?? [])

            if (typeSel.size && !typeSel.has((p.type ?? "").trim())) return false
            if (tierSel.size && !tierSel.has((p.tier ?? "").trim())) return false
            if (fitSel.size && !fitSel.has((p.fit ?? "").trim())) return false

            return true
        })
    }, [brandProducts, activeFilters, searchValue])

    // Memoize products
    const products = useMemo(() => filteredProducts, [filteredProducts])

    // Derive "Best Sellers" 
    const bestSellers = useMemo(() => products.slice(0, 10).map(uiProductToCatalogCard), [products])

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

    const brandNameDisplay = brandSlug.toUpperCase().replace(/-/g, ' ')

    return (
        <LshapedNavbar
            searchValue={searchValue}
            onSearchChange={setSearchValue}
            filterGroups={filterGroups}
            activeFilters={activeFilters}
            onFilterToggle={onFilterToggle}
            onResetAll={onResetAll}
            // Hero only shows brand products
            hero={
                <div className="relative">
                    <HeroScanner
                        products={brandProducts} // Only this brand's items
                        heightVh={70}
                        minHeight={600}
                    />
                    {/* Muted Text Overlay for Brand Context */}
                    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[10px] font-bold tracking-[0.2em] text-white/40 uppercase">
                        Viewing {brandNameDisplay} Collection
                    </div>
                </div>
            }
        >
            <div className="relative pb-32">
                <div className="px-4 py-4 mb-4">
                    <button
                        onClick={() => router.push('/shopping')} // Or back to Brands list
                        className="text-sm font-medium text-black/50 hover:text-black transition flex items-center gap-1"
                    >
                        ← Back to Shopping
                    </button>
                </div>

                <div className="relative pb-32">
                    {/* 1. Editorial Section */}
                    <div className="mb-16 border-b border-black/5 pb-16">
                        <div className="flex flex-col md:flex-row h-[320px] md:h-[35vh] min-h-[300px] w-full mb-6">
                            {/* Text Area */}
                            <div className="w-full md:w-[35%] bg-gray-50 flex flex-col justify-center px-6 md:px-10 py-8 border-r border-black/5 relative">
                                <div className="text-xs font-bold tracking-widest text-black/40 mb-3 uppercase">
                                    Brand Spotlight
                                </div>
                                <h2 className="text-3xl md:text-4xl font-black text-black mb-3 uppercase tracking-tighter">
                                    {brandNameDisplay}
                                </h2>
                                <p className="text-sm text-black/60 leading-relaxed max-w-sm mb-6 line-clamp-3">
                                    Explore the latest collection from {brandNameDisplay}. Premium quality and exclusive designs.
                                </p>

                                <button
                                    onClick={() => {
                                        document.getElementById('product-grid')?.scrollIntoView({ behavior: 'smooth' })
                                    }}
                                    className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white rounded-full font-semibold text-xs hover:scale-105 active:scale-95 transition-all shadow-lg shadow-black/20"
                                >
                                    Shop Collection ({products.length})
                                    <span>↓</span>
                                </button>
                            </div>

                            {/* Banner Image */}
                            <div className="w-full md:w-[65%] relative overflow-hidden rounded-r-3xl">
                                <CategoryBanner
                                    title={brandSlug}
                                    imageSrc={products[0]?.imageSrc || FALLBACK_IMG}
                                    products={products}
                                />
                            </div>
                        </div>

                        {/* 2. Best Sellers Carousel */}
                        {bestSellers.length > 0 && (
                            <div className="w-full overflow-hidden px-2 md:px-6">
                                <div className="mb-6 px-4">
                                    <h3 className="text-lg font-bold text-black/80">Best of {brandNameDisplay}</h3>
                                </div>
                                <div className="relative w-full scale-90 origin-top-left">
                                    <CarouselStage
                                        cards={bestSellers}
                                        sectionKey={`stage-${brandSlug}-best`}
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

                    {/* 3. Product Grid */}
                    <div id="product-grid" className="px-6 md:px-12 scroll-mt-24">
                        <div className="mb-8 flex items-end justify-between">
                            <div>
                                <h2 className="text-2xl font-bold text-black mb-1">Full Collection</h2>
                                <p className="text-sm text-black/40">{products.length} items</p>
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
