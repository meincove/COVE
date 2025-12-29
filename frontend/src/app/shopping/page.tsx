"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Heart, ChevronDown } from "lucide-react"
import LShapedNavbar, { FilterGroup } from "@/src/components/shopping/LShapedNavbar"

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
                ; (e.currentTarget as HTMLImageElement).src = "/clothing-images/fallback.jpg"
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

function clamp(n: number, min: number, max: number) {
    return Math.min(max, Math.max(min, n))
}

type Layout = {
    vw: number
    vh: number
    tile: number
    gap: number
    visibleCols: number
    visibleRows: number
    totalCols: number
    totalRows: number
    stageW: number
    stageH: number
    step: number
    padX: number
    padY: number
}

/**
 * Compute layout so hero is FILLED with square tiles, airy gaps, and extra offscreen margin.
 * Tiles are 30% smaller vs fitted width.
 */
function computeLayout(vw: number, vh: number): Layout {
    const safeVW = Math.max(320, vw)
    const safeVH = Math.max(360, vh)

    // Pick a reasonable "how many tiles across" for the viewport
    // (keeps the surface consistent across sizes)
    const visibleCols = clamp(Math.round(safeVW / 220) + 2, 5, 10)
    const fittedTile = Math.floor((safeVW - 2 * 18) / visibleCols)

    // ✅ 30% smaller tiles
    const tile = clamp(Math.floor(fittedTile * 0.7), 56, 96)

    // ✅ much bigger gap (but sane; “10x” literally breaks the layout)
    const gap = clamp(Math.floor(tile * 0.45), 18, 44)

    const step = tile + gap

    const visibleRows = clamp(Math.ceil((safeVH - 2 * 18) / step), 4, 8)

    // Extra margin tiles so you can drag around and still have tiles everywhere
    const extra = clamp(Math.round(visibleCols * 0.5), 3, 6)

    const totalCols = visibleCols + extra * 2
    const totalRows = visibleRows + extra * 2

    const stageW = totalCols * tile + (totalCols - 1) * gap
    const stageH = totalRows * tile + (totalRows - 1) * gap

    // padding to keep the surface centered initially
    const padX = Math.floor((stageW - safeVW) / 2)
    const padY = Math.floor((stageH - safeVH) / 2)

    return {
        vw: safeVW,
        vh: safeVH,
        tile,
        gap,
        visibleCols,
        visibleRows,
        totalCols,
        totalRows,
        stageW,
        stageH,
        step,
        padX,
        padY,
    }
}

/** Super light FPS meter (vsync-limited) */
function useFpsMeter(enabled: boolean) {
    const [fps, setFps] = useState(0)
    const rafRef = useRef<number | null>(null)

    useEffect(() => {
        if (!enabled) return

        let last = performance.now()
        let frames = 0
        let acc = 0

        const loop = (t: number) => {
            const dt = t - last
            last = t
            frames += 1
            acc += dt

            // update 4x per second
            if (acc >= 250) {
                const current = Math.round((frames * 1000) / acc)
                setFps(current)
                frames = 0
                acc = 0
            }

            rafRef.current = requestAnimationFrame(loop)
        }

        rafRef.current = requestAnimationFrame(loop)
        return () => {
            if (rafRef.current) cancelAnimationFrame(rafRef.current)
        }
    }, [enabled])

    return fps
}

export default function ShoppingPage() {
    const heroRef = useRef<HTMLElement | null>(null)
    const stageRef = useRef<HTMLDivElement | null>(null)

    const [search, setSearch] = useState("")
    const [activeFilters, setActiveFilters] = useState<Record<string, string[]>>({})

    const [brands, setBrands] = useState<Brand[]>([])
    const [products, setProducts] = useState<UiProduct[]>([])
    const [isCatalogLoading, setIsCatalogLoading] = useState(true)

    // Layout is state (changes on resize), but drag position is NOT state (keeps 165fps smooth)
    const [layout, setLayout] = useState<Layout | null>(null)

    // “drag engine” refs
    const isDraggingRef = useRef(false)
    const pointerIdRef = useRef<number | null>(null)
    const lastPtRef = useRef<{ x: number; y: number } | null>(null)

    const posRef = useRef({ x: 0, y: 0 })
    const velRef = useRef({ x: 0, y: 0 })

    const animRafRef = useRef<number | null>(null)

    // Selected item (only this changes in React state; tiles never rerender during drag)
    const [selectedIndex, setSelectedIndex] = useState(0)

    // FPS overlay
    const fps = useFpsMeter(true)

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

    /** ---- Build hero tile pool (repeat products if needed) ---- */
    const heroTiles = useMemo(() => {
        if (!layout) return []
        if (products.length === 0) return []
        const total = layout.totalCols * layout.totalRows
        const out: UiProduct[] = new Array(total)
        for (let i = 0; i < total; i++) {
            out[i] = products[i % products.length]
        }
        return out
    }, [layout, products])

    const selectedProduct = useMemo(() => {
        if (!layout || heroTiles.length === 0) return undefined
        const idx = clamp(selectedIndex, 0, heroTiles.length - 1)
        return heroTiles[idx]
    }, [selectedIndex, heroTiles, layout])

    /** ---- Apply stage transform (compositor-only) ---- */
    const applyTransform = useCallback(() => {
        const el = stageRef.current
        if (!el) return
        const { x, y } = posRef.current
        el.style.transform = `translate3d(${x}px, ${y}px, 0)`
    }, [])

    /** ---- Compute which tile is under scanner center, update selectedIndex (throttled by RAF loop) ---- */
    const updateSelectionFromCenter = useCallback(() => {
        const el = heroRef.current
        const lay = layout
        if (!el || !lay) return
        const { x, y } = posRef.current

        const cx = lay.vw / 2
        const cy = lay.vh / 2

        // center point in stage coords
        const sx = cx - x
        const sy = cy - y

        const col = clamp(Math.round(sx / lay.step), 0, lay.totalCols - 1)
        const row = clamp(Math.round(sy / lay.step), 0, lay.totalRows - 1)
        const idx = row * lay.totalCols + col

        setSelectedIndex((prev) => (prev === idx ? prev : idx))
    }, [layout])

    /** ---- Drag physics loop (inertia + snap back) ---- */
    const startAnimLoop = useCallback(() => {
        if (animRafRef.current) return

        let last = performance.now()

        const tick = (t: number) => {
            animRafRef.current = requestAnimationFrame(tick)
            const dt = Math.min(32, t - last)
            last = t

            const lay = layout
            if (!lay) return

            // If dragging, just keep selection updated and exit
            if (isDraggingRef.current) {
                applyTransform()
                updateSelectionFromCenter()
                return
            }

            // inertia
            const vel = velRef.current
            const pos = posRef.current

            // apply velocity
            pos.x += vel.x * (dt / 16.67)
            pos.y += vel.y * (dt / 16.67)

            // friction
            vel.x *= 0.92
            vel.y *= 0.92

            // hard bounds (no empty space)
            const minX = lay.vw - lay.stageW
            const minY = lay.vh - lay.stageH
            const maxX = 0
            const maxY = 0

            // snap spring when out of bounds
            const k = 0.14 // spring strength
            const damp = 0.78

            if (pos.x < minX) {
                const dx = minX - pos.x
                vel.x += dx * k
                vel.x *= damp
            } else if (pos.x > maxX) {
                const dx = maxX - pos.x
                vel.x += dx * k
                vel.x *= damp
            }

            if (pos.y < minY) {
                const dy = minY - pos.y
                vel.y += dy * k
                vel.y *= damp
            } else if (pos.y > maxY) {
                const dy = maxY - pos.y
                vel.y += dy * k
                vel.y *= damp
            }

            // stop tiny motion
            if (Math.abs(vel.x) < 0.02) vel.x = 0
            if (Math.abs(vel.y) < 0.02) vel.y = 0

            applyTransform()
            updateSelectionFromCenter()
        }

        animRafRef.current = requestAnimationFrame(tick)
    }, [applyTransform, layout, updateSelectionFromCenter])

    const stopAnimLoop = useCallback(() => {
        if (!animRafRef.current) return
        cancelAnimationFrame(animRafRef.current)
        animRafRef.current = null
    }, [])

    /** ---- Layout measurement (ResizeObserver) ---- */
    useEffect(() => {
        const hero = heroRef.current
        if (!hero) return

        const ro = new ResizeObserver(() => {
            const rect = hero.getBoundingClientRect()
            const lay = computeLayout(rect.width, rect.height)
            setLayout(lay)

            // Center stage initially so it fills and feels balanced
            posRef.current.x = -lay.padX
            posRef.current.y = -lay.padY
            velRef.current.x = 0
            velRef.current.y = 0

            // Apply immediately
            requestAnimationFrame(() => {
                applyTransform()
                updateSelectionFromCenter()
            })
        })

        ro.observe(hero)
        return () => ro.disconnect()
    }, [applyTransform, updateSelectionFromCenter])

    /** ---- Pointer drag handlers (NO React state updates inside move) ---- */
    const onPointerDown = useCallback(
        (e: React.PointerEvent) => {
            const lay = layout
            const stage = stageRef.current
            if (!lay || !stage) return

            // only primary button for mouse
            if (e.pointerType === "mouse" && e.button !== 0) return

            isDraggingRef.current = true
            pointerIdRef.current = e.pointerId
            lastPtRef.current = { x: e.clientX, y: e.clientY }
            velRef.current.x = 0
            velRef.current.y = 0

            try {
                ; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
            } catch { }

            startAnimLoop()
        },
        [layout, startAnimLoop]
    )

    const onPointerMove = useCallback(
        (e: React.PointerEvent) => {
            if (!isDraggingRef.current) return
            if (pointerIdRef.current !== e.pointerId) return
            const lay = layout
            if (!lay) return

            const last = lastPtRef.current
            if (!last) return

            const dx = e.clientX - last.x
            const dy = e.clientY - last.y
            lastPtRef.current = { x: e.clientX, y: e.clientY }

            const pos = posRef.current
            const vel = velRef.current

            // update velocity (for inertia on release)
            vel.x = dx
            vel.y = dy

            // move
            pos.x += dx
            pos.y += dy

            // bounds with gentle rubberband while dragging
            const minX = lay.vw - lay.stageW
            const minY = lay.vh - lay.stageH
            const maxX = 0
            const maxY = 0

            const rubber = 0.35

            if (pos.x < minX) pos.x = minX + (pos.x - minX) * rubber
            if (pos.x > maxX) pos.x = maxX + (pos.x - maxX) * rubber
            if (pos.y < minY) pos.y = minY + (pos.y - minY) * rubber
            if (pos.y > maxY) pos.y = maxY + (pos.y - maxY) * rubber

            // transform + selection are handled in RAF loop (keeps move super light)
        },
        [layout]
    )

    const onPointerUp = useCallback((e: React.PointerEvent) => {
        if (pointerIdRef.current !== e.pointerId) return
        isDraggingRef.current = false
        pointerIdRef.current = null
        lastPtRef.current = null

        // keep anim loop for inertia/snap; it will calm down automatically
        startAnimLoop()
    }, [startAnimLoop])

    /** ---- Start RAF loop once layout exists (keeps selection & inertia stable) ---- */
    useEffect(() => {
        if (!layout) return
        startAnimLoop()
        return () => {
            stopAnimLoop()
        }
    }, [layout, startAnimLoop, stopAnimLoop])

    /** ---- HERO background (cheap gradient, no blur) ---- */
    const heroBgStyle: React.CSSProperties = {
        background:
            "linear-gradient(180deg, rgba(250,250,250,1) 0%, rgba(255,255,255,1) 55%, rgba(255,255,255,1) 100%)",
    }

    return (
        <div className="w-full bg-white text-neutral-900 antialiased">
            {/* HERO */}
            <section
                ref={heroRef as any}
                className="relative overflow-hidden"
                style={{
                    ...heroBgStyle,
                    width: "100vw",
                    left: "50%",
                    transform: "translateX(-50%)",
                    height: "70vh",
                    minHeight: 560,
                    touchAction: "none", // important for smooth touch/pointer drag
                }}
            >
                {/* FPS meter */}
                <div className="absolute right-4 top-4 z-40">
                    <div className="rounded-lg border border-black/10 bg-white/90 px-3 py-2 text-xs font-semibold text-black/70">
                        FPS {fps}
                    </div>
                </div>

                {/* HERO drag surface */}
                <div
                    className="absolute inset-0 z-10"
                    style={{ padding: 18 }}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerCancel={onPointerUp}
                >
                    {/* The stage that moves (transform only) */}
                    {layout && (
                        <div
                            ref={stageRef}
                            className="absolute left-0 top-0"
                            style={{
                                width: layout.stageW,
                                height: layout.stageH,
                                display: "grid",
                                gridTemplateColumns: `repeat(${layout.totalCols}, ${layout.tile}px)`,
                                gridTemplateRows: `repeat(${layout.totalRows}, ${layout.tile}px)`,
                                gap: layout.gap,

                                // compositor friendly
                                willChange: "transform",
                                backfaceVisibility: "hidden",
                                transform: "translate3d(0,0,0)",
                                contain: "strict",

                                // tiles do not receive pointer events (drag stays cheap)
                                pointerEvents: "none",
                            }}
                        >
                            {heroTiles.map((p, i) => {
                                const col = i % layout.totalCols
                                const row = Math.floor(i / layout.totalCols)

                                // “sphere surface” feel: edges smaller (~20%), cheap static curve
                                const cx = (layout.totalCols - 1) / 2
                                const cy = (layout.totalRows - 1) / 2
                                const dx = (col - cx) / cx
                                const dy = (row - cy) / cy
                                const dist = Math.min(1, Math.sqrt(dx * dx + dy * dy))
                                const fisheye = 1 - 0.2 * Math.pow(dist, 1.35)

                                // flatten to 1.0 while dragging
                                const scale = isDraggingRef.current ? 1 : fisheye

                                return (
                                    <div
                                        key={`${p.id}-${i}`}
                                        style={{
                                            width: layout.tile,
                                            height: layout.tile,
                                            borderRadius: 18,
                                            overflow: "hidden",
                                            background: "white",
                                            border: "1px solid rgba(0,0,0,0.08)",
                                            boxShadow: "none",

                                            transform: `translateZ(0) scale(${scale})`,
                                            transition: "transform 240ms cubic-bezier(0.2, 0.8, 0.2, 1)",
                                            contain: "content",
                                        }}
                                    >
                                        <ProductImg
                                            src={p.imageSrc}
                                            alt={p.name}
                                            className="h-full w-full object-cover"
                                        />
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    {/* CENTER SCANNER / PREVIEW (NO BLUR, NO HEAVY SHADOW) */}
                    <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
                        <div
                            className="relative pointer-events-none"
                            style={{
                                width: "min(840px, 92vw)",
                                height: "min(320px, 42vh)",
                            }}
                        >
                            {/* lightweight panel */}
                            <div className="absolute inset-0 rounded-[28px] border border-neutral-200 bg-white/90" />

                            {/* scanner corners */}
                            <div className="absolute inset-0 rounded-[28px]">
                                {["tl", "tr", "bl", "br"].map((pos) => (
                                    <div
                                        key={pos}
                                        className="absolute w-10 h-10"
                                        style={{
                                            borderColor: "rgba(0,0,0,0.35)",
                                            borderStyle: "solid",
                                            borderWidth:
                                                pos === "tl"
                                                    ? "2px 0 0 2px"
                                                    : pos === "tr"
                                                        ? "2px 2px 0 0"
                                                        : pos === "bl"
                                                            ? "0 0 2px 2px"
                                                            : "0 2px 2px 0",
                                            borderRadius:
                                                pos === "tl"
                                                    ? "22px 0 0 0"
                                                    : pos === "tr"
                                                        ? "0 22px 0 0"
                                                        : pos === "bl"
                                                            ? "0 0 0 22px"
                                                            : "0 0 22px 0",
                                            top: pos.includes("t") ? 14 : undefined,
                                            bottom: pos.includes("b") ? 14 : undefined,
                                            left: pos.includes("l") ? 14 : undefined,
                                            right: pos.includes("r") ? 14 : undefined,
                                        }}
                                    />
                                ))}
                            </div>

                            {/* content */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
                                <div className="text-[10px] tracking-[0.24em] font-bold text-neutral-700/70">
                                    MY INVENTORY
                                </div>

                                <div className="mt-3">
                                    <div
                                        className="mx-auto rounded-2xl overflow-hidden border border-neutral-200 bg-white"
                                        style={{ width: 150, height: 150 }}
                                    >
                                        {selectedProduct ? (
                                            <ProductImg
                                                src={selectedProduct.imageSrc}
                                                alt={selectedProduct.name}
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <div className="h-full w-full bg-neutral-200/40" />
                                        )}
                                    </div>
                                </div>

                                <div className="mt-3 text-sm text-neutral-900 font-medium">
                                    {selectedProduct?.name ?? "Loading…"}
                                </div>
                                <div className="mt-1 text-xs text-neutral-600">
                                    Drag the canvas — center selects
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* subtle bottom fade (cheap) */}
                <div
                    className="absolute bottom-0 left-0 right-0 h-28 pointer-events-none z-40"
                    style={{
                        background: "linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,1) 90%)",
                    }}
                />
            </section>

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
                                {filteredProducts.map((p) => {
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
