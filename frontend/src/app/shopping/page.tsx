"use client"

import { useEffect, useMemo, useState } from "react"
import LshapedNavbar, { FilterGroup } from "@/src/components/shopping/LShapedNavbar"
import HeroScanner from "@/src/components/shopping/HeroScanner"
import { UiProduct, resolveImgPath, FALLBACK_IMG } from "@/src/lib/catalog/shared"
import { useBrowseModal } from "@/src/hooks/useBrowseModal"
import { uiProductToCatalogCard } from "@/src/lib/catalog/adapter"
import CarouselStage from "@/src/components/Catalog/CarouselStage"
import CategoryBanner from "@/src/components/shopping/CategoryBanner"

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
    // IMPORTANT:
    // Prefer image_name (your public/clothing-images pipeline),
    // because url may be S3 signed/blocked and show AccessDenied text.
    const preferred = img?.image_name || img?.url || FALLBACK_IMG
    return resolveImgPath(String(preferred))
}

function mapApi(p: ApiProduct): UiProduct {
    const img = pickBestApiImage(p)
    const firstVariantId = p.color_variants?.[0]?.variant_id

    return {
        id: String(p.product_id),
        slug: p.slug,
        variantId: firstVariantId,  // Include variant ID for product page redirects
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

export default function ShoppingPage() {
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
                    const res = await fetch(`${API_BASE}/api/products/?page=1&page_size=240`, { cache: "no-store" })
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

    const sections = useMemo(() => {
        return TYPE_SECTIONS.map((s) => {
            const items = allProducts
                .filter((p) => (p.type ?? "").toLowerCase().includes(s.type))
                .filter(passesFilters)
                .slice(0, 12)

            return { type: s.type, title: s.title, items }
        })
    }, [allProducts, activeFilters, searchValue])

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

    // Base filter logic (already implemented previously)
    const bestSellers = useMemo(() => {
        // Take items with "NEW" badge or just the first 15 items as "Curated"
        const top = allProducts.filter(p => p.badge === "NEW").slice(0, 15)
        return top.length > 5 ? top : allProducts.slice(0, 15)
    }, [allProducts])

    const carouselCards = useMemo(() => bestSellers.map(uiProductToCatalogCard), [bestSellers])

    return (
        <>
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
                    {/* Iterate over each Type Section to create the "Editorial" layout */}
                    {TYPE_SECTIONS.map((section, index) => {
                        // Filter products for this section (limit to e.g. 15 for the carousel)
                        const sectionProducts = allProducts
                            .filter(p => (p.type ?? "").toLowerCase().includes(section.type))
                            .slice(0, 15)

                        if (sectionProducts.length === 0) return null

                        // Convert to Carousel Cards
                        const cards = sectionProducts.map(uiProductToCatalogCard)

                        // Placeholder Image logic (use first product image or fallback)
                        const bannerImg = sectionProducts[0]?.imageSrc || FALLBACK_IMG

                        return (
                            <div key={section.type} className="mb-12 border-b border-black/5 pb-12 last:border-0">
                                {/* Row 1: Intro Text (35%) + Banner (65%) -> Compact Height */}
                                <div className="flex flex-col md:flex-row h-[320px] md:h-[35vh] min-h-[300px] w-full mb-6">
                                    {/* Text Area (35%) */}
                                    <div className="w-full md:w-[35%] bg-gray-50 flex flex-col justify-center px-6 md:px-10 py-8 border-r border-black/5 relative group">
                                        <div className="text-xs font-bold tracking-widest text-black/40 mb-3 uppercase">
                                            Collection 0{index + 1}
                                        </div>
                                        <h2 className="text-3xl md:text-4xl font-black text-black mb-3 uppercase tracking-tighter">
                                            {section.title}
                                        </h2>
                                        <p className="text-sm text-black/60 leading-relaxed max-w-sm mb-6 line-clamp-3">
                                            Explore our premium range of {section.title.toLowerCase()}s.
                                            Crafted for style and comfort.
                                        </p>

                                        {/* CTA Button Moved Here */}
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

                                    {/* Banner Image (65%) with Animated Brands */}
                                    <div className="w-full md:w-[65%] relative overflow-hidden rounded-r-3xl">
                                        <CategoryBanner
                                            title={section.title}
                                            imageSrc={bannerImg}
                                            products={sectionProducts}
                                        />
                                    </div>
                                </div>

                                {/* Row 2: 3D Carousel (Compact) */}
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
        </>
    )
}
// Removed CatalogBrowseModal import usage
// Removed CatalogSection usage


















// "use client"

// import { useEffect, useMemo, useState } from "react"
// import LshapedNavbar, { FilterGroup } from "@/src/components/shopping/LShapedNavbar"
// import HeroScanner from "@/src/components/shopping/HeroScanner"
// import CatalogSection from "@/src/components/shopping/CatalogSection"
// import CatalogBrowseModal from "@/src/components/shopping/CatalogBrowseModal"
// import { UiProduct, resolveImgPath, FALLBACK_IMG } from "@/src/lib/catalog/shared"
// import { useBrowseModal } from "@/src/hooks/useBrowseModal"

// type ApiImage = { image_name?: string; url?: string }
// type ApiVariant = { images?: ApiImage[] }
// type ApiProduct = {
//     product_id: string
//     slug?: string
//     name: string
//     brand_id?: string
//     base_price?: number | string
//     old_price?: number | string
//     is_new?: boolean
//     type?: string
//     fit?: string
//     tier?: string
//     color_variants?: ApiVariant[]
// }

// const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8001"

// const TYPE_SECTIONS = [
//     { type: "jacket", title: "Jacket" },
//     { type: "hoodie", title: "Hoodie" },
//     { type: "shirt", title: "Shirt" },
//     { type: "tee", title: "Tee" },
//     { type: "pants", title: "Pants" },
// ] as const

// function num(v: unknown, fallback = 0) {
//     const n = Number(v)
//     return Number.isFinite(n) ? n : fallback
// }

// function mapApi(p: ApiProduct): UiProduct {
//     const img0 =
//         p.color_variants?.[0]?.images?.[0]?.url ||
//         p.color_variants?.[0]?.images?.[0]?.image_name ||
//         FALLBACK_IMG

//     const img = resolveImgPath(String(img0))

//     return {
//         id: String(p.product_id),
//         slug: p.slug,
//         name: p.name,
//         brandId: p.brand_id,
//         price: num(p.base_price, 0),
//         oldPrice: p.old_price != null ? num(p.old_price, 0) : undefined,
//         badge: p.is_new ? "NEW" : "",
//         type: p.type,
//         fit: p.fit,
//         tier: p.tier,
//         images: [img],
//         imageSrc: img,
//         colorNames: [],
//         sizes: [],
//     } as UiProduct
// }

// function uniq(arr: string[]) {
//     return Array.from(new Set(arr)).filter(Boolean)
// }

// function FpsMeter() {
//     const [mounted, setMounted] = useState(false)
//     const [fps, setFps] = useState<number | null>(null)

//     useEffect(() => setMounted(true), [])

//     useEffect(() => {
//         if (!mounted) return
//         let raf = 0
//         let last = performance.now()
//         let frames = 0

//         const loop = () => {
//             frames += 1
//             const now = performance.now()
//             const dt = now - last

//             if (dt >= 500) {
//                 setFps(Math.round((frames * 1000) / dt))
//                 frames = 0
//                 last = now
//             }

//             raf = requestAnimationFrame(loop)
//         }

//         raf = requestAnimationFrame(loop)
//         return () => cancelAnimationFrame(raf)
//     }, [mounted])

//     if (!mounted) return null

//     return (
//         <div className="fixed top-3 right-3 z-[9999]">
//             <div className="px-2.5 py-1.5 rounded-full bg-black/75 text-white text-xs font-semibold backdrop-blur">
//                 {fps ?? "--"} FPS
//             </div>
//         </div>
//     )
// }

// export default function ShoppingPage() {
//     const { open, type, openBrowse, closeBrowse } = useBrowseModal()

//     const [searchValue, setSearchValue] = useState("")
//     const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({})
//     const [allProducts, setAllProducts] = useState<UiProduct[]>([])

//     useEffect(() => {
//         let cancelled = false
//             ; (async () => {
//                 try {
//                     const res = await fetch(`${API_BASE}/api/products/?page=1&page_size=240`, { cache: "no-store" })
//                     if (!res.ok) throw new Error(`HTTP ${res.status}`)
//                     const json = await res.json()
//                     const items: ApiProduct[] = json.results || []
//                     const mapped = items.map(mapApi)
//                     if (!cancelled) setAllProducts(mapped)
//                 } catch {
//                     if (!cancelled) setAllProducts([])
//                 }
//             })()
//         return () => {
//             cancelled = true
//         }
//     }, [])

//     const filterGroups: FilterGroup[] = useMemo(() => {
//         const types = uniq(allProducts.map((p) => (p.type ?? "").trim()).filter(Boolean))
//         const tiers = uniq(allProducts.map((p) => (p.tier ?? "").trim()).filter(Boolean))
//         const fits = uniq(allProducts.map((p) => (p.fit ?? "").trim()).filter(Boolean))
//         const badges = uniq(allProducts.map((p) => (p.badge ?? "").trim()).filter(Boolean))

//         return [
//             { label: "Type", options: types.length ? types : TYPE_SECTIONS.map((s) => s.title) },
//             ...(tiers.length ? [{ label: "Tier", options: tiers }] : []),
//             ...(fits.length ? [{ label: "Fit", options: fits }] : []),
//             ...(badges.length ? [{ label: "Badge", options: badges }] : []),
//         ]
//     }, [allProducts])

//     const onFilterToggle = (group: string, option: string) => {
//         setActiveFilters((prev) => {
//             const set = new Set(prev[group] ?? [])
//             if (set.has(option)) set.delete(option)
//             else set.add(option)
//             return { ...prev, [group]: Array.from(set) }
//         })
//     }

//     const onResetAll = () => setActiveFilters({})

//     const passesFilters = (p: UiProduct) => {
//         const typeSel = new Set(activeFilters["Type"] ?? [])
//         const tierSel = new Set(activeFilters["Tier"] ?? [])
//         const fitSel = new Set(activeFilters["Fit"] ?? [])
//         const badgeSel = new Set(activeFilters["Badge"] ?? [])

//         if (typeSel.size && !typeSel.has((p.type ?? "").trim())) return false
//         if (tierSel.size && !tierSel.has((p.tier ?? "").trim())) return false
//         if (fitSel.size && !fitSel.has((p.fit ?? "").trim())) return false
//         if (badgeSel.size && !badgeSel.has((p.badge ?? "").trim())) return false

//         const q = searchValue.trim().toLowerCase()
//         if (q) {
//             const hay = `${p.name ?? ""} ${p.type ?? ""} ${p.tier ?? ""} ${p.fit ?? ""}`.toLowerCase()
//             if (!hay.includes(q)) return false
//         }

//         return true
//     }

//     const sections = useMemo(() => {
//         return TYPE_SECTIONS.map((s) => {
//             const items = allProducts
//                 .filter((p) => (p.type ?? "").toLowerCase().includes(s.type))
//                 .filter(passesFilters)
//                 .slice(0, 12)

//             return { type: s.type, title: s.title, items }
//         })
//     }, [allProducts, activeFilters, searchValue])

//     const modalItems = useMemo(() => {
//         if (!type) return []
//         return allProducts
//             .filter(passesFilters)
//             .filter((p) => (p.type ?? "").toLowerCase().includes(type))
//     }, [type, allProducts, activeFilters, searchValue])

//     return (
//         <>
//             <FpsMeter />

//             <LshapedNavbar
//                 searchValue={searchValue}
//                 onSearchChange={setSearchValue}
//                 filterGroups={filterGroups}
//                 activeFilters={activeFilters}
//                 onFilterToggle={onFilterToggle}
//                 onResetAll={onResetAll}
//                 hero={<HeroScanner products={allProducts.filter(passesFilters)} heightVh={70} minHeight={600} />}
//             >
//                 <div className="relative">
//                     <div className="px-4 md:px-6 py-6 space-y-8">
//                         <div>
//                             <div className="text-lg font-semibold text-black/85">Browse</div>
//                             <div className="text-xs text-black/45">
//                                 Curated shelves (fast) → open “Show more” for full inventory
//                             </div>
//                         </div>

//                         {sections.map((s) => (
//                             <div key={s.type} className="space-y-3">
//                                 <CatalogSection title={s.title.toLowerCase()} items={s.items} />

//                                 <div className="flex justify-end">
//                                     <button
//                                         onClick={() => openBrowse(s.type)}
//                                         className="rounded-full bg-black text-white px-4 py-2 text-xs font-medium hover:scale-[1.02] active:scale-[0.98] transition"
//                                     >
//                                         Show more
//                                     </button>
//                                 </div>
//                             </div>
//                         ))}
//                     </div>
//                 </div>
//             </LshapedNavbar>

//             <CatalogBrowseModal open={open} type={type} items={modalItems} onClose={closeBrowse} />
//         </>
//     )
// }















// "use client"

// import { useCallback, useEffect, useMemo, useRef, useState } from "react"
// import LShapedNavbar, { FilterGroup } from "@/src/components/shopping/LShapedNavbar"

// const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8001"

// /** ---------- Safe fallback (NO network) ---------- */
// const FALLBACK_DATA_URI =
//     "data:image/svg+xml;utf8," +
//     encodeURIComponent(`
//     <svg xmlns="http://www.w3.org/2000/svg" width="400" height="400">
//       <defs>
//         <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
//           <stop offset="0" stop-color="#f3f4f6"/>
//           <stop offset="1" stop-color="#e5e7eb"/>
//         </linearGradient>
//       </defs>
//       <rect width="100%" height="100%" fill="url(#g)"/>
//       <text x="50%" y="52%" dominant-baseline="middle" text-anchor="middle"
//         font-family="Arial" font-size="16" fill="#9ca3af" letter-spacing="4">
//         COVE
//       </text>
//     </svg>
//   `)

// function ProductImg({
//     src,
//     alt,
//     className,
// }: {
//     src?: string
//     alt: string
//     className?: string
// }) {
//     return (
//         <img
//             src={src || FALLBACK_DATA_URI}
//             alt={alt}
//             className={className}
//             loading="lazy"
//             decoding="async"
//             draggable={false}
//             onDragStart={(e) => e.preventDefault()}
//             onError={(e) => {
//                 const img = e.currentTarget as HTMLImageElement
//                 img.onerror = null
//                 img.src = FALLBACK_DATA_URI
//             }}
//         />
//     )
// }

// /** ---------- Types ---------- */
// type Brand = { brand_id: string; brand_name: string }

// type ApiImage = { image_name?: string; url?: string }
// type ApiVariant = { images?: ApiImage[]; color_name?: string }
// type ApiProduct = {
//     product_id: string
//     slug?: string
//     name: string
//     brand_id?: string
//     base_price?: number | string
//     is_new?: boolean
//     type?: string
//     fit?: string
//     tier?: string
//     color_variants?: ApiVariant[]
// }

// type UiProduct = {
//     id: string
//     slug?: string
//     name: string
//     brandId?: string
//     price: number
//     imageSrc: string
//     badge?: string
//     type?: string
//     fit?: string
//     tier?: string
// }

// function num(v: unknown, fallback = 0) {
//     const n = Number(v)
//     return Number.isFinite(n) ? n : fallback
// }

// function buildImageSrc(p: ApiProduct) {
//     const firstVariant = p.color_variants?.[0]
//     const imgObj = firstVariant?.images?.[0]
//     const raw = imgObj?.url || imgObj?.image_name

//     if (!raw) return FALLBACK_DATA_URI
//     if (String(raw).startsWith("http")) return String(raw)
//     if (String(raw).startsWith("/")) return String(raw)
//     return `/clothing-images/${raw}`
// }

// function formatPriceEUR(value: number) {
//     try {
//         return new Intl.NumberFormat("de-DE", {
//             style: "currency",
//             currency: "EUR",
//             maximumFractionDigits: 2,
//         }).format(value)
//     } catch {
//         return `€${value}`
//     }
// }

// function clamp(n: number, a: number, b: number) {
//     return Math.max(a, Math.min(b, n))
// }

// /** ---------- FPS meter ---------- */
// function FPSMeter() {
//     const [fps, setFps] = useState(0)
//     const rafRef = useRef<number | null>(null)

//     useEffect(() => {
//         let last = performance.now()
//         let frames = 0
//         let acc = 0

//         const loop = (t: number) => {
//             const dt = t - last
//             last = t
//             frames++
//             acc += dt
//             if (acc >= 500) {
//                 setFps(Math.round((frames * 1000) / acc))
//                 frames = 0
//                 acc = 0
//             }
//             rafRef.current = requestAnimationFrame(loop)
//         }

//         rafRef.current = requestAnimationFrame(loop)
//         return () => {
//             if (rafRef.current) cancelAnimationFrame(rafRef.current)
//         }
//     }, [])

//     return (
//         <div className="fixed top-3 right-3 z-[9999] rounded-lg border border-black/10 bg-white/90 px-2 py-1 text-[11px] font-medium text-black shadow-sm">
//             FPS {fps}
//         </div>
//     )
// }

// /** ---------- Hero layout (panel only 30% larger) ---------- */
// type HeroLayout = {
//     viewW: number
//     viewH: number
//     panelW: number
//     panelH: number
//     tile: number
//     gap: number
//     cols: number
//     rows: number
//     pad: number
//     gridW: number
//     gridH: number
//     minX: number
//     maxX: number
//     minY: number
//     maxY: number
// }

// function computeHeroLayout(heroW: number, heroH: number): HeroLayout {
//     const pad = heroW >= 1024 ? 18 : 14

//     const viewW = Math.max(320, heroW - pad * 2)
//     const viewH = Math.max(320, heroH - pad * 2)

//     // panel is only 30% larger
//     const panelW = Math.floor(viewW * 1.3)
//     const panelH = Math.floor(viewH * 1.3)

//     // tiles are small; gap is prominent (≈2x tile size)
//     const tile = clamp(Math.floor(viewW / 20), 28, 44) // small, consistent
//     const gap = clamp(Math.floor(tile * 2.0), 44, 92)
//     const cols = clamp(Math.floor((panelW + gap) / (tile + gap)), 6, 14)
//     const rows = clamp(Math.floor((panelH + gap) / (tile + gap)), 5, 12)

//     const gridW = cols * tile + (cols - 1) * gap
//     const gridH = rows * tile + (rows - 1) * gap

//     // bounds so there is never empty space in hero
//     const minX = Math.min(0, viewW - gridW)
//     const minY = Math.min(0, viewH - gridH)

//     // center the panel initially
//     // (we'll set initial x/y to half-range)
//     const maxX = 0
//     const maxY = 0

//     return {
//         viewW,
//         viewH,
//         panelW,
//         panelH,
//         tile,
//         gap,
//         cols,
//         rows,
//         pad,
//         gridW,
//         gridH,
//         minX,
//         maxX,
//         minY,
//         maxY,
//     }
// }

// export default function ShoppingPage() {
//     const [search, setSearch] = useState("")
//     const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({})
//     const [brands, setBrands] = useState<Brand[]>([])
//     const [products, setProducts] = useState<UiProduct[]>([])
//     const [isCatalogLoading, setIsCatalogLoading] = useState(true)

//     /** ---------- HERO refs ---------- */
//     const heroRef = useRef<HTMLElement | null>(null)
//     const canvasRef = useRef<HTMLDivElement | null>(null)

//     const [heroLayout, setHeroLayout] = useState<HeroLayout>(() => {
//         // safe initial
//         return computeHeroLayout(1200, 640)
//     })

//     const [heroItems, setHeroItems] = useState<UiProduct[]>([])
//     const heroItemsRef = useRef<UiProduct[]>([])
//     useEffect(() => {
//         heroItemsRef.current = heroItems
//     }, [heroItems])

//     const [selectedId, setSelectedId] = useState<string | null>(null)
//     const selectedIdRef = useRef<string | null>(null)
//     useEffect(() => {
//         selectedIdRef.current = selectedId
//     }, [selectedId])

//     // Tag line (script later)
//     const tagLines = useMemo(
//         () => [
//             "Hot picks of 2025",
//             "Best selling jackets",
//             "Winter collection",
//             "Trending hoodies",
//         ],
//         []
//     )
//     const [tagIndex, setTagIndex] = useState(0)

//     /** ---------- Fetch brands + products ---------- */
//     useEffect(() => {
//         let mounted = true

//         async function fetchAll() {
//             try {
//                 setIsCatalogLoading(true)

//                 const brandsRes = await fetch(`${API_BASE}/api/brands/`)
//                 if (brandsRes.ok) {
//                     const brandsData = await brandsRes.json()
//                     const list: Brand[] = brandsData.results || brandsData || []
//                     if (mounted) setBrands(list)
//                 }

//                 const all: ApiProduct[] = []
//                 let page = 1
//                 let hasMore = true

//                 while (hasMore) {
//                     const res = await fetch(`${API_BASE}/api/products/?page=${page}&page_size=200`)
//                     if (!res.ok) break
//                     const data = await res.json()
//                     const batch: ApiProduct[] = data.results || []
//                     all.push(...batch)
//                     hasMore = Boolean(data.next)
//                     page += 1
//                     if (page > 50) break
//                 }

//                 const unique = new Map<string, ApiProduct>()
//                 all.forEach((p) => {
//                     if (!unique.has(p.product_id)) unique.set(p.product_id, p)
//                 })

//                 const formatted: UiProduct[] = Array.from(unique.values()).map((p) => ({
//                     id: String(p.product_id),
//                     slug: p.slug,
//                     name: p.name,
//                     brandId: p.brand_id,
//                     price: num(p.base_price, 0),
//                     imageSrc: buildImageSrc(p),
//                     badge: p.is_new ? "NEW" : "",
//                     type: p.type ?? "clothing",
//                     fit: p.fit ?? "regular",
//                     tier: p.tier ?? "casual",
//                 }))

//                 if (mounted) setProducts(formatted)
//             } catch (e) {
//                 console.error("Failed to fetch shopping data", e)
//             } finally {
//                 if (mounted) setIsCatalogLoading(false)
//             }
//         }

//         fetchAll()
//         return () => {
//             mounted = false
//         }
//     }, [])

//     /** ---------- HERO layout on resize ---------- */
//     useEffect(() => {
//         const apply = () => {
//             const hero = heroRef.current
//             if (!hero) return
//             const r = hero.getBoundingClientRect()
//             setHeroLayout(computeHeroLayout(r.width, r.height))
//         }
//         const t = requestAnimationFrame(apply)
//         window.addEventListener("resize", apply, { passive: true })
//         return () => {
//             cancelAnimationFrame(t)
//             window.removeEventListener("resize", apply)
//         }
//     }, [])

//     /** ---------- Build hero items: only enough to fill panel ---------- */
//     const totalHeroTiles = heroLayout.cols * heroLayout.rows

//     const shuffleOnce = useCallback((arr: UiProduct[]) => {
//         const a = [...arr]
//         for (let i = a.length - 1; i > 0; i--) {
//             const j = Math.floor(Math.random() * (i + 1))
//                 ;[a[i], a[j]] = [a[j], a[i]]
//         }
//         return a
//     }, [])

//     useEffect(() => {
//         if (products.length === 0) return

//         // pick only what's needed
//         const picked = shuffleOnce(products).slice(0, totalHeroTiles)
//         while (picked.length < totalHeroTiles) picked.push(...shuffleOnce(products))
//         const final = picked.slice(0, totalHeroTiles)

//         setHeroItems(final)
//         setSelectedId(final[0]?.id ?? null)
//     }, [products, totalHeroTiles, shuffleOnce])

//     /** ---------- Filters ---------- */
//     const filterGroups = useMemo<FilterGroup[]>(() => {
//         const typeSet = new Set<string>()
//         const fitSet = new Set<string>()

//         products.forEach((p) => {
//             if (p.type) typeSet.add(p.type)
//             if (p.fit) fitSet.add(p.fit)
//         })

//         return [
//             { label: "Brand", options: brands.map((b) => b.brand_name).sort() },
//             { label: "Type", options: Array.from(typeSet).sort() },
//             { label: "Fit", options: Array.from(fitSet).sort() },
//         ]
//     }, [products, brands])

//     const handleFilterChange = useCallback((category: string, option: string) => {
//         setActiveFilters((prev) => {
//             const current = prev[category] || []
//             const isSelected = current.includes(option)
//             const next = isSelected ? current.filter((x) => x !== option) : [...current, option]
//             if (next.length === 0) {
//                 const copy = { ...prev }
//                 delete copy[category]
//                 return copy
//             }
//             return { ...prev, [category]: next }
//         })
//     }, [])

//     const handleResetAll = useCallback(() => {
//         setActiveFilters({})
//         setSearch("")
//     }, [])

//     const filteredProducts = useMemo(() => {
//         const q = search.trim().toLowerCase()
//         return products.filter((p) => {
//             const brandName = (brands.find((b) => b.brand_id === p.brandId)?.brand_name ?? "").toLowerCase()
//             const matchesSearch = !q || p.name.toLowerCase().includes(q) || brandName.includes(q)
//             if (!matchesSearch) return false

//             const entries = Object.entries(activeFilters)
//             if (entries.length === 0) return true

//             return entries.every(([cat, opts]) => {
//                 if (cat === "Brand") {
//                     const bn = brands.find((b) => b.brand_id === p.brandId)?.brand_name
//                     return bn ? opts.includes(bn) : false
//                 }
//                 if (cat === "Type") return opts.includes(p.type ?? "")
//                 if (cat === "Fit") return opts.includes(p.fit ?? "")
//                 return true
//             })
//         })
//     }, [products, search, activeFilters, brands])

//     /** ---------- HERO: one driver (no vibration) ---------- */
//     const drag = useRef({
//         down: false,
//         pid: -1,
//         startX: 0,
//         startY: 0,
//         baseX: 0,
//         baseY: 0,
//         x: 0,
//         y: 0,
//         tx: 0,
//         ty: 0,
//     })

//     // precomputed centers
//     const centersRef = useRef<{ cx: number; cy: number }[]>([])

//     const recomputeCentersAndInit = useCallback(() => {
//         const centers: { cx: number; cy: number }[] = []
//         for (let i = 0; i < totalHeroTiles; i++) {
//             const col = i % heroLayout.cols
//             const row = Math.floor(i / heroLayout.cols)
//             const cx = col * (heroLayout.tile + heroLayout.gap) + heroLayout.tile / 2
//             const cy = row * (heroLayout.tile + heroLayout.gap) + heroLayout.tile / 2
//             centers.push({ cx, cy })
//         }
//         centersRef.current = centers

//         // init position: center the extra area
//         const d = drag.current
//         const initX = (heroLayout.minX - 0) / 2
//         const initY = (heroLayout.minY - 0) / 2
//         d.x = initX
//         d.y = initY
//         d.tx = initX
//         d.ty = initY

//         if (canvasRef.current) {
//             // IMPORTANT: no transition on transform
//             canvasRef.current.style.transition = "none"
//             canvasRef.current.style.transform = `translate3d(${heroLayout.pad + d.x}px, ${heroLayout.pad + d.y}px, 0)`
//         }
//     }, [heroLayout, totalHeroTiles])

//     useEffect(() => {
//         recomputeCentersAndInit()
//     }, [recomputeCentersAndInit])

//     useEffect(() => {
//         const hero = heroRef.current
//         if (!hero) return

//         // critical for stable pointer drag
//         hero.style.touchAction = "none"
//         hero.style.userSelect = "none"

//         const onDown = (e: PointerEvent) => {
//             // ignore right click
//             if ((e as any).button === 2) return

//             drag.current.down = true
//             drag.current.pid = e.pointerId
//             drag.current.startX = e.clientX
//             drag.current.startY = e.clientY
//             drag.current.baseX = drag.current.tx
//             drag.current.baseY = drag.current.ty

//                 // pointer capture prevents "losing" move events
//                 ; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
//             e.preventDefault()
//         }

//         const onMove = (e: PointerEvent) => {
//             if (!drag.current.down || drag.current.pid !== e.pointerId) return
//             const dx = e.clientX - drag.current.startX
//             const dy = e.clientY - drag.current.startY

//             const rawX = drag.current.baseX + dx
//             const rawY = drag.current.baseY + dy

//             drag.current.tx = clamp(rawX, heroLayout.minX, heroLayout.maxX)
//             drag.current.ty = clamp(rawY, heroLayout.minY, heroLayout.maxY)
//             e.preventDefault()
//         }

//         const onUp = (e: PointerEvent) => {
//             if (drag.current.pid !== e.pointerId) return
//             drag.current.down = false
//             drag.current.pid = -1
//             e.preventDefault()
//         }

//         hero.addEventListener("pointerdown", onDown, { passive: false })
//         hero.addEventListener("pointermove", onMove, { passive: false })
//         hero.addEventListener("pointerup", onUp, { passive: false })
//         hero.addEventListener("pointercancel", onUp, { passive: false })

//         return () => {
//             hero.removeEventListener("pointerdown", onDown)
//             hero.removeEventListener("pointermove", onMove)
//             hero.removeEventListener("pointerup", onUp)
//             hero.removeEventListener("pointercancel", onUp)
//         }
//     }, [heroLayout])

//     // rAF apply transform + selection (no resizing, no curvature)
//     useEffect(() => {
//         let raf = 0
//         let lastSelect = 0

//         const loop = () => {
//             const hero = heroRef.current
//             const canvas = canvasRef.current
//             if (!hero || !canvas) {
//                 raf = requestAnimationFrame(loop)
//                 return
//             }

//             const d = drag.current

//             // follow (smooth + stable)
//             const follow = d.down ? 0.42 : 0.22
//             d.x += (d.tx - d.x) * follow
//             d.y += (d.ty - d.y) * follow

//             // apply only to canvas (no children transforms => zero vibration)
//             canvas.style.transform = `translate3d(${heroLayout.pad + d.x}px, ${heroLayout.pad + d.y}px, 0)`

//             // selection: closest to scanner center (throttled)
//             const now = performance.now()
//             if (now - lastSelect > 100) {
//                 lastSelect = now
//                 const centers = centersRef.current
//                 const cxTarget = heroLayout.viewW / 2
//                 const cyTarget = heroLayout.viewH / 2

//                 let bestIdx = 0
//                 let bestDist = Infinity
//                 for (let i = 0; i < centers.length; i++) {
//                     const c = centers[i]
//                     const px = c.cx + d.x
//                     const py = c.cy + d.y
//                     const dx = px - cxTarget
//                     const dy = py - cyTarget
//                     const dist = dx * dx + dy * dy
//                     if (dist < bestDist) {
//                         bestDist = dist
//                         bestIdx = i
//                     }
//                 }

//                 const item = heroItemsRef.current[bestIdx]
//                 if (item && item.id !== selectedIdRef.current) setSelectedId(item.id)
//             }

//             raf = requestAnimationFrame(loop)
//         }

//         raf = requestAnimationFrame(loop)
//         return () => cancelAnimationFrame(raf)
//     }, [heroLayout])

//     // rotate tag text slowly (cheap)
//     useEffect(() => {
//         const id = window.setInterval(() => {
//             setTagIndex((i) => (i + 1) % tagLines.length)
//         }, 3500)
//         return () => window.clearInterval(id)
//     }, [tagLines.length])

//     const selected = useMemo(() => {
//         if (!selectedId) return heroItems[0]
//         return heroItems.find((x) => x.id === selectedId) ?? heroItems[0]
//     }, [heroItems, selectedId])

//     const selectedBrand = useMemo(() => {
//         if (!selected?.brandId) return "Cove"
//         return brands.find((b) => b.brand_id === selected.brandId)?.brand_name ?? "Cove"
//     }, [brands, selected])

//     return (
//         <div className="w-full bg-white text-neutral-900 antialiased">
//             <FPSMeter />

//             {/* HERO */}
//             <section
//                 ref={heroRef as any}
//                 className="relative overflow-hidden"
//                 style={{
//                     width: "100vw",
//                     left: "50%",
//                     transform: "translateX(-50%)",
//                     height: "70vh",
//                     minHeight: 520,
//                     background:
//                         "linear-gradient(180deg, rgba(250,250,250,1) 0%, rgba(255,255,255,1) 55%, rgba(255,255,255,1) 100%)",
//                 }}
//             >
//                 {/* tag pill */}
//                 <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20">
//                     <div className="rounded-full border border-black/10 bg-white/85 px-4 py-2 text-xs font-medium text-black/70 shadow-sm">
//                         {tagLines[tagIndex]}
//                     </div>
//                 </div>

//                 {/* Canvas (pure transform) */}
//                 <div className="absolute inset-0">
//                     <div
//                         ref={canvasRef}
//                         className="will-change-transform"
//                         style={{
//                             position: "absolute",
//                             top: 0,
//                             left: 0,
//                             display: "grid",
//                             gridTemplateColumns: `repeat(${heroLayout.cols}, ${heroLayout.tile}px)`,
//                             gridTemplateRows: `repeat(${heroLayout.rows}, ${heroLayout.tile}px)`,
//                             gap: `${heroLayout.gap}px`,
//                             transform: `translate3d(${heroLayout.pad}px, ${heroLayout.pad}px, 0)`,
//                             // IMPORTANT: no transitions, no filters, no blur
//                             transition: "none",
//                             filter: "none",
//                             contain: "layout paint style",
//                             pointerEvents: "none", // keeps drag super stable
//                         }}
//                     >
//                         {Array.from({ length: totalHeroTiles }).map((_, i) => {
//                             const p = heroItems[i]
//                             return (
//                                 <div
//                                     key={p?.id ?? `hero-${i}`}
//                                     className="rounded-xl overflow-hidden border border-black/10 bg-white shadow-[0_8px_18px_rgba(0,0,0,0.08)]"
//                                     style={{
//                                         width: heroLayout.tile,
//                                         height: heroLayout.tile,
//                                         transform: "translateZ(0)",
//                                     }}
//                                 >
//                                     <ProductImg
//                                         src={p?.imageSrc}
//                                         alt={p?.name ?? "Cove item"}
//                                         className="h-full w-full object-cover"
//                                     />
//                                 </div>
//                             )
//                         })}
//                     </div>
//                 </div>

//                 {/* Smaller squarish scanner */}
//                 <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
//                     <div
//                         className="relative pointer-events-none"
//                         style={{
//                             width: "min(520px, 86vw)",
//                             height: "min(320px, 46vh)", // squarish but still enough for CTAs
//                         }}
//                     >
//                         <div className="absolute inset-0 rounded-[22px] bg-white/88 border border-black/10 shadow-[0_18px_60px_rgba(0,0,0,0.18)]" />

//                         {/* content card fills scanner */}
//                         <div className="absolute inset-0 p-4">
//                             <div className="h-full w-full rounded-[18px] border border-black/10 bg-white overflow-hidden">
//                                 <div className="h-full w-full grid" style={{ gridTemplateColumns: "40% 60%" }}>
//                                     {/* left image */}
//                                     <div className="relative bg-neutral-100">
//                                         <ProductImg
//                                             src={selected?.imageSrc}
//                                             alt={selected?.name ?? "Selected"}
//                                             className="absolute inset-0 h-full w-full object-cover"
//                                         />
//                                         <div className="absolute top-3 left-3 rounded-full bg-white/90 border border-black/10 px-3 py-1 text-[10px] font-bold tracking-[0.18em] text-black/60">
//                                             SCAN
//                                         </div>
//                                     </div>

//                                     {/* right info + CTAs */}
//                                     <div className="p-4 flex flex-col justify-between">
//                                         <div>
//                                             <div className="text-[10px] tracking-[0.24em] font-bold text-black/45">
//                                                 {selectedBrand.toUpperCase()}
//                                             </div>
//                                             <div className="mt-1 text-sm font-semibold text-black/85 line-clamp-2">
//                                                 {selected?.name ?? "Select an item"}
//                                             </div>
//                                             <div className="mt-2 text-sm text-black/70">
//                                                 {selected ? formatPriceEUR(selected.price) : ""}
//                                             </div>
//                                             <div className="mt-2 text-[11px] text-black/45">
//                                                 Drag the panel — center selects
//                                             </div>
//                                         </div>

//                                         <div className="flex flex-col gap-2">
//                                             <button
//                                                 className="w-full rounded-xl bg-black text-white py-2.5 text-xs font-medium shadow-sm"
//                                                 type="button"
//                                             >
//                                                 Buy Now
//                                             </button>
//                                             <button
//                                                 className="w-full rounded-xl border border-black/15 bg-white py-2.5 text-xs font-medium text-black/80"
//                                                 type="button"
//                                             >
//                                                 Go to Product Page
//                                             </button>
//                                         </div>
//                                     </div>
//                                 </div>
//                             </div>

//                             {/* corner brackets (cheap, no blur) */}
//                             <div className="absolute inset-0 rounded-[22px] pointer-events-none">
//                                 {["tl", "tr", "bl", "br"].map((pos) => (
//                                     <div
//                                         key={pos}
//                                         className="absolute w-8 h-8"
//                                         style={{
//                                             borderColor: "rgba(0,0,0,0.35)",
//                                             borderStyle: "solid",
//                                             borderWidth:
//                                                 pos === "tl"
//                                                     ? "2px 0 0 2px"
//                                                     : pos === "tr"
//                                                         ? "2px 2px 0 0"
//                                                         : pos === "bl"
//                                                             ? "0 0 2px 2px"
//                                                             : "0 2px 2px 0",
//                                             borderRadius:
//                                                 pos === "tl"
//                                                     ? "18px 0 0 0"
//                                                     : pos === "tr"
//                                                         ? "0 18px 0 0"
//                                                         : pos === "bl"
//                                                             ? "0 0 0 18px"
//                                                             : "0 0 18px 0",
//                                             top: pos.includes("t") ? 14 : undefined,
//                                             bottom: pos.includes("b") ? 14 : undefined,
//                                             left: pos.includes("l") ? 14 : undefined,
//                                             right: pos.includes("r") ? 14 : undefined,
//                                         }}
//                                     />
//                                 ))}
//                             </div>
//                         </div>
//                     </div>
//                 </div>
//             </section>

//             {/* CATALOG + L-NAVBAR */}
//             <section className="relative bg-white">
//                 <LShapedNavbar
//                     topHeight="clamp(3.25rem, 5vw, 4.75rem)"
//                     railWidth="clamp(4.25rem, 7vw, 7rem)"
//                     edgeGap="clamp(0.75rem, 1.6vw, 1.25rem)"
//                     searchValue={search}
//                     onSearchChange={setSearch}
//                     activeFilters={activeFilters}
//                     onFilterChange={handleFilterChange}
//                     onResetAll={handleResetAll}
//                     filterGroups={filterGroups}
//                 >
//                     <div className="relative">
//                         <div className="flex items-center justify-between py-6">
//                             <div>
//                                 <h2 className="text-xl font-medium tracking-tight">New Arrivals</h2>
//                                 <p className="text-sm text-neutral-500 mt-0.5">{filteredProducts.length} products</p>
//                             </div>
//                         </div>

//                         {isCatalogLoading && (
//                             <div className="absolute inset-0 z-20 flex items-center justify-center">
//                                 <div className="rounded-2xl bg-white/92 border border-neutral-200 px-6 py-4 shadow-sm">
//                                     <p className="text-sm font-medium text-neutral-900">Curating your shop…</p>
//                                     <p className="text-xs text-neutral-500 mt-1">Loading catalog from backend</p>
//                                 </div>
//                             </div>
//                         )}

//                         <div className="pb-10">
//                             <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
//                                 {filteredProducts.map((p) => {
//                                     const brandName = brands.find((b) => b.brand_id === p.brandId)?.brand_name ?? "Cove"

//                                     return (
//                                         <article key={p.id} className="group cursor-pointer">
//                                             <div className="relative aspect-[3/4] rounded-xl bg-neutral-100 overflow-hidden mb-3 border border-neutral-200">
//                                                 <ProductImg
//                                                     src={p.imageSrc}
//                                                     alt={p.name}
//                                                     className="absolute inset-0 h-full w-full object-cover"
//                                                 />
//                                                 {!!p.badge && (
//                                                     <div className="absolute top-2 left-2 px-2 py-0.5 text-xs font-medium text-white rounded bg-neutral-900">
//                                                         {p.badge}
//                                                     </div>
//                                                 )}
//                                             </div>

//                                             <div>
//                                                 <p className="text-xs text-neutral-500 mb-0.5">{brandName}</p>
//                                                 <h3 className="text-sm font-medium truncate">{p.name}</h3>
//                                                 <p className="text-sm text-neutral-600 mt-1">{formatPriceEUR(p.price)}</p>
//                                             </div>
//                                         </article>
//                                     )
//                                 })}
//                             </div>

//                             {!isCatalogLoading && filteredProducts.length === 0 && (
//                                 <div className="py-20 text-center text-neutral-500">No items found. Try resetting filters.</div>
//                             )}
//                         </div>
//                     </div>
//                 </LShapedNavbar>
//             </section>
//         </div>
//     )
// }


