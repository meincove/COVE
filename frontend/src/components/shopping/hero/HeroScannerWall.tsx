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
//                     })}
//                 </motion.div>
//             </div>
//         </div>
//     )
// }

"use client"

import * as React from "react"
import { motion, useMotionValue, animate, useAnimationFrame } from "framer-motion"
import type { UiProduct } from "@/src/lib/catalog/shared"

type Tile = {
    key: string
    product: UiProduct
    x: number
    y: number
    w: number
    h: number
}

function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n))
}

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

        const r0 = el.getBoundingClientRect()
        setSize({ w: Math.round(r0.width), h: Math.round(r0.height) })

        const ro = new ResizeObserver((entries) => {
            const r = entries[0]?.contentRect
            if (!r) return
            setSize({ w: Math.round(r.width), h: Math.round(r.height) })
        })

        ro.observe(el)
        return () => ro.disconnect()
    }, [])

    return { ref, size }
}

function makeFallbackProducts(count = 12): UiProduct[] {
    return Array.from({ length: count }, (_, i) => ({
        id: `placeholder-${i}`,
        name: "",
        price: 0,
        images: ["/clothing-images/fallback.jpg"],
        imageSrc: "/clothing-images/fallback.jpg",
        colorNames: [],
        sizes: [],
    })) as UiProduct[]
}

function buildTiles(products: UiProduct[], vw: number, vh: number, canvasScale: number, gapFactor: number): Tile[] {
    const stageW = Math.max(1, Math.round(vw * canvasScale))
    const stageH = Math.max(1, Math.round(vh * canvasScale))

    // ✅ "90% zoom look": slightly smaller base + better spacing
    const base = clamp(Math.round(Math.min(vw, vh) * 0.135), 96, 185)
    const gap = clamp(Math.round(base * gapFactor), 78, 220)

    const portraitW = base
    const portraitH = Math.round(base * 1.28)

    const landW = Math.round(base * 1.40)
    const landH = Math.round(base * 0.92)

    const stepX = Math.round(base + gap)
    const stepY = Math.round(base + gap)

    const cols = Math.max(6, Math.ceil(stageW / stepX) + 2)
    const rows = Math.max(4, Math.ceil(stageH / stepY) + 2)
    const needed = cols * rows

    const pool = (products ?? []).filter(Boolean)
    const src = pool.length ? pool : makeFallbackProducts(12)

    const tiles: Tile[] = []

    for (let i = 0; i < needed; i++) {
        const p = src[i % src.length] // repeats visuals to fill canvas (not cloned backend; reused)

        const portrait = i % 2 === 0
        const w = portrait ? portraitW : landW
        const h = portrait ? portraitH : landH

        const c = i % cols
        const r = Math.floor(i / cols)

        const jitterX = ((i * 37) % 13) - 6
        const jitterY = ((i * 53) % 13) - 6

        tiles.push({
            key: `${p.id}-${i}`,
            product: p,
            x: c * stepX + jitterX,
            y: r * stepY + jitterY,
            w,
            h,
        })
    }

    return tiles
}

export default function HeroScannerWall({
    products,
    onDraggingChange,
    onScan,
    onDragPointChange,
    canvasScale = 1.55,
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

    const tiles = React.useMemo(() => {
        if (!vw || !vh) return []
        return buildTiles(products ?? [], vw, vh, canvasScale, gapFactor)
    }, [products, vw, vh, canvasScale, gapFactor])

    const stageW = Math.max(1, Math.round(vw * canvasScale))
    const stageH = Math.max(1, Math.round(vh * canvasScale))

    const x = useMotionValue(0)
    const y = useMotionValue(0)

    React.useEffect(() => {
        if (!vw || !vh) return
        const maxX = Math.max(0, stageW - vw)
        const maxY = Math.max(0, stageH - vh)
        x.set(-maxX / 2)
        y.set(-maxY / 2)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [vw, vh, stageW, stageH])

    const overscroll = React.useMemo(() => {
        if (!vw || !vh) return 420
        return clamp(Math.round(Math.max(vw, vh) * 0.62), 520, 1100)
    }, [vw, vh])

    const strictBounds = React.useMemo(() => {
        const maxX = Math.max(0, stageW - vw)
        const maxY = Math.max(0, stageH - vh)
        return { left: -maxX, right: 0, top: -maxY, bottom: 0 }
    }, [stageW, stageH, vw, vh])

    const dragBounds = React.useMemo(
        () => ({
            left: strictBounds.left - overscroll,
            right: strictBounds.right + overscroll,
            top: strictBounds.top - overscroll,
            bottom: strictBounds.bottom + overscroll,
        }),
        [strictBounds, overscroll]
    )

    const tileRefs = React.useRef<Record<string, HTMLDivElement | null>>({})
    const [dragging, setDragging] = React.useState(false)

    React.useEffect(() => onDraggingChange?.(dragging), [dragging, onDraggingChange])

    const reportPoint = React.useCallback(
        (clientX: number, clientY: number, isActive: boolean) => {
            const el = ref.current
            if (!el) return
            const r = el.getBoundingClientRect()
            const local = { x: clientX - r.left, y: clientY - r.top }
            onDragPointChange?.(local, isActive)
        },
        [onDragPointChange]
    )

    const retractToStrict = React.useCallback(() => {
        const tx = clamp(x.get(), strictBounds.left, strictBounds.right)
        const ty = clamp(y.get(), strictBounds.top, strictBounds.bottom)

        // ✅ soft return (no snap)
        animate(x, tx, { type: "spring", stiffness: 92, damping: 26, mass: 1.25 })
        animate(y, ty, { type: "spring", stiffness: 92, damping: 26, mass: 1.25 })
    }, [x, y, strictBounds])

    useAnimationFrame(() => {
        if (!vw || !vh) return

        const xv = x.get()
        const yv = y.get()

        // scanner region
        const boxW = Math.min(410, vw * 0.84)
        const boxH = Math.min(270, vh * 0.40)
        const boxLeft = vw / 2 - boxW / 2
        const boxTop = vh / 2 - boxH / 2

        let best: { p: UiProduct; d: number } | null = null

        for (const t of tiles) {
            const el = tileRefs.current[t.key]
            if (!el) continue

            const cx = t.x + xv + t.w / 2
            const cy = t.y + yv + t.h / 2

            const nx = (cx - vw / 2) / (vw / 2)
            const ny = (cy - vh / 2) / (vh / 2)

            const ax = Math.min(1, Math.abs(nx))
            const ay = Math.min(1, Math.abs(ny))

            const z = Math.pow(ax, 1.7) * 90 + Math.pow(ay, 1.7) * 55 - 65
            const rotY = -nx * 16
            const rotX = ny * 9
            const scale = 1 - (ax * 0.03 + ay * 0.02)

            el.style.transform = `translateZ(${z.toFixed(1)}px) rotateY(${rotY.toFixed(2)}deg) rotateX(${rotX.toFixed(
                2
            )}deg) scale(${scale.toFixed(3)})`

            const inside = cx >= boxLeft && cx <= boxLeft + boxW && cy >= boxTop && cy <= boxTop + boxH
            if (inside) {
                const d = Math.hypot(cx - vw / 2, cy - vh / 2)
                if (!best || d < best.d) best = { p: t.product, d }
            }
        }

        onScan?.(best?.p ?? null)
    })

    return (
        <div
            ref={ref}
            className="relative w-full h-full overflow-hidden"
            style={{ cursor: dragging ? "grabbing" : "grab" }}
            onPointerLeave={() => onDragPointChange?.(null, false)}
        >
            <div className="absolute inset-0" style={{ perspective: "1200px", transformStyle: "preserve-3d" }}>
                <motion.div
                    className="absolute left-0 top-0"
                    style={{ width: stageW, height: stageH, x, y, transformStyle: "preserve-3d" }}
                    drag
                    dragMomentum
                    dragElastic={0.34}
                    dragConstraints={dragBounds}
                    onDragStart={(e, info) => {
                        setDragging(true)
                        reportPoint(info.point.x, info.point.y, true)
                    }}
                    onDrag={(e, info) => {
                        reportPoint(info.point.x, info.point.y, true)
                    }}
                    onDragEnd={(e, info) => {
                        reportPoint(info.point.x, info.point.y, false)
                        setDragging(false)
                        retractToStrict()
                    }}
                >
                    {tiles.map((t) => {
                        const p = t.product
                        const src = safeImg(p?.imageSrc ?? p?.images?.[0])

                        return (
                            <div
                                key={t.key}
                                ref={(node) => {
                                    tileRefs.current[t.key] = node
                                }}
                                className="absolute will-change-transform"
                                style={{ left: t.x, top: t.y, width: t.w, height: t.h, transformStyle: "preserve-3d" }}
                            >
                                <div className="w-full h-full rounded-3xl overflow-hidden bg-white shadow-[0_14px_40px_rgba(0,0,0,0.16)]">
                                    <img
                                        src={src}
                                        alt={p?.name ?? "Product"}
                                        className="w-full h-full object-cover"
                                        draggable={false}
                                        decoding="async"
                                        loading="eager"
                                        onError={(e) => {
                                            const img = e.currentTarget as HTMLImageElement
                                            if (img.src.includes("fallback.jpg")) return
                                            img.src = "/clothing-images/fallback.jpg"
                                        }}
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
