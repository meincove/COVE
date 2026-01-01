"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Heart, ChevronDown } from "lucide-react"
import LShapedNavbar, { FilterGroup } from "@/src/components/shopping/LShapedNavbar"
import ShoppableHero from "@/src/components/shopping/ShoppableHero"

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8001"

/** Backend shapes (adjust only if your API differs) */
type Brand = { brand_id: string; brand_name: string }

type ApiImage = { image_name?: string; url?: string }
type ApiSize = { size: string; stock?: number }
type ApiVariant = {
    color_name?: string
    images?: ApiImage[]
    sizes?: ApiSize[]
}
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

type UiProduct = {
    id: string
    name: string
    slug?: string
    brandId?: string
    price: number
    oldPrice?: number
    badge?: string
    type?: string
    fit?: string
    tier?: string
    colorNames: string[]
    sizes: string[]
    imageSrc: string
}

/** ---- helpers ---- */
function safeImg(src?: string) {
    if (!src) return "/clothing-images/fallback.jpg"
    return src
}

function ProductImg({
    src,
    alt,
    className,
}: {
    src?: string
    alt: string
    className?: string
}) {
    return (
        <img
            src={safeImg(src)}
            alt={alt}
            className={className}
            loading="lazy"
            decoding="async"
            draggable={false}
            onError={(e) => {
                const target = e.currentTarget as HTMLImageElement
                if (target.src.includes("fallback.jpg")) return
                target.src = "/clothing-images/fallback.jpg"
            }}
        />
    )
}

function num(v: unknown, fallback = 0) {
    const n = Number(v)
    return Number.isFinite(n) ? n : fallback
}

function formatPriceEUR(value: number) {
    try {
        return new Intl.NumberFormat("de-DE", {
            style: "currency",
            currency: "EUR",
            maximumFractionDigits: 2,
        }).format(value)
    } catch {
        return `€${value}`
    }
}

function buildImageSrc(p: ApiProduct) {
    const firstVariant = p.color_variants?.[0]
    const imgObj = firstVariant?.images?.[0]
    const raw = imgObj?.url || imgObj?.image_name

    if (!raw) return "/clothing-images/fallback.jpg"
    if (String(raw).startsWith("http")) return String(raw)
    if (String(raw).startsWith("/")) return String(raw)
    return `/clothing-images/${raw}`
}





export default function ShoppingPage() {
    const [search, setSearch] = useState("")
    const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({})

    const [brands, setBrands] = useState<Brand[]>([])
    const [products, setProducts] = useState<UiProduct[]>([])
    const [visibleCount, setVisibleCount] = useState(40)
    const [isCatalogLoading, setIsCatalogLoading] = useState(true)

    // FPS overlay removed from here

    /** ---- Fetch brands + products ---- */
    useEffect(() => {
        let mountedFlag = true

        async function fetchAll() {
            try {
                setIsCatalogLoading(true)

                const brandsRes = await fetch(`${API_BASE}/api/brands/`)
                if (brandsRes.ok) {
                    const brandsData = await brandsRes.json()
                    const list: Brand[] = brandsData.results || brandsData || []
                    if (mountedFlag) setBrands(list)
                }

                const all: ApiProduct[] = []
                let page = 1
                let hasMore = true

                while (hasMore) {
                    const res = await fetch(`${API_BASE}/api/products/?page=${page}&page_size=200`)
                    if (!res.ok) break
                    const data = await res.json()
                    const batch: ApiProduct[] = data.results || []
                    all.push(...batch)
                    hasMore = Boolean(data.next)
                    page += 1
                    if (page > 50) break
                }

                const unique = new Map<string, ApiProduct>()
                all.forEach((p) => {
                    if (!unique.has(p.product_id)) unique.set(p.product_id, p)
                })

                const formatted: UiProduct[] = Array.from(unique.values()).map((p) => {
                    const firstVariant = p.color_variants?.[0]

                    const sizes: string[] = []
                    firstVariant?.sizes?.forEach((s) => {
                        if (s?.size) sizes.push(s.size)
                    })

                    const colorNames: string[] = []
                    p.color_variants?.forEach((v) => {
                        if (v?.color_name) colorNames.push(v.color_name)
                    })

                    const badge = p.is_new ? "NEW" : ""

                    return {
                        id: String(p.product_id),
                        slug: p.slug,
                        name: p.name,
                        brandId: p.brand_id,
                        price: num(p.base_price, 0),
                        oldPrice: p.old_price !== undefined && p.old_price !== null ? num(p.old_price) : undefined,
                        badge,
                        type: p.type ?? "clothing",
                        fit: p.fit ?? "regular",
                        tier: p.tier ?? "casual",
                        sizes,
                        colorNames,
                        imageSrc: buildImageSrc(p),
                    }
                })

                if (mountedFlag) setProducts(formatted)
            } catch (e) {
                console.error("Failed to fetch shopping data", e)
            } finally {
                if (mountedFlag) setIsCatalogLoading(false)
            }
        }

        fetchAll()
        return () => {
            mountedFlag = false
        }
    }, [])

    /** ---- Filters ---- */
    const filterGroups = useMemo<FilterGroup[]>(() => {
        const typeSet = new Set<string>()
        const fitSet = new Set<string>()
        const colorSet = new Set<string>()
        const sizeSet = new Set<string>()

        products.forEach((p) => {
            if (p.type) typeSet.add(p.type)
            if (p.fit) fitSet.add(p.fit)
            p.colorNames.forEach((c) => colorSet.add(c))
            p.sizes.forEach((s) => sizeSet.add(s))
        })

        const sizeOrder = ["XS", "S", "M", "L", "XL", "XXL", "3XL"]
        const sortedSizes = Array.from(sizeSet).sort((a, b) => {
            const ia = sizeOrder.indexOf(a)
            const ib = sizeOrder.indexOf(b)
            if (ia !== -1 && ib !== -1) return ia - ib
            return a.localeCompare(b)
        })

        return [
            { label: "Brand", options: brands.map((b) => b.brand_name).sort() },
            { label: "Type", options: Array.from(typeSet).sort() },
            { label: "Fit", options: Array.from(fitSet).sort() },
            { label: "Color", options: Array.from(colorSet).sort() },
            { label: "Size", options: sortedSizes },
        ]
    }, [products, brands])

    const handleFilterChange = useCallback((category: string, option: string) => {
        setActiveFilters((prev) => {
            const current = prev[category] || []
            const isSelected = current.includes(option)
            const next = isSelected ? current.filter((x) => x !== option) : [...current, option]

            if (next.length === 0) {
                const copy = { ...prev }
                delete copy[category]
                return copy
            }
            return { ...prev, [category]: next }
        })
    }, [])

    const handleResetAll = useCallback(() => {
        setActiveFilters({})
        setSearch("")
    }, [])

    const filteredProducts = useMemo(() => {
        const q = search.trim().toLowerCase()

        return products.filter((p) => {
            const brandName = (brands.find((b) => b.brand_id === p.brandId)?.brand_name ?? "").toLowerCase()

            const matchesSearch =
                !q ||
                p.name.toLowerCase().includes(q) ||
                (p.type ?? "").toLowerCase().includes(q) ||
                brandName.includes(q)

            if (!matchesSearch) return false

            const entries = Object.entries(activeFilters)
            if (entries.length === 0) return true

            return entries.every(([cat, opts]) => {
                if (cat === "Brand") {
                    const bn = brands.find((b) => b.brand_id === p.brandId)?.brand_name
                    return bn ? opts.includes(bn) : false
                }
                if (cat === "Type") return opts.includes(p.type ?? "")
                if (cat === "Fit") return opts.includes(p.fit ?? "")
                if (cat === "Color") return p.colorNames.some((c) => opts.includes(c))
                if (cat === "Size") return p.sizes.some((s) => opts.includes(s))
                return true
            })
        })
    }, [products, search, activeFilters, brands])

    /** ---- Filters ---- */

    return (
        <div className="w-full bg-white text-neutral-900 antialiased">
            {/* HERO */}
            <ShoppableHero products={products} />

            {/* CATALOG + L-NAVBAR */}
            <section className="relative bg-white">
                <LShapedNavbar
                    topHeight="clamp(3.25rem, 5vw, 4.75rem)"
                    railWidth="clamp(4.25rem, 7vw, 7rem)"
                    edgeGap="clamp(0.75rem, 1.6vw, 1.25rem)"
                    searchValue={search}
                    onSearchChange={setSearch}
                    activeFilters={activeFilters}
                    onFilterChange={handleFilterChange}
                    onResetAll={handleResetAll}
                    filterGroups={filterGroups}
                >
                    <div className="relative">
                        <div className="flex items-center justify-between py-6">
                            <div>
                                <h2 className="text-xl font-medium tracking-tight">New Arrivals</h2>
                                <p className="text-sm text-neutral-500 mt-0.5">
                                    {filteredProducts.length} products
                                </p>
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="text-xs text-neutral-500">Sort by:</span>
                                <button className="flex items-center gap-1 px-3 py-1.5 text-xs text-neutral-600 bg-neutral-100 border border-neutral-200 rounded-lg hover:bg-neutral-200 transition-colors">
                                    Featured <ChevronDown className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        </div>

                        {isCatalogLoading && (
                            <div className="absolute inset-0 z-20 flex items-center justify-center">
                                <div className="rounded-2xl bg-white/85 border border-neutral-200 px-6 py-4">
                                    <p className="text-sm font-medium text-neutral-900">Curating your shop…</p>
                                    <p className="text-xs text-neutral-500 mt-1">Loading catalog from backend</p>
                                </div>
                            </div>
                        )}

                        <div className="pb-10">
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
                                {filteredProducts.slice(0, visibleCount).map((p) => {
                                    const brandName =
                                        brands.find((b) => b.brand_id === p.brandId)?.brand_name ?? "Cove"

                                    return (
                                        <article key={p.id} className="group cursor-pointer">
                                            <div className="relative aspect-[3/4] rounded-xl bg-neutral-100 overflow-hidden mb-3 border border-neutral-200">
                                                <ProductImg
                                                    src={p.imageSrc}
                                                    alt={p.name}
                                                    className="absolute inset-0 h-full w-full object-cover"
                                                />

                                                {!!p.badge && (
                                                    <div
                                                        className={[
                                                            "absolute top-2 left-2 px-2 py-0.5 text-xs font-medium text-white rounded",
                                                            p.badge === "NEW" ? "bg-neutral-900" : "bg-emerald-600",
                                                        ].join(" ")}
                                                    >
                                                        {p.badge}
                                                    </div>
                                                )}

                                                <button className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/85 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Heart className="h-4 w-4 text-neutral-600" />
                                                </button>

                                                <div className="absolute inset-x-2 bottom-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button className="w-full py-2 text-xs font-medium bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors">
                                                        Quick Add
                                                    </button>
                                                </div>
                                            </div>

                                            <div>
                                                <p className="text-xs text-neutral-500 mb-0.5">{brandName}</p>
                                                <h3 className="text-sm font-medium truncate group-hover:text-neutral-600 transition-colors">
                                                    {p.name}
                                                </h3>

                                                {p.oldPrice ? (
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <p className="text-sm text-neutral-600">{formatPriceEUR(p.price)}</p>
                                                        <p className="text-sm text-neutral-400 line-through">
                                                            {formatPriceEUR(p.oldPrice)}
                                                        </p>
                                                    </div>
                                                ) : (
                                                    <p className="text-sm text-neutral-600 mt-1">{formatPriceEUR(p.price)}</p>
                                                )}
                                            </div>
                                        </article>
                                    )
                                })}
                            </div>

                            {visibleCount < filteredProducts.length && (
                                <div className="mt-12 flex justify-center">
                                    <button
                                        onClick={() => setVisibleCount((p) => p + 40)}
                                        className="px-6 py-3 bg-neutral-900 text-white font-medium rounded-full hover:bg-neutral-800 transition-colors shadow-lg shadow-black/10"
                                    >
                                        Load More ({filteredProducts.length - visibleCount} remaining)
                                    </button>
                                </div>
                            )}

                            {!isCatalogLoading && filteredProducts.length === 0 && (
                                <div className="py-20 text-center text-neutral-500">
                                    No items found. Try resetting filters.
                                </div>
                            )}
                        </div>
                    </div>
                </LShapedNavbar>
            </section>
        </div>
    )
}







//Main Current Working Code

// "use client"

// import { useCallback, useEffect, useMemo, useRef, useState } from "react"
// import { Heart, ChevronDown } from "lucide-react"
// import LShapedNavbar, { FilterGroup } from "@/src/components/shopping/LShapedNavbar"

// const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8001"

// /** Backend shapes (adjust only if your API differs) */
// type Brand = { brand_id: string; brand_name: string }

// type ApiImage = { image_name?: string; url?: string }
// type ApiSize = { size: string; stock?: number }
// type ApiVariant = {
//     color_name?: string
//     images?: ApiImage[]
//     sizes?: ApiSize[]
// }
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

// type UiProduct = {
//     id: string
//     name: string
//     slug?: string
//     brandId?: string
//     price: number
//     oldPrice?: number
//     badge?: string
//     type?: string
//     fit?: string
//     tier?: string
//     colorNames: string[]
//     sizes: string[]
//     imageSrc: string
// }

// /** ---- helpers ---- */
// function safeImg(src?: string) {
//     if (!src) return "/clothing-images/fallback.jpg"
//     return src
// }

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
//             src={safeImg(src)}
//             alt={alt}
//             className={className}
//             loading="lazy"
//             decoding="async"
//             draggable={false}
//             onError={(e) => {
//                 ; (e.currentTarget as HTMLImageElement).src =
//                     "/clothing-images/fallback.jpg"
//             }}
//         />
//     )
// }

// function num(v: unknown, fallback = 0) {
//     const n = Number(v)
//     return Number.isFinite(n) ? n : fallback
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

// /** ---- hero grid sizing (Aura-like) ---- */
// function calcGridSize(w: number) {
//     if (w >= 1024) return { cols: 8, rows: 4 }
//     if (w >= 768) return { cols: 6, rows: 4 }
//     if (w >= 640) return { cols: 5, rows: 4 }
//     return { cols: 4, rows: 5 }
// }

// const HERO_TOPICS = [
//     {
//         key: "jackets",
//         pill: "Best selling jackets",
//         match: (p: UiProduct) => (p.type ?? "").toLowerCase().includes("jacket"),
//     },
//     {
//         key: "hoodies",
//         pill: "Trending hoodies",
//         match: (p: UiProduct) => (p.type ?? "").toLowerCase().includes("hoodie"),
//     },
//     {
//         key: "shirts",
//         pill: "Popular shirts",
//         match: (p: UiProduct) => (p.type ?? "").toLowerCase().includes("shirt"),
//     },
//     {
//         key: "new",
//         pill: "New arrivals",
//         match: (p: UiProduct) => (p.badge ?? "").toLowerCase() === "new",
//     },
// ]

// function buildImageSrc(p: ApiProduct) {
//     const firstVariant = p.color_variants?.[0]
//     const imgObj = firstVariant?.images?.[0]
//     const raw = imgObj?.url || imgObj?.image_name

//     if (!raw) return "/clothing-images/fallback.jpg"

//     // If backend sends full URL
//     if (String(raw).startsWith("http")) return String(raw)

//     // If backend sends already-rooted path
//     if (String(raw).startsWith("/")) return String(raw)

//     // Otherwise assume it is a filename in /public/clothing-images
//     return `/clothing-images/${raw}`
// }

// export default function ShoppingPage() {
//     const heroRef = useRef<HTMLElement | null>(null)
//     const gridRef = useRef<HTMLDivElement | null>(null)

//     const [search, setSearch] = useState("")
//     const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>(
//         {}
//     )

//     const [brands, setBrands] = useState<Brand[]>([])
//     const [products, setProducts] = useState<UiProduct[]>([])
//     const [isCatalogLoading, setIsCatalogLoading] = useState(true)

//     /** ---- HERO grid state ---- */
//     const [gridCount, setGridCount] = useState(() =>
//         calcGridSize(typeof window !== "undefined" ? window.innerWidth : 1200)
//     )
//     const totalHeroCards = gridCount.cols * gridCount.rows

//     /** ---- Resize -> hero grid changes ---- */
//     useEffect(() => {
//         const onResize = () => setGridCount(calcGridSize(window.innerWidth))
//         window.addEventListener("resize", onResize, { passive: true })
//         return () => window.removeEventListener("resize", onResize)
//     }, [])

//     /** ---- Hero parallax ---- */
//     useEffect(() => {
//         const hero = heroRef.current
//         const grid = gridRef.current
//         if (!hero || !grid) return

//         let raf: number | null = null

//         const onMove = (e: MouseEvent) => {
//             const rect = hero.getBoundingClientRect()
//             const x = (e.clientX - rect.left) / rect.width - 0.5
//             const y = (e.clientY - rect.top) / rect.height - 0.5

//             if (raf) cancelAnimationFrame(raf)
//             raf = requestAnimationFrame(() => {
//                 grid.style.transform = `rotateY(${x * 3}deg) rotateX(${-y * 3}deg)`
//             })
//         }

//         const onLeave = () => {
//             grid.style.transition = "transform 0.5s ease"
//             grid.style.transform = "rotateY(0) rotateX(0)"
//         }

//         const onEnter = () => {
//             grid.style.transition = "transform 0.1s ease"
//         }

//         hero.addEventListener("mousemove", onMove)
//         hero.addEventListener("mouseleave", onLeave)
//         hero.addEventListener("mouseenter", onEnter)

//         return () => {
//             hero.removeEventListener("mousemove", onMove)
//             hero.removeEventListener("mouseleave", onLeave)
//             hero.removeEventListener("mouseenter", onEnter)
//             if (raf) cancelAnimationFrame(raf)
//         }
//     }, [])

//     /** ---- Fetch brands + products (real backend data) ---- */
//     useEffect(() => {
//         let mounted = true

//         async function fetchAll() {
//             try {
//                 setIsCatalogLoading(true)

//                 // Brands
//                 const brandsRes = await fetch(`${API_BASE}/api/brands/`)
//                 if (brandsRes.ok) {
//                     const brandsData = await brandsRes.json()
//                     const list: Brand[] = brandsData.results || brandsData || []
//                     if (mounted) setBrands(list)
//                 }

//                 // Products (paginated)
//                 const all: ApiProduct[] = []
//                 let page = 1
//                 let hasMore = true

//                 while (hasMore) {
//                     const res = await fetch(
//                         `${API_BASE}/api/products/?page=${page}&page_size=200`
//                     )
//                     if (!res.ok) break
//                     const data = await res.json()

//                     const batch: ApiProduct[] = data.results || []
//                     all.push(...batch)

//                     hasMore = Boolean(data.next)
//                     page += 1
//                     if (page > 50) break // safety
//                 }

//                 // unique by product_id
//                 const unique = new Map<string, ApiProduct>()
//                 all.forEach((p) => {
//                     if (!unique.has(p.product_id)) unique.set(p.product_id, p)
//                 })

//                 const formatted: UiProduct[] = Array.from(unique.values()).map((p) => {
//                     const firstVariant = p.color_variants?.[0]

//                     const sizes: string[] = []
//                     firstVariant?.sizes?.forEach((s) => {
//                         if (s?.size) sizes.push(s.size)
//                     })

//                     const colorNames: string[] = []
//                     p.color_variants?.forEach((v) => {
//                         if (v?.color_name) colorNames.push(v.color_name)
//                     })

//                     const badge = p.is_new ? "NEW" : ""

//                     return {
//                         id: String(p.product_id),
//                         slug: p.slug,
//                         name: p.name,
//                         brandId: p.brand_id,
//                         price: num(p.base_price, 0),
//                         oldPrice:
//                             p.old_price !== undefined && p.old_price !== null
//                                 ? num(p.old_price)
//                                 : undefined,
//                         badge,
//                         type: p.type ?? "clothing",
//                         fit: p.fit ?? "regular",
//                         tier: p.tier ?? "casual",
//                         sizes,
//                         colorNames,
//                         imageSrc: buildImageSrc(p),
//                     }
//                 })

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

//     /** ---- Build filter groups for left rail ---- */
//     const filterGroups = useMemo<FilterGroup[]>(() => {
//         const typeSet = new Set<string>()
//         const fitSet = new Set<string>()
//         const colorSet = new Set<string>()
//         const sizeSet = new Set<string>()

//         products.forEach((p) => {
//             if (p.type) typeSet.add(p.type)
//             if (p.fit) fitSet.add(p.fit)
//             p.colorNames.forEach((c) => colorSet.add(c))
//             p.sizes.forEach((s) => sizeSet.add(s))
//         })

//         // size ordering
//         const sizeOrder = ["XS", "S", "M", "L", "XL", "XXL", "3XL"]
//         const sortedSizes = Array.from(sizeSet).sort((a, b) => {
//             const ia = sizeOrder.indexOf(a)
//             const ib = sizeOrder.indexOf(b)
//             if (ia !== -1 && ib !== -1) return ia - ib
//             return a.localeCompare(b)
//         })

//         return [
//             { label: "Brand", options: brands.map((b) => b.brand_name).sort() },
//             { label: "Type", options: Array.from(typeSet).sort() },
//             { label: "Fit", options: Array.from(fitSet).sort() },
//             { label: "Color", options: Array.from(colorSet).sort() },
//             { label: "Size", options: sortedSizes },
//         ]
//     }, [products, brands])

//     /** ---- Filter handlers ---- */
//     const handleFilterChange = useCallback(
//         (category: string, option: string) => {
//             setActiveFilters((prev) => {
//                 const current = prev[category] || []
//                 const isSelected = current.includes(option)
//                 const next = isSelected
//                     ? current.filter((x) => x !== option)
//                     : [...current, option]

//                 if (next.length === 0) {
//                     const copy = { ...prev }
//                     delete copy[category]
//                     return copy
//                 }
//                 return { ...prev, [category]: next }
//             })
//         },
//         []
//     )

//     const handleResetAll = useCallback(() => {
//         setActiveFilters({})
//         setSearch("")
//     }, [])

//     /** ---- Filtered catalog products ---- */
//     const filteredProducts = useMemo(() => {
//         const q = search.trim().toLowerCase()

//         return products.filter((p) => {
//             // search match
//             const brandName =
//                 (brands.find((b) => b.brand_id === p.brandId)?.brand_name ?? "").toLowerCase()

//             const matchesSearch =
//                 !q ||
//                 p.name.toLowerCase().includes(q) ||
//                 (p.type ?? "").toLowerCase().includes(q) ||
//                 brandName.includes(q)

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
//                 if (cat === "Color") return p.colorNames.some((c) => opts.includes(c))
//                 if (cat === "Size") return p.sizes.some((s) => opts.includes(s))
//                 return true
//             })
//         })
//     }, [products, search, activeFilters, brands])

//     /** ---- HERO topic + hero products ---- */
//     const heroTopic = useMemo(() => {
//         const first = HERO_TOPICS.find((t) => products.some(t.match))
//         return first ?? HERO_TOPICS[0]
//     }, [products])

//     const heroProducts = useMemo(() => {
//         const pool = products.filter(heroTopic.match)
//         const base = pool.length >= totalHeroCards ? pool : products
//         return base.slice(0, totalHeroCards)
//     }, [products, heroTopic, totalHeroCards])

//     return (
//         <div className="w-full bg-white text-neutral-900 antialiased">
//             {/* HERO */}
//             <section
//                 ref={heroRef as any}
//                 className="relative w-full overflow-hidden bg-gradient-to-b from-stone-50 to-white"
//                 style={{ height: "65vh", minHeight: 500 }}
//             >
//                 {/* subtle blobs */}
//                 <div className="absolute inset-0 overflow-hidden">
//                     <div
//                         className="absolute h-96 w-96 rounded-full opacity-20"
//                         style={{
//                             background:
//                                 "radial-gradient(circle, rgba(251,191,36,0.3) 0%, transparent 70%)",
//                             top: "10%",
//                             left: "10%",
//                         }}
//                     />
//                     <div
//                         className="absolute h-80 w-80 rounded-full opacity-15"
//                         style={{
//                             background:
//                                 "radial-gradient(circle, rgba(244,114,182,0.3) 0%, transparent 70%)",
//                             top: "40%",
//                             right: "15%",
//                         }}
//                     />
//                 </div>

//                 {/* center overlay */}
//                 <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
//                     <div className="text-center max-w-2xl bg-white/60 backdrop-blur-sm rounded-3xl py-8 px-10 pointer-events-auto">
//                         <p className="text-xs text-neutral-500 tracking-widest uppercase mb-3">
//                             COVE — CURATED DROPS
//                         </p>
//                         <h1 className="text-3xl sm:text-4xl md:text-5xl font-medium tracking-tight leading-tight">
//                             Discover your next favorite fit
//                         </h1>
//                         <p className="mt-3 text-sm text-neutral-600">
//                             Filter by fit, color, type — powered by Cove catalog.
//                         </p>
//                     </div>
//                 </div>

//                 {/* hero mini cards grid */}
//                 <div
//                     ref={gridRef}
//                     className="absolute inset-0 grid gap-3 p-4"
//                     style={{
//                         perspective: "1000px",
//                         gridTemplateColumns: `repeat(${gridCount.cols}, minmax(0, 1fr))`,
//                         transformStyle: "preserve-3d",
//                     }}
//                 >
//                     {Array.from({ length: totalHeroCards }).map((_, i) => {
//                         const p = heroProducts[i]
//                         const isSkeleton = !p

//                         return (
//                             <div
//                                 key={p?.id ?? `hero-skel-${i}`}
//                                 className="rounded-xl overflow-hidden bg-white border border-neutral-200/60"
//                             >
//                                 <div className="aspect-square bg-neutral-50">
//                                     {isSkeleton ? (
//                                         <div className="h-full w-full animate-pulse bg-neutral-200/40" />
//                                     ) : (
//                                         <ProductImg
//                                             src={p.imageSrc}
//                                             alt={p.name}
//                                             className="h-full w-full object-cover"
//                                         />
//                                     )}
//                                 </div>
//                                 <div className="p-2 bg-white">
//                                     <p className="text-xs text-neutral-600 truncate">
//                                         {isSkeleton ? "Loading…" : p.name}
//                                     </p>
//                                     <p className="text-xs font-medium text-neutral-900">
//                                         {isSkeleton ? "" : formatPriceEUR(p.price)}
//                                     </p>
//                                 </div>
//                             </div>
//                         )
//                     })}
//                 </div>

//                 {/* pill like Aura */}
//                 <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full bg-white/80 backdrop-blur-sm border border-neutral-200 shadow-sm z-30">
//                     <p className="text-xs text-neutral-700 font-medium">{heroTopic.pill}</p>
//                 </div>
//             </section>

//             {/* transition fade */}
//             <div
//                 className="relative z-30 h-24 -mt-24 pointer-events-none"
//                 style={{
//                     background:
//                         "linear-gradient(to bottom, transparent 0%, rgba(255,255,255,0.5) 30%, rgba(255,255,255,0.85) 60%, white 100%)",
//                     backdropFilter: "blur(2px)",
//                 }}
//             />

//             {/* CATALOG + L-NAVBAR (replaces Aura header) */}
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
//                         {/* results header inside catalog body */}
//                         <div className="flex items-center justify-between py-6">
//                             <div>
//                                 <h2 className="text-xl font-medium tracking-tight">
//                                     New Arrivals
//                                 </h2>
//                                 <p className="text-sm text-neutral-500 mt-0.5">
//                                     {filteredProducts.length} products
//                                 </p>
//                             </div>

//                             <div className="flex items-center gap-2">
//                                 <span className="text-xs text-neutral-500">Sort by:</span>
//                                 <button className="flex items-center gap-1 px-3 py-1.5 text-xs text-neutral-600 bg-neutral-100 border border-neutral-200 rounded-lg hover:bg-neutral-200 transition-colors">
//                                     Featured <ChevronDown className="h-3.5 w-3.5" />
//                                 </button>
//                             </div>
//                         </div>

//                         {/* ✅ Loading overlay ONLY on catalog body */}
//                         {isCatalogLoading && (
//                             <div className="absolute inset-0 z-20 flex items-center justify-center">
//                                 <div className="rounded-2xl bg-white/80 backdrop-blur-md border border-neutral-200 px-6 py-4 shadow-sm">
//                                     <p className="text-sm font-medium text-neutral-900">
//                                         Curating your shop…
//                                     </p>
//                                     <p className="text-xs text-neutral-500 mt-1">
//                                         Loading catalog from backend
//                                     </p>
//                                 </div>
//                             </div>
//                         )}

//                         {/* catalog grid */}
//                         <div className="pb-10">
//                             <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
//                                 {filteredProducts.map((p) => {
//                                     const brandName =
//                                         brands.find((b) => b.brand_id === p.brandId)?.brand_name ??
//                                         "Cove"

//                                     return (
//                                         <article key={p.id} className="group cursor-pointer">
//                                             <div className="relative aspect-[3/4] rounded-xl bg-neutral-100 overflow-hidden mb-3 border border-neutral-200">
//                                                 <ProductImg
//                                                     src={p.imageSrc}
//                                                     alt={p.name}
//                                                     className="absolute inset-0 h-full w-full object-cover"
//                                                 />

//                                                 {!!p.badge && (
//                                                     <div
//                                                         className={[
//                                                             "absolute top-2 left-2 px-2 py-0.5 text-xs font-medium text-white rounded",
//                                                             p.badge === "NEW"
//                                                                 ? "bg-neutral-900"
//                                                                 : "bg-emerald-600",
//                                                         ].join(" ")}
//                                                     >
//                                                         {p.badge}
//                                                     </div>
//                                                 )}

//                                                 <button className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
//                                                     <Heart className="h-4 w-4 text-neutral-600" />
//                                                 </button>

//                                                 <div className="absolute inset-x-2 bottom-2 opacity-0 group-hover:opacity-100 transition-opacity">
//                                                     <button className="w-full py-2 text-xs font-medium bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 transition-colors">
//                                                         Quick Add
//                                                     </button>
//                                                 </div>
//                                             </div>

//                                             <div>
//                                                 <p className="text-xs text-neutral-500 mb-0.5">
//                                                     {brandName}
//                                                 </p>
//                                                 <h3 className="text-sm font-medium truncate group-hover:text-neutral-600 transition-colors">
//                                                     {p.name}
//                                                 </h3>

//                                                 {p.oldPrice ? (
//                                                     <div className="flex items-center gap-2 mt-1">
//                                                         <p className="text-sm text-neutral-600">
//                                                             {formatPriceEUR(p.price)}
//                                                         </p>
//                                                         <p className="text-sm text-neutral-400 line-through">
//                                                             {formatPriceEUR(p.oldPrice)}
//                                                         </p>
//                                                     </div>
//                                                 ) : (
//                                                     <p className="text-sm text-neutral-600 mt-1">
//                                                         {formatPriceEUR(p.price)}
//                                                     </p>
//                                                 )}
//                                             </div>
//                                         </article>
//                                     )
//                                 })}
//                             </div>

//                             {!isCatalogLoading && filteredProducts.length === 0 && (
//                                 <div className="py-20 text-center text-neutral-500">
//                                     No items found. Try resetting filters.
//                                 </div>
//                             )}
//                         </div>
//                     </div>
//                 </LShapedNavbar>
//             </section>
//         </div>
//     )
// }
