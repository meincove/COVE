"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Scan, ShoppingBag, Zap } from "lucide-react"

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

const HERO_TOPICS = [
    {
        key: "jackets",
        pill: "Best selling jackets",
        match: (p: UiProduct) => (p.type ?? "").toLowerCase().includes("jacket"),
    },
    {
        key: "hoodies",
        pill: "Trending hoodies",
        match: (p: UiProduct) => (p.type ?? "").toLowerCase().includes("hoodie"),
    },
    {
        key: "shirts",
        pill: "Popular shirts",
        match: (p: UiProduct) => (p.type ?? "").toLowerCase().includes("shirt"),
    },
    {
        key: "new",
        pill: "New arrivals",
        match: (p: UiProduct) => (p.badge ?? "").toLowerCase() === "new",
    },
] as const

function safeImg(src?: string) {
    if (!src) return "/clothing-images/fallback.jpg"
    return src
}

function clamp(v: number, min: number, max: number) {
    return Math.max(min, Math.min(max, v))
}

function shuffleIdx(n: number) {
    const a = Array.from({ length: n }, (_, i) => i)
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
            ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
}

function pickProductsForTopic(products: UiProduct[], topicIndex: number, count: number) {
    const topic = HERO_TOPICS[topicIndex] ?? HERO_TOPICS[0]
    const pool = products.filter(topic.match)
    const base = pool.length >= Math.max(8, Math.floor(count * 0.7)) ? pool : products

    // pick with repetition if needed
    const out: UiProduct[] = []
    while (out.length < count && base.length > 0) {
        const idx = Math.floor(Math.random() * base.length)
        out.push(base[idx])
    }
    while (out.length < count && products.length > 0) {
        const idx = Math.floor(Math.random() * products.length)
        out.push(products[idx])
    }
    return out.slice(0, count)
}

export default function HeroScanner({
    products,
    heightVh = 70,
    minHeight = 600,
}: {
    products: UiProduct[]
    heightVh?: number
    minHeight?: number
}) {
    // ---- hero sizing ----
    const TILE_W = 110
    const TILE_H = 150
    const GAP = 28

    // Keep tile count stable (SSR-safe). Plenty to fill the canvas.
    const TILE_COUNT = 44

    const viewportRef = useRef<HTMLDivElement | null>(null)
    const canvasRef = useRef<HTMLDivElement | null>(null)
    const tileRefs = useRef<Array<HTMLButtonElement | null>>([])
    tileRefs.current = []

    const scannerRef = useRef<HTMLDivElement | null>(null)

    // ---- drag state in refs (no rerender on every move) ----
    const isDraggingRef = useRef(false)
    const startRef = useRef({ x: 0, y: 0 })
    const posRef = useRef({ x: 0, y: 0 })
    const velRef = useRef({ x: 0, y: 0 })
    const lastRef = useRef({ x: 0, y: 0, t: 0 })
    const rafRef = useRef<number | null>(null)

    // ---- scanner state ----
    const [topicIndex, setTopicIndex] = useState(0)
    const [tiles, setTiles] = useState<UiProduct[]>([])
    const [scannedId, setScannedId] = useState<string | null>(null)
    const [scanPulseKey, setScanPulseKey] = useState(0)

    const topicIndexRef = useRef(0)
    useEffect(() => {
        topicIndexRef.current = topicIndex
    }, [topicIndex])

    const scannedProduct = useMemo(() => {
        if (!scannedId) return null
        return tiles.find((t) => t?.id === scannedId) ?? null
    }, [tiles, scannedId])

    // ---- init tiles after mount + data present ----
    useEffect(() => {
        if (!products.length) return
        const firstIdx = HERO_TOPICS.findIndex((t) => products.some(t.match))
        const idx = firstIdx === -1 ? 0 : firstIdx
        setTopicIndex(idx)
        setTiles(pickProductsForTopic(products, idx, TILE_COUNT))
    }, [products.length]) // intentionally only depends on length to keep stable

    // ---- apply transform to canvas ----
    const updateCanvasTransform = useCallback(() => {
        const canvas = canvasRef.current
        if (!canvas) return
        const { x, y } = posRef.current
        canvas.style.transform = `translate3d(${x}px, ${y}px, 0)`
    }, [])

    // ---- bounds (simple) ----
    const getBounds = useCallback(() => {
        const viewport = viewportRef.current
        const canvas = canvasRef.current
        if (!viewport || !canvas) {
            return { minX: -600, maxX: 600, minY: -360, maxY: 360 }
        }
        const v = viewport.getBoundingClientRect()
        const c = canvas.getBoundingClientRect()

        // allow extra drift so edge tiles can reach scanner
        const extra = 220
        const halfX = (c.width - v.width) / 2
        const halfY = (c.height - v.height) / 2

        return {
            minX: -halfX - extra,
            maxX: halfX + extra,
            minY: -halfY - extra,
            maxY: halfY + extra,
        }
    }, [])

    // ---- 3D card effect ----
    const apply3D = useCallback((vx: number, vy: number) => {
        const viewport = viewportRef.current
        if (!viewport) return

        const vr = viewport.getBoundingClientRect()
        const cx = vr.left + vr.width / 2
        const cy = vr.top + vr.height / 2

        const maxRot = 12

        for (const el of tileRefs.current) {
            if (!el) continue
            const r = el.getBoundingClientRect()
            const tx = r.left + r.width / 2
            const ty = r.top + r.height / 2

            const dx = (tx - cx) / vr.width
            const dy = (ty - cy) / vr.height
            const dist = Math.sqrt(dx * dx + dy * dy)

            const rotY = dx * maxRot * (1 + Math.min(1, Math.abs(vx) * 0.03))
            const rotX = -dy * (maxRot * 0.55) * (1 + Math.min(1, Math.abs(vy) * 0.03))
            const scale = Math.max(0.86, 1 - dist * 0.08)
            const tz = -dist * 30

            el.style.transform = `
        perspective(900px)
        rotateY(${rotY}deg)
        rotateX(${rotX}deg)
        translateZ(${tz}px)
        scale(${scale})
      `
        }
    }, [])

    // ---- scanner overlap check (throttled) ----
    const scanThrottleRef = useRef(0)
    const checkScanner = useCallback(() => {
        const now = performance.now()
        if (now - scanThrottleRef.current < 90) return
        scanThrottleRef.current = now

        const scanner = scannerRef.current
        const viewport = viewportRef.current
        if (!scanner || !viewport) return

        const sr = scanner.getBoundingClientRect()
        const scx = sr.left + sr.width / 2
        const scy = sr.top + sr.height / 2

        let bestEl: HTMLButtonElement | null = null
        let bestDist = Infinity

        const pad = 40

        for (const el of tileRefs.current) {
            if (!el) continue
            const r = el.getBoundingClientRect()
            const cx = r.left + r.width / 2
            const cy = r.top + r.height / 2

            const inside =
                cx > sr.left + pad &&
                cx < sr.right - pad &&
                cy > sr.top + pad &&
                cy < sr.bottom - pad

            if (!inside) continue

            const d = Math.hypot(cx - scx, cy - scy)
            if (d < bestDist) {
                bestDist = d
                bestEl = el
            }
        }

        const nextId = bestEl?.dataset?.pid ?? null
        if (nextId !== scannedId) {
            setScannedId(nextId)
            if (nextId) setScanPulseKey((k) => k + 1)
        }
    }, [scannedId])

    // ---- pointer drag ----
    useEffect(() => {
        const viewport = viewportRef.current
        if (!viewport) return

        const onPointerDown = (e: PointerEvent) => {
            isDraggingRef.current = true
            viewport.setPointerCapture(e.pointerId)

            const { x, y } = posRef.current
            startRef.current = { x: e.clientX - x, y: e.clientY - y }
            lastRef.current = { x: e.clientX, y: e.clientY, t: performance.now() }
            velRef.current = { x: 0, y: 0 }

            viewport.classList.add("cursor-grabbing")
            viewport.classList.remove("cursor-grab")

            if (rafRef.current) cancelAnimationFrame(rafRef.current)
        }

        const onPointerMove = (e: PointerEvent) => {
            if (!isDraggingRef.current) return

            const bounds = getBounds()
            const nx = e.clientX - startRef.current.x
            const ny = e.clientY - startRef.current.y

            const clampedX = clamp(nx, bounds.minX, bounds.maxX)
            const clampedY = clamp(ny, bounds.minY, bounds.maxY)
            posRef.current = { x: clampedX, y: clampedY }

            const t = performance.now()
            const dt = Math.max(1, t - lastRef.current.t)
            velRef.current = {
                x: ((e.clientX - lastRef.current.x) / dt) * 16,
                y: ((e.clientY - lastRef.current.y) / dt) * 16,
            }
            lastRef.current = { x: e.clientX, y: e.clientY, t }

            updateCanvasTransform()
            apply3D(velRef.current.x, velRef.current.y)
            checkScanner()
        }

        const onPointerUp = () => {
            if (!isDraggingRef.current) return
            isDraggingRef.current = false

            viewport.classList.add("cursor-grab")
            viewport.classList.remove("cursor-grabbing")

            // momentum
            const step = () => {
                const v = velRef.current
                if (Math.abs(v.x) > 0.35 || Math.abs(v.y) > 0.35) {
                    v.x *= 0.94
                    v.y *= 0.94

                    const bounds = getBounds()
                    posRef.current = {
                        x: clamp(posRef.current.x + v.x, bounds.minX, bounds.maxX),
                        y: clamp(posRef.current.y + v.y, bounds.minY, bounds.maxY),
                    }

                    updateCanvasTransform()
                    apply3D(v.x, v.y)
                    checkScanner()

                    rafRef.current = requestAnimationFrame(step)
                } else {
                    // settle
                    apply3D(0, 0)
                    checkScanner()
                }
            }

            rafRef.current = requestAnimationFrame(step)
        }

        viewport.addEventListener("pointerdown", onPointerDown, { passive: true })
        viewport.addEventListener("pointermove", onPointerMove, { passive: true })
        viewport.addEventListener("pointerup", onPointerUp, { passive: true })
        viewport.addEventListener("pointercancel", onPointerUp, { passive: true })

        viewport.classList.add("cursor-grab")

        return () => {
            viewport.removeEventListener("pointerdown", onPointerDown)
            viewport.removeEventListener("pointermove", onPointerMove)
            viewport.removeEventListener("pointerup", onPointerUp)
            viewport.removeEventListener("pointercancel", onPointerUp)
            if (rafRef.current) cancelAnimationFrame(rafRef.current)
        }
    }, [apply3D, checkScanner, getBounds, updateCanvasTransform])

    // ---- topic cycle: hold 15s, transition 5s swapping tiles randomly ----
    useEffect(() => {
        if (!products.length) return
        if (!tiles.length) return

        const HOLD_MS = 15000
        const TRANSITION_MS = 5000

        let holdTimer: any = null
        let swapTimer: any = null
        let cancelled = false

        const schedule = () => {
            if (cancelled) return

            holdTimer = setTimeout(() => {
                if (cancelled) return

                const nextIdx = (topicIndexRef.current + 1) % HERO_TOPICS.length
                const nextTiles = pickProductsForTopic(products, nextIdx, TILE_COUNT)

                // pill changes at start of transition (your requirement)
                setTopicIndex(nextIdx)

                const order = shuffleIdx(TILE_COUNT)
                const tick = Math.max(80, Math.floor(TRANSITION_MS / Math.max(1, order.length)))

                let k = 0
                swapTimer = setInterval(() => {
                    if (cancelled) return
                    const i = order[k]

                    setTiles((prev) => {
                        const copy = prev.slice()
                        copy[i] = nextTiles[i]
                        return copy
                    })

                    k += 1
                    if (k >= order.length) {
                        clearInterval(swapTimer)
                        swapTimer = null
                        schedule()
                    }
                }, tick)
            }, HOLD_MS)
        }

        schedule()

        return () => {
            cancelled = true
            if (holdTimer) clearTimeout(holdTimer)
            if (swapTimer) clearInterval(swapTimer)
        }
    }, [products.length, tiles.length])

    const pill = HERO_TOPICS[topicIndex]?.pill ?? "Curated picks"

    return (
        <section
            className="relative w-full overflow-hidden bg-gradient-to-b from-stone-50 via-stone-50 to-white"
            style={{ height: `${heightVh}vh`, minHeight }}
        >
            {/* subtle blobs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div
                    className="absolute h-[420px] w-[420px] rounded-full opacity-15"
                    style={{
                        background: "radial-gradient(circle, rgba(251,191,36,0.25) 0%, transparent 70%)",
                        top: "6%",
                        left: "6%",
                    }}
                />
                <div
                    className="absolute h-[360px] w-[360px] rounded-full opacity-10"
                    style={{
                        background: "radial-gradient(circle, rgba(244,114,182,0.2) 0%, transparent 70%)",
                        top: "28%",
                        right: "10%",
                    }}
                />
                <div
                    className="absolute h-[320px] w-[320px] rounded-full opacity-10"
                    style={{
                        background: "radial-gradient(circle, rgba(99,102,241,0.16) 0%, transparent 70%)",
                        bottom: "14%",
                        left: "30%",
                    }}
                />
            </div>

            {/* topic pill */}
            <div className="absolute top-5 left-1/2 -translate-x-1/2 z-40">
                <div className="px-5 py-2.5 rounded-full bg-white/90 backdrop-blur-md border border-neutral-200/60 shadow-lg shadow-black/5">
                    <p className="text-xs text-neutral-600 font-medium tracking-wide">{pill}</p>
                </div>
            </div>

            {/* draggable viewport */}
            <div ref={viewportRef} className="absolute inset-0 overflow-hidden">
                {/* oversized canvas */}
                <div
                    ref={canvasRef}
                    className="absolute"
                    style={{
                        width: "200%",
                        height: "160%",
                        top: "-30%",
                        left: "-50%",
                        transform: "translate3d(0,0,0)",
                        willChange: "transform",
                    }}
                >
                    <div className="w-full h-full flex flex-wrap content-center justify-center gap-6 p-12">
                        {Array.from({ length: TILE_COUNT }).map((_, i) => {
                            const p = tiles[i]
                            return (
                                <button
                                    key={i}
                                    ref={(el) => {
                                        tileRefs.current[i] = el
                                    }}
                                    data-pid={p?.id ?? ""}
                                    type="button"
                                    className="relative rounded-xl overflow-hidden bg-white flex-shrink-0 select-none"
                                    style={{
                                        width: TILE_W,
                                        height: TILE_H,
                                        boxShadow: "0 4px 20px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.05)",
                                        transformStyle: "preserve-3d",
                                        transition: "transform 0.4s cubic-bezier(0.25,0.46,0.45,0.94)",
                                    }}
                                >
                                    {/* image */}
                                    <div className="absolute inset-0">
                                        {p ? (
                                            <AnimatePresence mode="popLayout">
                                                <motion.img
                                                    key={p.id}
                                                    src={safeImg(p.imageSrc)}
                                                    alt={p.name}
                                                    className="h-full w-full object-cover"
                                                    draggable={false}
                                                    initial={{ opacity: 0, scale: 1.02 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    exit={{ opacity: 0, scale: 0.99 }}
                                                    transition={{ duration: 0.22, ease: "easeOut" }}
                                                    onError={(e) => {
                                                        const target = e.currentTarget as HTMLImageElement
                                                        if (target.src.includes("fallback.jpg")) return
                                                        target.src = "/clothing-images/fallback.jpg"
                                                    }}
                                                />
                                            </AnimatePresence>
                                        ) : (
                                            <div className="h-full w-full bg-neutral-200/40 animate-pulse" />
                                        )}
                                    </div>

                                    {/* hover overlay */}
                                    <div
                                        className="absolute inset-0 opacity-0 hover:opacity-100"
                                        style={{
                                            transition: "opacity 0.3s ease",
                                            background: "linear-gradient(to top, rgba(0,0,0,0.60), rgba(0,0,0,0.15), transparent)",
                                        }}
                                    />

                                    {/* hover info */}
                                    <div
                                        className="absolute bottom-0 left-0 right-0 p-2.5 opacity-0 translate-y-2 hover:opacity-100 hover:translate-y-0"
                                        style={{ transition: "opacity 0.3s ease, transform 0.3s ease" }}
                                    >
                                        <p className="text-xs text-white/80 font-medium">{p?.type ?? ""}</p>
                                        <p className="text-xs text-white font-semibold truncate">{p?.name ?? ""}</p>
                                        <p className="text-xs text-white/90 mt-0.5">{p ? `€${p.price.toFixed(2)}` : ""}</p>
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* scanner zone */}
            <div
                ref={scannerRef}
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none"
                style={{ width: "min(380px, 75vw)", height: "min(260px, 38vh)" }}
            >
                {/* glow */}
                <div
                    className="absolute -inset-1 rounded-2xl"
                    style={{
                        boxShadow: scannedId ? "0 0 40px rgba(0,0,0,0.08), inset 0 0 30px rgba(0,0,0,0.03)" : "none",
                        transition: "box-shadow 0.35s ease",
                    }}
                />

                {/* corners */}
                {(["tl", "tr", "bl", "br"] as const).map((pos) => (
                    <div
                        key={pos}
                        className="absolute"
                        style={{
                            width: 28,
                            height: 28,
                            borderStyle: "solid",
                            borderColor: scannedId ? "rgba(0,0,0,0.78)" : "rgba(0,0,0,0.40)",
                            transition: "border-color 0.3s ease",
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
                                    ? "10px 0 0 0"
                                    : pos === "tr"
                                        ? "0 10px 0 0"
                                        : pos === "bl"
                                            ? "0 0 0 10px"
                                            : "0 0 10px 0",
                            top: pos.includes("t") ? 0 : undefined,
                            bottom: pos.includes("b") ? 0 : undefined,
                            left: pos.includes("l") ? 0 : undefined,
                            right: pos.includes("r") ? 0 : undefined,
                        }}
                    />
                ))}

                {/* empty state */}
                {!scannedProduct && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <div className="w-11 h-11 rounded-xl bg-white/80 backdrop-blur-sm border border-neutral-200/50 flex items-center justify-center mb-3 shadow-md">
                            <Scan className="w-5 h-5 text-neutral-400" strokeWidth={1.5} />
                        </div>
                        <p className="text-xs text-neutral-500 font-medium">Drag to explore</p>
                        <p className="text-xs text-neutral-400 mt-1">Bring items into frame to preview</p>
                    </div>
                )}

                {/* preview panel */}
                <AnimatePresence>
                    {scannedProduct && (
                        <motion.div
                            key={scannedProduct.id}
                            initial={{ opacity: 0, scale: 0.85, rotateX: 8, y: 18, filter: "blur(4px)" }}
                            animate={{ opacity: 1, scale: 1, rotateX: 0, y: 0, filter: "blur(0px)" }}
                            exit={{ opacity: 0, scale: 0.92, y: 10, filter: "blur(2px)" }}
                            transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
                            className="absolute inset-0 rounded-2xl bg-white/98 backdrop-blur-xl border border-neutral-200/70 shadow-2xl shadow-black/10 overflow-hidden pointer-events-auto"
                            style={{ perspective: 1000 }}
                        >
                            {/* scan line */}
                            <div
                                key={scanPulseKey}
                                className="absolute left-0 right-0 h-[2px]"
                                style={{
                                    top: 0,
                                    background: "linear-gradient(90deg, transparent, rgba(0,0,0,0.3), transparent)",
                                    animation: "coveScanLine 0.6s ease-out forwards",
                                }}
                            />

                            <div className="flex h-full">
                                {/* left image */}
                                <div className="w-2/5 h-full bg-neutral-50 relative overflow-hidden">
                                    <img
                                        src={safeImg(scannedProduct.imageSrc)}
                                        alt={scannedProduct.name}
                                        className="w-full h-full object-cover"
                                        draggable={false}
                                        onError={(e) => {
                                            const target = e.currentTarget as HTMLImageElement
                                            if (target.src.includes("fallback.jpg")) return
                                            target.src = "/clothing-images/fallback.jpg"
                                        }}
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/10" />
                                    {!!scannedProduct.badge && (
                                        <div className="absolute top-3 left-3">
                                            <span className="px-2 py-1 text-xs font-medium bg-neutral-900 text-white rounded">
                                                {scannedProduct.badge}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* right info */}
                                <div className="w-3/5 h-full p-5 flex flex-col justify-between">
                                    <div>
                                        <p className="text-xs text-neutral-400 font-medium uppercase tracking-wider mb-1">
                                            {scannedProduct.type ?? "Item"}
                                        </p>
                                        <h3 className="text-lg font-semibold text-neutral-900 tracking-tight leading-tight mb-2">
                                            {scannedProduct.name}
                                        </h3>
                                        <p className="text-base font-medium text-neutral-700">€{scannedProduct.price.toFixed(2)}</p>

                                        {/* colors (best effort; you have names, not hex) */}
                                        {scannedProduct.colorNames?.length > 0 && (
                                            <div className="flex items-center gap-2 mt-3">
                                                <span className="text-xs text-neutral-400">Colors:</span>
                                                <div className="flex gap-1.5">
                                                    {scannedProduct.colorNames.slice(0, 4).map((c) => (
                                                        <div
                                                            key={c}
                                                            className="h-2.5 w-2.5 rounded-full border border-neutral-200 bg-neutral-900/20"
                                                            title={c}
                                                        />
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex flex-col gap-2">
                                        <button className="w-full py-2.5 px-4 bg-neutral-900 text-white text-sm font-medium rounded-xl hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2">
                                            <ShoppingBag className="w-4 h-4" strokeWidth={1.5} />
                                            Add to Cart
                                        </button>
                                        <div className="flex gap-2">
                                            <button className="flex-1 py-2 px-3 bg-neutral-100 text-neutral-600 text-xs font-medium rounded-lg hover:bg-neutral-200 transition-colors">
                                                View Details
                                            </button>
                                            <button className="flex-1 py-2 px-3 bg-neutral-100 text-neutral-600 text-xs font-medium rounded-lg hover:bg-neutral-200 transition-colors flex items-center justify-center gap-1">
                                                <Zap className="w-3 h-3" strokeWidth={1.5} />
                                                Buy Now
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* bottom blur overlay */}
            <div
                className="absolute bottom-0 left-0 right-0 pointer-events-none"
                style={{
                    height: 120,
                    background:
                        "linear-gradient(to top, rgba(255,255,255,1) 0%, rgba(255,255,255,0.95) 20%, rgba(255,255,255,0.7) 50%, rgba(255,255,255,0) 100%)",
                    backdropFilter: "blur(8px)",
                    WebkitBackdropFilter: "blur(8px)",
                    maskImage: "linear-gradient(to top, black 0%, black 50%, transparent 100%)",
                    WebkitMaskImage: "linear-gradient(to top, black 0%, black 50%, transparent 100%)",
                    zIndex: 35,
                }}
            />

            {/* keyframes */}
            <style jsx global>{`
        @keyframes coveScanLine {
          0% {
            top: 0%;
            opacity: 1;
          }
          100% {
            top: 100%;
            opacity: 0.3;
          }
        }
      `}</style>
        </section>
    )
}
