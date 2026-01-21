// "use client"

// import * as React from "react"
// import { motion, useMotionValue, animate, useAnimationFrame } from "framer-motion"
// import type { UiProduct } from "@/src/lib/catalog/shared"

// type Tile = {
//     key: string
//     product: UiProduct
//     x: number
//     y: number
//     w: number
//     h: number
// }

// function clamp(n: number, min: number, max: number) {
//     return Math.max(min, Math.min(max, n))
// }

// function safeImg(src?: string) {
//     if (!src) return "/clothing-images/fallback.jpg"
//     if (!src.startsWith("http") && !src.startsWith("/")) return `/clothing-images/${src}`
//     return src
// }

// function useSize<T extends HTMLElement>() {
//     const ref = React.useRef<T | null>(null)
//     const [size, setSize] = React.useState({ w: 0, h: 0 })

//     React.useEffect(() => {
//         if (!ref.current) return
//         const el = ref.current

//         const r0 = el.getBoundingClientRect()
//         setSize({ w: Math.round(r0.width), h: Math.round(r0.height) })

//         const ro = new ResizeObserver((entries) => {
//             const r = entries[0]?.contentRect
//             if (!r) return
//             setSize({ w: Math.round(r.width), h: Math.round(r.height) })
//         })

//         ro.observe(el)
//         return () => ro.disconnect()
//     }, [])

//     return { ref, size }
// }

// function makeFallbackProducts(count = 12): UiProduct[] {
//     return Array.from({ length: count }, (_, i) => ({
//         id: `placeholder-${i}`,
//         name: "",
//         price: 0,
//         images: ["/clothing-images/fallback.jpg"],
//         imageSrc: "/clothing-images/fallback.jpg",
//         colorNames: [],
//         sizes: [],
//     })) as UiProduct[]
// }

// function buildTiles(products: UiProduct[], vw: number, vh: number, canvasScale: number): Tile[] {
//     const stageW = Math.max(1, Math.round(vw * canvasScale))
//     const stageH = Math.max(1, Math.round(vh * canvasScale))

//     const base = clamp(Math.round(Math.min(vw, vh) * 0.16), 120, 220)
//     const gap = clamp(Math.round(base * 0.50), 46, 130) // a bit more spacing

//     const portraitW = base
//     const portraitH = Math.round(base * 1.28)

//     const landW = Math.round(base * 1.40)
//     const landH = Math.round(base * 0.92)

//     const stepX = Math.round(base + gap)
//     const stepY = Math.round(base + gap)

//     const cols = Math.max(6, Math.ceil(stageW / stepX) + 2)
//     const rows = Math.max(4, Math.ceil(stageH / stepY) + 2)
//     const needed = cols * rows

//     const pool = (products ?? []).filter(Boolean)
//     const src = pool.length ? pool : makeFallbackProducts(12)

//     const tiles: Tile[] = []

//     for (let i = 0; i < needed; i++) {
//         const p = src[i % src.length]

//         const portrait = i % 2 === 0
//         const w = portrait ? portraitW : landW
//         const h = portrait ? portraitH : landH

//         const c = i % cols
//         const r = Math.floor(i / cols)

//         const jitterX = ((i * 37) % 13) - 6
//         const jitterY = ((i * 53) % 13) - 6

//         tiles.push({
//             key: `${p.id}-${i}`,
//             product: p,
//             x: c * stepX + jitterX,
//             y: r * stepY + jitterY,
//             w,
//             h,
//         })
//     }

//     return tiles
// }

// export default function HeroScannerWall({
//     products,
//     onDraggingChange,
//     onScan,
//     canvasScale = 1.5,
// }: {
//     products: UiProduct[]
//     onDraggingChange?: (v: boolean) => void
//     onScan?: (p: UiProduct | null) => void
//     canvasScale?: number
// }) {
//     const { ref, size } = useSize<HTMLDivElement>()
//     const vw = size.w
//     const vh = size.h

//     const tiles = React.useMemo(() => {
//         if (!vw || !vh) return []
//         return buildTiles(products ?? [], vw, vh, canvasScale)
//     }, [products, vw, vh, canvasScale])

//     const stageW = Math.max(1, Math.round(vw * canvasScale))
//     const stageH = Math.max(1, Math.round(vh * canvasScale))

//     const x = useMotionValue(0)
//     const y = useMotionValue(0)

//     // center initial view
//     React.useEffect(() => {
//         if (!vw || !vh) return
//         const maxX = Math.max(0, stageW - vw)
//         const maxY = Math.max(0, stageH - vh)
//         x.set(-maxX / 2)
//         y.set(-maxY / 2)
//         // eslint-disable-next-line react-hooks/exhaustive-deps
//     }, [vw, vh, stageW, stageH])

//     // strict bounds = real content bounds
//     const strictBounds = React.useMemo(() => {
//         const maxX = Math.max(0, stageW - vw)
//         const maxY = Math.max(0, stageH - vh)
//         return { left: -maxX, right: 0, top: -maxY, bottom: 0 }
//     }, [stageW, stageH, vw, vh])

//     // ✅ BIGGER overscroll so ANY tile can reach the center frame
//     // (separate X/Y feels better than one min-capped number)
//     const overscrollX = React.useMemo(() => {
//         if (!vw) return 520
//         return Math.round(Math.max(520, vw * 0.75))
//     }, [vw])

//     const overscrollY = React.useMemo(() => {
//         if (!vh) return 380
//         return Math.round(Math.max(380, vh * 0.70))
//     }, [vh])

//     const dragBounds = React.useMemo(
//         () => ({
//             left: strictBounds.left - overscrollX,
//             right: strictBounds.right + overscrollX,
//             top: strictBounds.top - overscrollY,
//             bottom: strictBounds.bottom + overscrollY,
//         }),
//         [strictBounds, overscrollX, overscrollY]
//     )

//     const tileRefs = React.useRef<Record<string, HTMLDivElement | null>>({})

//     useAnimationFrame(() => {
//         if (!vw || !vh) return

//         const xv = x.get()
//         const yv = y.get()

//         // must match overlay-ish feel (slightly bigger than before)
//         const boxW = Math.min(440, vw * 0.86)
//         const boxH = Math.min(300, vh * 0.44)
//         const boxLeft = vw / 2 - boxW / 2
//         const boxTop = vh / 2 - boxH / 2

//         let best: { p: UiProduct; d: number } | null = null

//         for (const t of tiles) {
//             const el = tileRefs.current[t.key]
//             if (!el) continue

//             const cx = t.x + xv + t.w / 2
//             const cy = t.y + yv + t.h / 2

//             const nx = (cx - vw / 2) / (vw / 2)
//             const ny = (cy - vh / 2) / (vh / 2)

//             const ax = Math.min(1, Math.abs(nx))
//             const ay = Math.min(1, Math.abs(ny))

//             const z = Math.pow(ax, 1.7) * 90 + Math.pow(ay, 1.7) * 55 - 65
//             const rotY = -nx * 16
//             const rotX = ny * 9
//             const scale = 1 - (ax * 0.03 + ay * 0.02)

//             el.style.transform = `translateZ(${z.toFixed(1)}px) rotateY(${rotY.toFixed(
//                 2
//             )}deg) rotateX(${rotX.toFixed(2)}deg) scale(${scale.toFixed(3)})`

//             const inside = cx >= boxLeft && cx <= boxLeft + boxW && cy >= boxTop && cy <= boxTop + boxH
//             if (inside) {
//                 const d = Math.hypot(cx - vw / 2, cy - vh / 2)
//                 if (!best || d < best.d) best = { p: t.product, d }
//             }
//         }

//         onScan?.(best?.p ?? null)
//     })

//     const [dragging, setDragging] = React.useState(false)
//     React.useEffect(() => onDraggingChange?.(dragging), [dragging, onDraggingChange])

//     // ✅ retract slowly (less rigid)
//     const retractToStrict = React.useCallback(() => {
//         const tx = clamp(x.get(), strictBounds.left, strictBounds.right)
//         const ty = clamp(y.get(), strictBounds.top, strictBounds.bottom)

//         animate(x, tx, { type: "spring", stiffness: 80, damping: 28, mass: 1.35 })
//         animate(y, ty, { type: "spring", stiffness: 80, damping: 28, mass: 1.35 })
//     }, [x, y, strictBounds])

//     return (
//         <div ref={ref} className="relative w-full h-full overflow-hidden">
//             <div className="absolute inset-0" style={{ perspective: "1200px", transformStyle: "preserve-3d" }}>
//                 <motion.div
//                     className="absolute left-0 top-0 will-change-transform"
//                     style={{
//                         width: stageW,
//                         height: stageH,
//                         x,
//                         y,
//                         transformStyle: "preserve-3d",
//                         cursor: dragging ? "grabbing" : "grab",
//                     }}
//                     drag
//                     dragMomentum
//                     dragElastic={0.34}
//                     dragConstraints={dragBounds}
//                     onDragStart={() => setDragging(true)}
//                     onDragEnd={() => {
//                         setDragging(false)
//                         retractToStrict()
//                     }}
//                 >
//                     {tiles.map((t) => {
//                         const p = t.product
//                         const src = safeImg(p?.imageSrc ?? p?.images?.[0])

//                         return (
//                             <div
//                                 key={t.key}
//                                 ref={(node) => {
//                                     tileRefs.current[t.key] = node
//                                 }}
//                                 className="absolute will-change-transform"
//                                 style={{ left: t.x, top: t.y, width: t.w, height: t.h, transformStyle: "preserve-3d" }}
//                             >
//                                 <div className="w-full h-full rounded-3xl overflow-hidden bg-white shadow-[0_14px_40px_rgba(0,0,0,0.16)]">
//                                     <img
//                                         src={src}
//                                         alt={p?.name ?? "Product"}
//                                         className="w-full h-full object-cover"
//                                         draggable={false}
//                                         decoding="async"
//                                         loading="eager"
//                                         onError={(e) => {
//                                             const img = e.currentTarget as HTMLImageElement
//                                             if (img.src.includes("fallback.jpg")) return
//                                             img.src = "/clothing-images/fallback.jpg"
//                                         }}
//                                     />
//                                 </div>
//                             </div>
//                         )
"use client"

import * as React from "react"
import { motion, useMotionValue } from "framer-motion"
import type { UiProduct } from "@/src/lib/catalog/shared"
import { ScannerGrid, type ScannerTile } from "@/src/lib/scanner/layout"

function safeImg(src?: string) {
    if (!src) return "/clothing-images/fallback.jpg"
    if (!src.startsWith("http") && !src.startsWith("/")) return `/clothing-images/${src}`
    return src
}

function useSize<T extends HTMLElement>() {
    const ref = React.useRef<T | null>(null)
    const [size, setSize] = React.useState({ w: 0, h: 0 })

    React.useEffect(() => {
        if (!ref.current) return
        const el = ref.current
        const update = () => {
            const r = el.getBoundingClientRect()
            setSize({ w: Math.round(r.width), h: Math.round(r.height) })
        }
        update()
        const ro = new ResizeObserver(update)
        ro.observe(el)
        return () => ro.disconnect()
    }, [])

    return { ref, size }
}

export default function HeroScannerWall({
    products,
    onDraggingChange,
    onScan,
    onDragPointChange,
    canvasScale = 1.0, // Scale is handled internally by grid logic now
    gapFactor = 0.95,
}: {
    products: UiProduct[]
    onDraggingChange?: (v: boolean) => void
    onScan?: (p: UiProduct | null) => void
    onDragPointChange?: (p: { x: number; y: number } | null, active: boolean) => void
    canvasScale?: number
    gapFactor?: number
}) {
    const { ref, size } = useSize<HTMLDivElement>()
    const vw = size.w
    const vh = size.h

    // Camera (offset) position in the infinite world
    const camX = React.useRef(0)
    const camY = React.useRef(0)

    // Motion values for smooth rendering? 
    // Actually, for infinite canvas we often just use refs and React state 
    // or direct DOM manipulation. To keep it React-y and smooth, 
    // we'll use a `raf` loop to update visible tiles.

    // Active Tiles State
    const [visibleTiles, setVisibleTiles] = React.useState<ScannerTile[]>([])

    // Grid Logic
    const grid = React.useMemo(() => {
        if (!vw || !vh) return null
        return new ScannerGrid({
            vw,
            vh,
            canvasScale,
            gapFactor,
            products: products ?? []
        })
    }, [vw, vh, products, canvasScale, gapFactor])

    // Update Loop
    React.useEffect(() => {
        if (!grid || !vw || !vh) return

        let animId: number

        const loop = () => {
            // 1. Calculate Visible Tiles
            // We center our "camera" at (0,0) initially.
            // But getVisibleTiles needs top-left.
            // If camX, camY represents the *center* of the view:
            const left = camX.current - vw / 2
            const top = camY.current - vh / 2

            const tiles = grid.getVisibleTiles(left, top, vw, vh)

            // Check Scan (Center of screen)
            // Center of screen is camX, camY in world space
            // Scanner box logic:
            const boxW = Math.min(220, vw * 0.45)
            const boxH = Math.min(160, vh * 0.25)

            let best: { p: UiProduct; d: number } | null = null

            // We can scan against the `tiles` list
            for (const t of tiles) {
                const cx = t.x + t.w / 2
                const cy = t.y + t.h / 2

                // Distance from camera center
                const dx = cx - camX.current
                const dy = cy - camY.current

                // If inside box
                if (Math.abs(dx) < boxW / 2 && Math.abs(dy) < boxH / 2) {
                    const d = Math.hypot(dx, dy)
                    if (!best || d < best.d) best = { p: t.product, d }
                }
            }
            onScan?.(best?.p ?? null)

            // React State Update?
            // To avoid thrashing, only update if keys changed?
            // ScannerGrid returns stable keys.
            // Simplest init: just set tiles.
            // Note: Setting state in RAF is okay for 60fps usually if component is light.
            setVisibleTiles(tiles)

            animId = requestAnimationFrame(loop)
        }

        // Initial center
        // Grid starts at 0,0. Let's center camera.
        // Actually (0,0) is fine for start.

        loop()
        return () => cancelAnimationFrame(animId)
    }, [grid, vw, vh, onScan])

    // Drag Logic (Infinite Pan)
    const isDragging = React.useRef(false)
    const lastPoint = React.useRef({ x: 0, y: 0 })

    const handlePointerDown = (e: React.PointerEvent) => {
        isDragging.current = true
        lastPoint.current = { x: e.clientX, y: e.clientY }
            ; (e.target as HTMLElement).setPointerCapture(e.pointerId)
        onDraggingChange?.(true)

        // Report drag point (center of mass relative to container)
        // Simplification: just report raw point for the wave effect?
        // HeroScannerWall expects local {x,y} for onDragPointChange
        if (ref.current) {
            const r = ref.current.getBoundingClientRect()
            onDragPointChange?.({ x: e.clientX - r.left, y: e.clientY - r.top }, true)
        }
    }

    const handlePointerMove = (e: React.PointerEvent) => {
        // Always report point for "hover" wave effect, even if not dragging
        if (ref.current) {
            const r = ref.current.getBoundingClientRect()
            onDragPointChange?.({ x: e.clientX - r.left, y: e.clientY - r.top }, isDragging.current)
        }

        if (!isDragging.current) return

        const dx = e.clientX - lastPoint.current.x
        const dy = e.clientY - lastPoint.current.y
        lastPoint.current = { x: e.clientX, y: e.clientY }

        // Invert delta: dragging LEFT moves camera RIGHT
        camX.current -= dx
        camY.current -= dy
    }

    const handlePointerUp = (e: React.PointerEvent) => {
        isDragging.current = false
        onDraggingChange?.(false)
        if (ref.current) {
            const r = ref.current.getBoundingClientRect()
            onDragPointChange?.({ x: e.clientX - r.left, y: e.clientY - r.top }, false)
        }
    }

    return (
        <div
            ref={ref}
            className="relative w-full h-full overflow-hidden touch-none cursor-grab active:cursor-grabbing"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            style={{ backgroundColor: "transparent" }} // Catch events
        >
            <div className="absolute inset-0" style={{ perspective: "1200px", perspectiveOrigin: "50% 50%", transformStyle: "preserve-3d" }}>
                {/* ENTIRE CANVAS CURVED INWARD - CONCAVE SURFACE */}
                <motion.div
                    initial={{ opacity: 0, filter: "blur(10px)" }}
                    animate={{ opacity: 1, filter: "blur(0px)" }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                    className="w-full h-full"
                    style={{
                        transformStyle: "preserve-3d",
                        // Curve the entire panel inward like inside of a bowl
                        transform: "rotateX(15deg) translateZ(-200px)",
                        transformOrigin: "center center"
                    }}
                >
                    {visibleTiles.map(t => {
                        // Calculate relative position to camera for rendering
                        // t.x/y is world space. camX/Y is center of screen.
                        // screenX = t.x - (camX - vw/2)
                        const screenX = t.x - (camX.current - vw / 2)
                        const screenY = t.y - (camY.current - vh / 2)

                        // 3D Effect based on distance from center
                        // Center of tile relative to center of screen:
                        const cx = screenX + t.w / 2 - vw / 2
                        const cy = screenY + t.h / 2 - vh / 2

                        const nx = cx / (vw / 2)
                        const ny = cy / (vh / 2)
                        const ax = Math.min(1, Math.abs(nx))
                        const ay = Math.min(1, Math.abs(ny))

                        // ✅ CYLINDRICAL CURVED MONITOR: Horizontal Curve ONLY
                        // We only care about Horizontal (X) distance for the "wrap".
                        // Vertical (Y) should stay relatively flat or have very subtle depth.

                        // DISTANCE: Based primarily on X (Horizontal)
                        const distX = Math.abs(nx)

                        // Z: Curve deeply on X axis.
                        // Center X = 0 (closest/neutral) or pushed back?
                        // "Centre part is more inwards" -> Center is furthest away.
                        // "Outer ones are flat but no in proper POV"
                        // Let's model a Cylinder centered at the viewer.
                        // Radius of cylinder = 1200px.
                        // Z = R * (cos(theta) - 1) ?

                        // Simplified Parabola for X-axis curve (Concave)
                        // At center (nx=0), Z is deepest (-250). At edges (nx=1), Z is 0.
                        // "More inward" -> Deeper Center (-400)
                        const z = -400 + (400 * distX * distX)

                        // Rotations: FLIPPED & REDUCED (30deg at edges)
                        // "Opposite to now" -> -nx
                        // "Too much" -> 30deg
                        const rotY = -nx * 30
                        const rotX = 0       // No vertical tilt (like a real monitor)

                        // Scale: Uniform
                        const scale = 1.0

                        const transform = `translate3d(${screenX}px, ${screenY}px, ${z.toFixed(1)}px) rotateY(${rotY.toFixed(2)}deg) rotateX(${rotX.toFixed(2)}deg) scale(${scale.toFixed(3)})`

                        return (
                            <div
                                key={t.key}
                                // ✅ SHADOWS (User request: "diff and its looks 3D")
                                className="absolute will-change-transform shadow-[0_24px_50px_-12px_rgba(0,0,0,0.35)] rounded-[24px]"
                                style={{
                                    width: t.w,
                                    height: t.h,
                                    top: 0,
                                    left: 0,
                                    transform,
                                    transformStyle: "preserve-3d"
                                }}
                            >
                                <div className="w-full h-full rounded-3xl overflow-hidden bg-white shadow-[0_14px_40px_rgba(0,0,0,0.16)]">
                                    <img
                                        src={safeImg(t.product.imageSrc ?? t.product.images?.[0])}
                                        alt={t.product.name}
                                        className="w-full h-full object-cover select-none"
                                        draggable={false}
                                        loading="eager"
                                    />
                                </div>
                            </div>
                        )
                    })}
                </motion.div>
            </div>
        </div>
    )
}
