'use client'

import { useEffect, useMemo, useState } from "react"
import LshapedNavbar, { FilterGroup } from "@/components/shopping/LShapedNavbar"
import HeroScanner from "@/components/shopping/HeroScanner"
import { UiProduct, resolveImgPath, FALLBACK_IMG } from "@/lib/catalog/shared"
import { useBrowseModal } from "@/hooks/useBrowseModal"
import { uiProductToCatalogCard } from "@/lib/catalog/adapter"
import CarouselStage from "@/components/Catalog/CarouselStage"
import CategoryBanner from "@/components/shopping/CategoryBanner"

type ApiImage = { image_name?: string; url?: string }
type ApiVariant = { variant_id?: string; images?: ApiImage[] }
type ApiProduct = {
    product_id: string
    slug?: string
    name: string
    brand_id?: string
    brand_name?: string  // NEW
    base_price?: number | string
    old_price?: number | string
    is_new?: boolean
    type?: string
    fit?: string
    tier?: string
    color_variants?: ApiVariant[]
    affiliate_url?: string
}

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8001"

const TYPE_SECTIONS = [
    { type: "jacket", title: "Jacket" },
    { type: "hoodie", title: "Hoodie" },
    { type: "shirt", title: "Shirt" },
    { type: "tee", title: "Tee" },
    { type: "pants", title: "Pants" },
    { type: "dress", title: "Dress" },
    { type: "shoes", title: "Shoes" },
    { type: "accessories", title: "Accessories" },
    { type: "other", title: "Other" },
] as const

function num(v: unknown, fallback = 0) {
    const n = Number(v)
    return Number.isFinite(n) ? n : fallback
}

function pickBestApiImage(p: ApiProduct): string {
    const img = p.color_variants?.[0]?.images?.[0]
    // Prefer image_name (public/clothing-images pipeline)
    const preferred = img?.image_name || img?.url || FALLBACK_IMG
    return resolveImgPath(String(preferred))
}

function mapApi(p: ApiProduct): UiProduct {
    const img = pickBestApiImage(p)
    const firstVariantId = p.color_variants?.[0]?.variant_id

    return {
        id: String(p.product_id),
        slug: p.slug,
        variantId: firstVariantId,
        name: p.name,
        brandId: p.brand_id,
        brandName: p.brand_name || p.brand_id || "COVE", // NEW: Use name if available
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
        affiliateUrl: p.affiliate_url, // Map from API
    } as UiProduct
}

function uniq(arr: string[]) {
    return Array.from(new Set(arr)).filter(Boolean)
}

export default function ShoppingPageClient() {
    const { open, type, openBrowse, closeBrowse } = useBrowseModal()

    const [searchValue, setSearchValue] = useState("")
    const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({})
    const [allProducts, setAllProducts] = useState<UiProduct[]>([])

    // Hero pill selector state
    const [heroType, setHeroType] = useState<string>("curated") // "curated" | one of types

    useEffect(() => {
        let cancelled = false
            ; (async () => {
                try {
                    console.log('[ShoppingPageClient] API_BASE:', API_BASE)
                    console.log('[ShoppingPageClient] Fetching from:', `${API_BASE}/api/products/?page=1&page_size=10000`)
                    const res = await fetch(`${API_BASE}/api/products/?page=1&page_size=10000`, { cache: "no-store" })
                    console.log('[ShoppingPageClient] Response status:', res.status)
                    if (!res.ok) throw new Error(`HTTP ${res.status}`)
                    const json = await res.json()
                    // Handle pagination or array
                    const items: ApiProduct[] = Array.isArray(json) ? json : (json.results || [])
                    console.log('[ShoppingPageClient] Raw items count:', items.length)

                    // Safe mapping
                    const mapped: UiProduct[] = []
                    items.forEach((p, idx) => {
                        try {
                            mapped.push(mapApi(p))
                        } catch (err) {
                            console.error(`[ShoppingPageClient] Failed to map product index ${idx}:`, err)
                        }
                    })
                    console.log('[ShoppingPageClient] Successfully mapped:', mapped.length)
                    if (mapped.length > 0) console.log('[ShoppingPageClient] First item:', mapped[0])

                    if (!cancelled) setAllProducts(mapped)
                } catch (error) {
                    console.error('[ShoppingPageClient] Fetch error:', error)
                    if (!cancelled) setAllProducts([])
                }
            })()
        return () => {
            cancelled = true
        }
    }, [])

    const filterGroups: FilterGroup[] = useMemo(() => {
        const types = uniq(allProducts.map((p) => (p.type ?? "").trim()).filter(Boolean))
        const tiers = uniq(allProducts.map((p) => (p.tier ?? "").trim()).filter(Boolean))
        const fits = uniq(allProducts.map((p) => (p.fit ?? "").trim()).filter(Boolean))
        const badges = uniq(allProducts.map((p) => (p.badge ?? "").trim()).filter(Boolean))

        return [
            { label: "Type", options: types.length ? types : TYPE_SECTIONS.map((s) => s.title) },
            ...(tiers.length ? [{ label: "Tier", options: tiers }] : []),
            ...(fits.length ? [{ label: "Fit", options: fits }] : []),
            ...(badges.length ? [{ label: "Badge", options: badges }] : []),
        ]
    }, [allProducts])

    const onFilterToggle = (group: string, option: string) => {
        setActiveFilters((prev) => {
            const set = new Set(prev[group] ?? [])
            if (set.has(option)) set.delete(option)
            else set.add(option)
            return { ...prev, [group]: Array.from(set) }
        })
    }

    const onResetAll = () => setActiveFilters({})

    const passesFilters = (p: UiProduct) => {
        const typeSel = new Set(activeFilters["Type"] ?? [])
        const tierSel = new Set(activeFilters["Tier"] ?? [])
        const fitSel = new Set(activeFilters["Fit"] ?? [])
        const badgeSel = new Set(activeFilters["Badge"] ?? [])

        if (typeSel.size && !typeSel.has((p.type ?? "").trim())) return false
        if (tierSel.size && !tierSel.has((p.tier ?? "").trim())) return false
        if (fitSel.size && !fitSel.has((p.fit ?? "").trim())) return false
        if (badgeSel.size && !badgeSel.has((p.badge ?? "").trim())) return false

        const q = searchValue.trim().toLowerCase()
        if (q) {
            const hay = `${p.name ?? ""} ${p.type ?? ""} ${p.tier ?? ""} ${p.fit ?? ""}`.toLowerCase()
            if (!hay.includes(q)) return false
        }

        return true
    }

    // Prepare sections with stats
    // We compute the FULL list of products for each section to get accurate brand counts
    const sectionsWithData = useMemo(() => {
        return TYPE_SECTIONS.map((section) => {
            // All products for this type (ignoring slice for now)
            const fullSectionProducts = allProducts
                .filter(p => (p.type ?? "").toLowerCase().includes(section.type))

            // Unique brands in this entire section
            const uniqueBrands = new Set(fullSectionProducts.map(p => p.brandId || "COVE").filter(Boolean))
            const brandCount = uniqueBrands.size

            // Products valid for display (filtered by nav filters)
            const displayProducts = fullSectionProducts.filter(passesFilters)

            return {
                ...section,
                fullProducts: fullSectionProducts, // Use this for headers/stats if you want stats ignoring filters
                displayProducts: displayProducts,
                brandCount
            }
        })
    }, [allProducts, activeFilters, searchValue]) // Re-calc if products or filters change

    const modalItems = useMemo(() => {
        if (!type) return []
        return allProducts
            .filter(passesFilters)
            .filter((p) => (p.type ?? "").toLowerCase().includes(type))
    }, [type, allProducts, activeFilters, searchValue])

    // Hero options for pill (from data, fall back to TYPE_SECTIONS)
    const heroTypes = useMemo(() => {
        const found = uniq(allProducts.map((p) => (p.type ?? "").trim()).filter(Boolean))
        const fallback = TYPE_SECTIONS.map((s) => s.type)
        const types = found.length ? found : fallback
        return ["curated", ...types]
    }, [allProducts])

    const heroProducts = useMemo(() => {
        const base = allProducts.filter(passesFilters)
        if (heroType === "curated") return base
        return base.filter((p) => (p.type ?? "").toLowerCase().includes(heroType.toLowerCase()))
    }, [allProducts, activeFilters, searchValue, heroType])

    const bestSellers = useMemo(() => {
        const top = allProducts.filter(p => p.badge === "NEW").slice(0, 15)
        return top.length > 5 ? top : allProducts.slice(0, 15)
    }, [allProducts])

    return (
        <LshapedNavbar
            searchValue={searchValue}
            onSearchChange={setSearchValue}
            filterGroups={filterGroups}
            activeFilters={activeFilters}
            onFilterToggle={onFilterToggle}
            onResetAll={onResetAll}
            hero={
                <HeroScanner
                    products={heroProducts}
                    heightVh={70}
                    minHeight={600}
                />
            }
        >
            <div className="relative pb-32">
                {sectionsWithData.map((section, index) => {
                    const { displayProducts, brandCount } = section

                    // Show only if there are products after filtering (or should we show empty sections?)
                    // Let's hide if 0 to keep it clean
                    if (displayProducts.length === 0) return null

                    // Shuffle products for fair visibility
                    const shuffled = [...displayProducts].sort(() => Math.random() - 0.5)

                    // Slice for carousel - Increased to 30
                    const carouselItems = shuffled.slice(0, 30)
                    const cards = carouselItems.map(uiProductToCatalogCard)
                    const bannerImg = carouselItems[0]?.imageSrc || FALLBACK_IMG

                    return (
                        <div key={section.type} className="mb-12 border-b border-black/5 pb-12 last:border-0">
                            {/* Row 1: Intro + Banner */}
                            <div className="flex flex-col md:flex-row h-[320px] md:h-[35vh] min-h-[300px] w-full mb-6">
                                <div className="w-full md:w-[35%] bg-gray-50 flex flex-col justify-center px-6 md:px-10 py-8 border-r border-black/5 relative group">
                                    <div className="text-xs font-bold tracking-widest text-black/40 mb-3 uppercase">
                                        Collection 0{index + 1}
                                    </div>
                                    <h2 className="text-3xl md:text-4xl font-black text-black mb-3 uppercase tracking-tighter">
                                        {section.title}
                                    </h2>
                                    <p className="text-sm text-black/60 leading-relaxed max-w-sm mb-6 line-clamp-3">
                                        Featuring {brandCount} Brand{brandCount !== 1 ? 's' : ''}.
                                        Explore our premium range of {section.title.toLowerCase()}s.
                                        Crafted for style and comfort.
                                    </p>

                                    <div>
                                        <a
                                            href={`/shopping/${section.type}`}
                                            className="inline-flex items-center gap-2 px-6 py-3 bg-black text-white rounded-full font-semibold text-xs hover:scale-105 active:scale-95 transition-all shadow-lg shadow-black/20"
                                        >
                                            Explore {section.title}
                                            <span>→</span>
                                        </a>
                                    </div>
                                </div>

                                <div className="w-full md:w-[65%] relative overflow-hidden rounded-r-3xl">
                                    <CategoryBanner
                                        title={section.title}
                                        imageSrc={bannerImg}
                                        products={section.fullProducts} // START FIX: Pass full products to banner so all brands appear
                                    />
                                </div>
                            </div>

                            {/* Row 2: 3D Carousel */}
                            <div className="w-full overflow-hidden px-2 md:px-6">
                                <div className="relative w-full scale-90 origin-top">
                                    <CarouselStage
                                        cards={cards}
                                        sectionKey={`stage-${section.type}`}
                                        tierLabel={section.title}
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
                        </div>
                    )
                })}
            </div>
        </LshapedNavbar>
    )
}
