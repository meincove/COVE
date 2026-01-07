

// "use client"

// import { useCallback, useEffect, useMemo, useRef, useState } from "react"
// import { AnimatePresence, motion } from "framer-motion"
// import { Scan, ShoppingBag, Zap } from "lucide-react"
// import type { UiProduct } from "@/src/lib/catalog/shared"

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
// ] as const

// function safeImg(src?: string) {
//     return src || "/clothing-images/fallback.jpg"
// }

// function clamp(v: number, min: number, max: number) {
//     return Math.max(min, Math.min(max, v))
// }

// function shuffleIdx(n: number) {
//     const a = Array.from({ length: n }, (_, i) => i)
//     for (let i = a.length - 1; i > 0; i--) {
//         const j = Math.floor(Math.random() * (i + 1))
//             ;[a[i], a[j]] = [a[j], a[i]]
//     }
//     return a
// }

// function pickProductsForTopic(products: UiProduct[], topicIndex: number, count: number) {
//     const topic = HERO_TOPICS[topicIndex] ?? HERO_TOPICS[0]
//     const pool = products.filter(topic.match)
//     const base = pool.length >= Math.max(10, Math.floor(count * 0.7)) ? pool : products

//     const out: UiProduct[] = []
//     const used = new Set<string>()

//     let guard = 0
//     while (out.length < count && guard < count * 10) {
//         guard++
//         const p = base[Math.floor(Math.random() * base.length)]
//         if (!p?.id) continue
//         if (used.has(p.id)) continue
//         used.add(p.id)
//         out.push(p)
//     }

//     guard = 0
//     while (out.length < count && guard < count * 10) {
//         guard++
//         const p = products[Math.floor(Math.random() * products.length)]
//         if (!p?.id) continue
//         if (used.has(p.id)) continue
//         used.add(p.id)
//         out.push(p)
//     }

//     return out.slice(0, count)
// }

// function rubberBand(value: number, min: number, max: number, maxOver = 240, strength = 0.35) {
//     if (value < min) {
//         const over = min - value
//         return min - Math.min(maxOver, over * strength)
//     }
//     if (value > max) {
//         const over = value - max
//         return max + Math.min(maxOver, over * strength)
//     }
//     return value
// }

// export default function HeroScanner({
//     products,
//     heightVh = 70,
//     minHeight = 600,
//     showFps,
// }: {
//     products: UiProduct[]
//     heightVh?: number
//     minHeight?: number
//     showFps?: boolean
// }) {
//     // --- layout tuning ---
//     const TILE_W = 78
//     const TILE_H = 105
//     const GAP = 160 // more spacing (stronger)
//     const TILE_COUNT = 96
//     const COLS = 12
//     const PAD = 220
//     const JITTER = 30

//     // perf: LOD window (only tiles near center get “heavy” 3D)
//     const LOD_DIST = 0.95 // < 1 = closer to center only

//     const viewportRef = useRef<HTMLDivElement | null>(null)
//     const fieldRef = useRef<HTMLDivElement | null>(null)
//     const tileRefs = useRef<Array<HTMLButtonElement | null>>([])
//     tileRefs.current = []
//     const scannerRef = useRef<HTMLDivElement | null>(null)

//     // drag refs
//     const isDraggingRef = useRef(false)
//     const startRef = useRef({ x: 0, y: 0 })
//     const posRef = useRef({ x: 0, y: 0 })
//     const targetPosRef = useRef({ x: 0, y: 0 })
//     const velRef = useRef({ x: 0, y: 0 })
//     const lastRef = useRef({ x: 0, y: 0, t: 0 })
//     const rafRef = useRef<number | null>(null)

//     // UI state (rare updates only)
//     const [topicIndex, setTopicIndex] = useState(0)
//     const [tiles, setTiles] = useState<UiProduct[]>([])
//     const [scannedId, setScannedId] = useState<string | null>(null)
//     const [scanPulseKey, setScanPulseKey] = useState(0)
//     const [draggingUI, setDraggingUI] = useState(false)

//     // fps meter
//     const [fps, setFps] = useState<number | null>(null)
//     const [showFpsState, setShowFpsState] = useState(!!showFps)
//     useEffect(() => {
//         if (typeof window === "undefined") return
//         const sp = new URLSearchParams(window.location.search)
//         if (sp.get("fps") === "1") setShowFpsState(true)
//     }, [])

//     const topicIndexRef = useRef(0)
//     useEffect(() => {
//         topicIndexRef.current = topicIndex
//     }, [topicIndex])

//     const scannedProduct = useMemo(() => {
//         if (!scannedId) return null
//         return tiles.find((t) => t?.id === scannedId) ?? null
//     }, [tiles, scannedId])

//     const rows = Math.ceil(TILE_COUNT / COLS)

//     // precompute centers (no DOM measurement per tile ever)
//     const layout = useMemo(() => {
//         const canvasW = PAD * 2 + COLS * TILE_W + (COLS - 1) * GAP
//         const canvasH = PAD * 2 + rows * TILE_H + (rows - 1) * GAP

//         const jitter: Array<{ x: number; y: number }> = []
//         for (let i = 0; i < TILE_COUNT; i++) {
//             const s = (i + 1) * 2654435761
//             const fx = ((s ^ (s >>> 16)) & 1023) / 1023
//             const fy = ((s ^ (s >>> 8)) & 1023) / 1023
//             jitter.push({ x: (fx * 2 - 1) * JITTER, y: (fy * 2 - 1) * JITTER })
//         }

//         const centers: Array<{ x: number; y: number }> = []
//         for (let i = 0; i < TILE_COUNT; i++) {
//             const r = Math.floor(i / COLS)
//             const c = i % COLS
//             const cx = -canvasW / 2 + PAD + c * (TILE_W + GAP) + TILE_W / 2 + jitter[i].x
//             const cy = -canvasH / 2 + PAD + r * (TILE_H + GAP) + TILE_H / 2 + jitter[i].y
//             centers.push({ x: cx, y: cy })
//         }

//         return { canvasW, canvasH, centers }
//     }, [COLS, GAP, PAD, rows])

//     // bounds so empty space doesn't show
//     const getBounds = useCallback(() => {
//         const viewport = viewportRef.current
//         if (!viewport) return { minX: -800, maxX: 800, minY: -500, maxY: 500 }
//         const vr = viewport.getBoundingClientRect()

//         const maxX = Math.max(0, (layout.canvasW - vr.width) / 2)
//         const maxY = Math.max(0, (layout.canvasH - vr.height) / 2)

//         const extra = 40
//         return {
//             minX: -(maxX + extra),
//             maxX: maxX + extra,
//             minY: -(maxY + extra),
//             maxY: maxY + extra,
//         }
//     }, [layout.canvasH, layout.canvasW])

//     // scanner throttle + avoid spam setState
//     const scannedIdRef = useRef<string | null>(null)
//     useEffect(() => {
//         scannedIdRef.current = scannedId
//     }, [scannedId])

//     const scanLastAtRef = useRef(0)

//     // FPS tracker
//     const fpsRef = useRef({ last: 0, frames: 0 })

//     const renderFrame = useCallback(() => {
//         const viewport = viewportRef.current
//         const field = fieldRef.current
//         if (!viewport || !field) return

//         // 1) move the field (CRITICAL: DOM write, not JSX)
//         field.style.transform = `translate3d(calc(-50% + ${posRef.current.x}px), calc(-50% + ${posRef.current.y}px), 0)`

//         // viewport rect once per frame (OK)
//         const vr = viewport.getBoundingClientRect()
//         const vCx = vr.width / 2
//         const vCy = vr.height / 2

//         // 2) fisheye / curvature (LOD near center only)
//         const curve = 220
//         const edgeScaleDrop = 0.28
//         const rotStrengthX = 10
//         const rotStrengthY = 18

//         const vx = velRef.current.x
//         const vy = velRef.current.y

//         // visible margin optimization
//         const margin = 280

//         for (let i = 0; i < TILE_COUNT; i++) {
//             const el = tileRefs.current[i]
//             if (!el) continue

//             const local = layout.centers[i]
//             const cx = vCx + local.x + posRef.current.x
//             const cy = vCy + local.y + posRef.current.y

//             // skip tiles far outside viewport (don’t touch them each frame)
//             if (cx < -margin || cx > vr.width + margin || cy < -margin || cy > vr.height + margin) continue

//             const dx = (cx - vCx) / (vr.width * 0.5)
//             const dy = (cy - vCy) / (vr.height * 0.5)
//             const dist = Math.min(1.35, Math.sqrt(dx * dx + dy * dy))

//             // LOD: far tiles get a cheap static transform
//             if (dist > LOD_DIST) {
//                 const s = clamp(1 - dist * 0.12, 0.74, 0.96)
//                 el.style.transform = `translateZ(${-dist * 90}px) scale(${s})`
//                 continue
//             }

//             const scale = clamp(1 - dist * edgeScaleDrop, 0.66, 1.03)
//             const tz = -dist * curve
//             const rotY = dx * rotStrengthY + vx * 0.06
//             const rotX = -dy * rotStrengthX + vy * 0.05
//             const rotZ = dx * -1.6

//             el.style.transform = `perspective(1100px) translateZ(${tz}px) rotateY(${rotY}deg) rotateX(${rotX}deg) rotateZ(${rotZ}deg) scale(${scale})`
//         }

//         // 3) scanner check (throttled hard)
//         const now = performance.now()
//         if (now - scanLastAtRef.current > 110) {
//             scanLastAtRef.current = now

//             const scanner = scannerRef.current
//             if (scanner) {
//                 const sr = scanner.getBoundingClientRect()
//                 const pad = 46
//                 const scx = sr.left + sr.width / 2
//                 const scy = sr.top + sr.height / 2
//                 const vLeft = vr.left
//                 const vTop = vr.top

//                 let bestIdx = -1
//                 let bestDist = Infinity

//                 for (let i = 0; i < TILE_COUNT; i++) {
//                     const p = tiles[i]
//                     if (!p?.id) continue
//                     const local = layout.centers[i]
//                     const cx = vLeft + vCx + local.x + posRef.current.x
//                     const cy = vTop + vCy + local.y + posRef.current.y

//                     const inside =
//                         cx > sr.left + pad && cx < sr.right - pad && cy > sr.top + pad && cy < sr.bottom - pad

//                     if (!inside) continue
//                     const d = Math.hypot(cx - scx, cy - scy)
//                     if (d < bestDist) {
//                         bestDist = d
//                         bestIdx = i
//                     }
//                 }

//                 const nextId = bestIdx >= 0 ? tiles[bestIdx]?.id ?? null : null
//                 if (nextId !== scannedIdRef.current) {
//                     scannedIdRef.current = nextId
//                     setScannedId(nextId)
//                     if (nextId) setScanPulseKey((k) => k + 1)
//                 }
//             }
//         }

//         // 4) FPS meter
//         if (showFpsState) {
//             const fr = fpsRef.current
//             if (!fr.last) fr.last = now
//             fr.frames += 1
//             if (now - fr.last >= 1000) {
//                 const next = Math.round((fr.frames * 1000) / (now - fr.last))
//                 fr.frames = 0
//                 fr.last = now
//                 setFps(next)
//             }
//         }
//     }, [LOD_DIST, TILE_COUNT, layout.centers, showFpsState, tiles])

//     // init tiles
//     useEffect(() => {
//         if (!products.length) return
//         const firstIdx = HERO_TOPICS.findIndex((t) => products.some(t.match))
//         const idx = firstIdx === -1 ? 0 : firstIdx
//         setTopicIndex(idx)
//         setTiles(pickProductsForTopic(products, idx, TILE_COUNT))
//     }, [products.length])

//     // ensure first frame applies transforms
//     useEffect(() => {
//         // only after tiles mount
//         if (!tiles.length) return
//         requestAnimationFrame(() => renderFrame())
//     }, [tiles.length, renderFrame])

//     // drag
//     useEffect(() => {
//         const viewport = viewportRef.current
//         if (!viewport) return

//         const onPointerDown = (e: PointerEvent) => {
//             isDraggingRef.current = true
//             setDraggingUI(true)
//             viewport.setPointerCapture(e.pointerId)

//             startRef.current = { x: e.clientX - posRef.current.x, y: e.clientY - posRef.current.y }
//             lastRef.current = { x: e.clientX, y: e.clientY, t: performance.now() }
//             velRef.current = { x: 0, y: 0 }

//             viewport.classList.add("cove-dragging")
//             viewport.classList.remove("cove-grab")

//             if (rafRef.current) cancelAnimationFrame(rafRef.current)
//             rafRef.current = requestAnimationFrame(function tick() {
//                 if (!isDraggingRef.current) return
//                 // follow target during drag
//                 posRef.current.x = targetPosRef.current.x
//                 posRef.current.y = targetPosRef.current.y
//                 renderFrame()
//                 rafRef.current = requestAnimationFrame(tick)
//             })
//         }

//         const onPointerMove = (e: PointerEvent) => {
//             if (!isDraggingRef.current) return

//             const bounds = getBounds()

//             const rawX = e.clientX - startRef.current.x
//             const rawY = e.clientY - startRef.current.y

//             targetPosRef.current = {
//                 x: rubberBand(rawX, bounds.minX, bounds.maxX, 240, 0.35),
//                 y: rubberBand(rawY, bounds.minY, bounds.maxY, 240, 0.35),
//             }

//             const t = performance.now()
//             const dt = Math.max(1, t - lastRef.current.t)
//             velRef.current = {
//                 x: ((e.clientX - lastRef.current.x) / dt) * 16,
//                 y: ((e.clientY - lastRef.current.y) / dt) * 16,
//             }
//             lastRef.current = { x: e.clientX, y: e.clientY, t }
//         }

//         const onPointerUp = () => {
//             if (!isDraggingRef.current) return
//             isDraggingRef.current = false

//             viewport.classList.add("cove-grab")
//             viewport.classList.remove("cove-dragging")

//             // hide heavy UI slightly after release (feels premium)
//             setTimeout(() => setDraggingUI(false), 120)

//             if (rafRef.current) cancelAnimationFrame(rafRef.current)

//             // momentum + spring
//             const step = () => {
//                 const bounds = getBounds()

//                 const targetX = clamp(posRef.current.x, bounds.minX, bounds.maxX)
//                 const targetY = clamp(posRef.current.y, bounds.minY, bounds.maxY)

//                 const dx = targetX - posRef.current.x
//                 const dy = targetY - posRef.current.y

//                 const k = 0.12
//                 const damping = 0.86

//                 velRef.current.x += dx * k
//                 velRef.current.y += dy * k
//                 velRef.current.x *= damping
//                 velRef.current.y *= damping

//                 posRef.current.x += velRef.current.x
//                 posRef.current.y += velRef.current.y

//                 renderFrame()

//                 const done =
//                     Math.abs(velRef.current.x) < 0.35 &&
//                     Math.abs(velRef.current.y) < 0.35 &&
//                     Math.abs(dx) < 0.8 &&
//                     Math.abs(dy) < 0.8

//                 if (!done) {
//                     rafRef.current = requestAnimationFrame(step)
//                 } else {
//                     posRef.current = { x: targetX, y: targetY }
//                     velRef.current = { x: 0, y: 0 }
//                     renderFrame()
//                 }
//             }

//             rafRef.current = requestAnimationFrame(step)
//         }

//         viewport.addEventListener("pointerdown", onPointerDown, { passive: true })
//         viewport.addEventListener("pointermove", onPointerMove, { passive: true })
//         viewport.addEventListener("pointerup", onPointerUp, { passive: true })
//         viewport.addEventListener("pointercancel", onPointerUp, { passive: true })

//         viewport.classList.add("cove-grab")

//         return () => {
//             viewport.removeEventListener("pointerdown", onPointerDown)
//             viewport.removeEventListener("pointermove", onPointerMove)
//             viewport.removeEventListener("pointerup", onPointerUp)
//             viewport.removeEventListener("pointercancel", onPointerUp)
//             if (rafRef.current) cancelAnimationFrame(rafRef.current)
//         }
//     }, [getBounds, renderFrame])

//     // topic cycle
//     useEffect(() => {
//         if (!products.length) return
//         if (!tiles.length) return

//         const HOLD_MS = 15000
//         const TRANSITION_MS = 5000

//         let holdTimer: any = null
//         let swapTimer: any = null
//         let cancelled = false

//         const schedule = () => {
//             if (cancelled) return
//             holdTimer = setTimeout(() => {
//                 if (cancelled) return

//                 const nextIdx = (topicIndexRef.current + 1) % HERO_TOPICS.length
//                 const nextTiles = pickProductsForTopic(products, nextIdx, TILE_COUNT)
//                 setTopicIndex(nextIdx)

//                 const order = shuffleIdx(TILE_COUNT)
//                 const tick = Math.max(90, Math.floor(TRANSITION_MS / Math.max(1, order.length)))

//                 let k = 0
//                 swapTimer = setInterval(() => {
//                     if (cancelled) return
//                     const i = order[k]
//                     setTiles((prev) => {
//                         const copy = prev.slice()
//                         copy[i] = nextTiles[i]
//                         return copy
//                     })
//                     k++
//                     if (k >= order.length) {
//                         clearInterval(swapTimer)
//                         swapTimer = null
//                         schedule()
//                     }
//                 }, tick)
//             }, HOLD_MS)
//         }

//         schedule()
//         return () => {
//             cancelled = true
//             if (holdTimer) clearTimeout(holdTimer)
//             if (swapTimer) clearInterval(swapTimer)
//         }
//     }, [products.length, tiles.length])

//     const pill = HERO_TOPICS[topicIndex]?.pill ?? "Curated picks"

//     return (
//         <section
//             className="relative left-1/2 w-screen -translate-x-1/2 overflow-hidden"
//             style={{
//                 height: `${heightVh}vh`,
//                 minHeight,
//                 background: "linear-gradient(to bottom, rgb(250 250 249), rgb(250 250 249), rgb(255 255 255))",
//             }}
//         >
//             {/* FPS */}
//             {showFpsState && (
//                 <div className="absolute top-4 right-4 z-[60] pointer-events-none">
//                     <div className="px-3 py-1.5 rounded-full bg-black/75 text-white text-xs font-medium backdrop-blur-md">
//                         {fps ? `${fps} FPS` : "-- FPS"}
//                     </div>
//                 </div>
//             )}

//             {/* Aura feedback (CSS-only, cheap) */}
//             <div
//                 className="absolute left-0 right-0 bottom-0 z-[34] pointer-events-none"
//                 style={{
//                     height: 160,
//                     opacity: draggingUI ? 1 : 0,
//                     transition: "opacity 220ms ease",
//                     background:
//                         "radial-gradient(80% 70% at 50% 100%, rgba(99,102,241,0.20), transparent 70%), radial-gradient(60% 60% at 30% 110%, rgba(244,114,182,0.18), transparent 70%), radial-gradient(60% 60% at 70% 110%, rgba(251,191,36,0.16), transparent 70%)",
//                     filter: "blur(10px)",
//                 }}
//             >
//                 <div className="cove-aura-shimmer absolute inset-0" />
//             </div>

//             {/* topic pill */}
//             <div className="absolute top-5 left-1/2 -translate-x-1/2 z-40">
//                 <div className="px-5 py-2.5 rounded-full bg-white/90 backdrop-blur-md border border-neutral-200/60 shadow-lg shadow-black/5">
//                     <p className="text-xs text-neutral-600 font-medium tracking-wide">{pill}</p>
//                 </div>
//             </div>

//             {/* viewport */}
//             <div ref={viewportRef} className="absolute inset-0 overflow-hidden">
//                 <div
//                     ref={fieldRef}
//                     className="absolute left-1/2 top-1/2"
//                     style={{
//                         width: layout.canvasW,
//                         height: layout.canvasH,
//                         transform: "translate3d(-50%,-50%,0)",
//                         willChange: "transform",
//                     }}
//                 >
//                     <div
//                         className="absolute left-0 top-0"
//                         style={{
//                             width: layout.canvasW,
//                             height: layout.canvasH,
//                             display: "grid",
//                             gridTemplateColumns: `repeat(${COLS}, ${TILE_W}px)`,
//                             gridTemplateRows: `repeat(${rows}, ${TILE_H}px)`,
//                             gap: `${GAP}px`,
//                             padding: PAD,
//                             placeContent: "center",
//                         }}
//                     >
//                         {Array.from({ length: TILE_COUNT }).map((_, i) => {
//                             const p = tiles[i]
//                             const img = p?.imageSrc ?? p?.images?.[0]
//                             return (
//                                 <button
//                                     key={i}
//                                     ref={(el) => {
//                                         tileRefs.current[i] = el
//                                         if (el) {
//                                             el.style.willChange = "transform"
//                                             el.style.transformStyle = "preserve-3d"
//                                         }
//                                     }}
//                                     type="button"
//                                     className="cove-tile relative rounded-xl overflow-hidden bg-white select-none"
//                                     style={{
//                                         width: TILE_W,
//                                         height: TILE_H,
//                                         boxShadow: "0 4px 18px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.05)",
//                                     }}
//                                 >
//                                     <div className="absolute inset-0">
//                                         {p ? (
//                                             <AnimatePresence mode="popLayout">
//                                                 <motion.img
//                                                     key={p.id}
//                                                     src={safeImg(img)}
//                                                     alt={p.name}
//                                                     className="h-full w-full object-cover"
//                                                     draggable={false}
//                                                     initial={{ opacity: 0, scale: 1.01 }}
//                                                     animate={{ opacity: 1, scale: 1 }}
//                                                     exit={{ opacity: 0, scale: 0.99 }}
//                                                     transition={{ duration: 0.2, ease: "easeOut" }}
//                                                     onError={(e) => {
//                                                         const target = e.currentTarget as HTMLImageElement
//                                                         if (target.src.includes("fallback.jpg")) return
//                                                         target.src = "/clothing-images/fallback.jpg"
//                                                     }}
//                                                 />
//                                             </AnimatePresence>
//                                         ) : (
//                                             <div className="h-full w-full bg-neutral-200/40 animate-pulse" />
//                                         )}
//                                     </div>
//                                 </button>
//                             )
//                         })}
//                     </div>
//                 </div>
//             </div>

//             {/* scanner zone */}
//             <div
//                 ref={scannerRef}
//                 className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none"
//                 style={{ width: "min(380px, 75vw)", height: "min(260px, 38vh)" }}
//             >
//                 {(["tl", "tr", "bl", "br"] as const).map((pos) => (
//                     <div
//                         key={pos}
//                         className="absolute"
//                         style={{
//                             width: 28,
//                             height: 28,
//                             borderStyle: "solid",
//                             borderColor: scannedId ? "rgba(0,0,0,0.78)" : "rgba(0,0,0,0.40)",
//                             transition: "border-color 0.3s ease",
//                             borderWidth:
//                                 pos === "tl"
//                                     ? "2px 0 0 2px"
//                                     : pos === "tr"
//                                         ? "2px 2px 0 0"
//                                         : pos === "bl"
//                                             ? "0 0 2px 2px"
//                                             : "0 2px 2px 0",
//                             borderRadius:
//                                 pos === "tl"
//                                     ? "10px 0 0 0"
//                                     : pos === "tr"
//                                         ? "0 10px 0 0"
//                                         : pos === "bl"
//                                             ? "0 0 0 10px"
//                                             : "0 0 10px 0",
//                             top: pos.includes("t") ? 0 : undefined,
//                             bottom: pos.includes("b") ? 0 : undefined,
//                             left: pos.includes("l") ? 0 : undefined,
//                             right: pos.includes("r") ? 0 : undefined,
//                         }}
//                     />
//                 ))}

//                 {/* IMPORTANT perf: don’t render heavy preview while dragging */}
//                 <AnimatePresence>
//                     {!draggingUI && scannedProduct && (
//                         <motion.div
//                             key={scannedProduct.id}
//                             initial={{ opacity: 0, scale: 0.92, y: 14 }}
//                             animate={{ opacity: 1, scale: 1, y: 0 }}
//                             exit={{ opacity: 0, scale: 0.96, y: 10 }}
//                             transition={{ duration: 0.35, ease: [0.25, 1, 0.5, 1] }}
//                             className="absolute inset-0 rounded-2xl bg-white/98 backdrop-blur-xl border border-neutral-200/70 shadow-2xl shadow-black/10 overflow-hidden pointer-events-auto"
//                         >
//                             <div
//                                 key={scanPulseKey}
//                                 className="absolute left-0 right-0 h-[2px]"
//                                 style={{
//                                     top: 0,
//                                     background: "linear-gradient(90deg, transparent, rgba(0,0,0,0.3), transparent)",
//                                     animation: "coveScanLine 0.6s ease-out forwards",
//                                 }}
//                             />
//                             <div className="flex h-full">
//                                 <div className="w-2/5 h-full bg-neutral-50 relative overflow-hidden">
//                                     <img
//                                         src={safeImg(scannedProduct.imageSrc ?? scannedProduct.images?.[0])}
//                                         alt={scannedProduct.name}
//                                         className="w-full h-full object-cover"
//                                         draggable={false}
//                                         onError={(e) => {
//                                             const target = e.currentTarget as HTMLImageElement
//                                             if (target.src.includes("fallback.jpg")) return
//                                             target.src = "/clothing-images/fallback.jpg"
//                                         }}
//                                     />
//                                 </div>
//                                 <div className="w-3/5 h-full p-5 flex flex-col justify-between">
//                                     <div>
//                                         <p className="text-xs text-neutral-400 font-medium uppercase tracking-wider mb-1">
//                                             {scannedProduct.type ?? "Item"}
//                                         </p>
//                                         <h3 className="text-lg font-semibold text-neutral-900 tracking-tight leading-tight mb-2">
//                                             {scannedProduct.name}
//                                         </h3>
//                                         <p className="text-base font-medium text-neutral-700">
//                                             €{Number(scannedProduct.price ?? 0).toFixed(2)}
//                                         </p>
//                                     </div>

//                                     <div className="flex flex-col gap-2">
//                                         <button className="w-full py-2.5 px-4 bg-neutral-900 text-white text-sm font-medium rounded-xl hover:bg-neutral-800 transition-colors flex items-center justify-center gap-2">
//                                             <ShoppingBag className="w-4 h-4" strokeWidth={1.5} />
//                                             Add to Cart
//                                         </button>
//                                         <div className="flex gap-2">
//                                             <button className="flex-1 py-2 px-3 bg-neutral-100 text-neutral-600 text-xs font-medium rounded-lg hover:bg-neutral-200 transition-colors">
//                                                 View Details
//                                             </button>
//                                             <button className="flex-1 py-2 px-3 bg-neutral-100 text-neutral-600 text-xs font-medium rounded-lg hover:bg-neutral-200 transition-colors flex items-center justify-center gap-1">
//                                                 <Zap className="w-3 h-3" strokeWidth={1.5} />
//                                                 Buy Now
//                                             </button>
//                                         </div>
//                                     </div>
//                                 </div>
//                             </div>
//                         </motion.div>
//                     )}
//                 </AnimatePresence>

//                 {!scannedProduct && (
//                     <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
//                         <div className="w-11 h-11 rounded-xl bg-white/80 backdrop-blur-sm border border-neutral-200/50 flex items-center justify-center mb-3 shadow-md">
//                             <Scan className="w-5 h-5 text-neutral-400" strokeWidth={1.5} />
//                         </div>
//                         <p className="text-xs text-neutral-500 font-medium">Drag to explore</p>
//                         <p className="text-xs text-neutral-400 mt-1">Bring items into frame to preview</p>
//                     </div>
//                 )}
//             </div>

//             {/* bottom blur overlay */}
//             <div
//                 className="absolute bottom-0 left-0 right-0 pointer-events-none"
//                 style={{
//                     height: 120,
//                     background:
//                         "linear-gradient(to top, rgba(255,255,255,1) 0%, rgba(255,255,255,0.95) 20%, rgba(255,255,255,0.7) 50%, rgba(255,255,255,0) 100%)",
//                     backdropFilter: "blur(8px)",
//                     WebkitBackdropFilter: "blur(8px)",
//                     maskImage: "linear-gradient(to top, black 0%, black 50%, transparent 100%)",
//                     WebkitMaskImage: "linear-gradient(to top, black 0%, black 50%, transparent 100%)",
//                     zIndex: 35,
//                 }}
//             />

//             <style jsx global>{`
//         @keyframes coveScanLine {
//           0% {
//             top: 0%;
//             opacity: 1;
//           }
//           100% {
//             top: 100%;
//             opacity: 0.3;
//           }
//         }

//         .cove-grab {
//           cursor: grab;
//         }
//         .cove-dragging {
//           cursor: grabbing;
//         }

//         /* no transitions while dragging = removes “stutter” */
//         .cove-dragging .cove-tile {
//           transition: none !important;
//         }
//         .cove-tile {
//           transition: transform 420ms cubic-bezier(0.25, 0.46, 0.45, 0.94);
//         }

//         /* shimmer layer (cheap) */
//         .cove-aura-shimmer {
//           background: linear-gradient(
//             90deg,
//             transparent,
//             rgba(255, 255, 255, 0.22),
//             transparent
//           );
//           transform: translateX(-60%);
//           animation: coveAuraMove 1.2s linear infinite;
//           opacity: 0.55;
//           mix-blend-mode: overlay;
//         }

//         @keyframes coveAuraMove {
//           0% {
//             transform: translateX(-60%);
//           }
//           100% {
//             transform: translateX(60%);
//           }
//         }
//       `}</style>
//         </section>
//     )
// }





"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { Scan, ShoppingBag, Zap } from "lucide-react"
import type { UiProduct } from "@/src/lib/catalog/shared"

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
    return src || "/clothing-images/fallback.jpg"
}

function clamp(v: number, min: number, max: number) {
    return Math.max(min, Math.min(max, v))
}

// deterministic RNG (no hydration issues)
function mulberry32(seed: number) {
    return function () {
        let t = (seed += 0x6d2b79f5)
        t = Math.imul(t ^ (t >>> 15), t | 1)
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
}

function pickProductsForTopic(products: UiProduct[], topicIndex: number, count: number) {
    const topic = HERO_TOPICS[topicIndex] ?? HERO_TOPICS[0]
    const pool = products.filter(topic.match)
    const base = pool.length >= Math.max(10, Math.floor(count * 0.7)) ? pool : products

    const out: UiProduct[] = []
    let guard = 0
    while (out.length < count && guard++ < 2000) {
        const idx = Math.floor(Math.random() * base.length)
        if (!base[idx]) continue
        out.push(base[idx])
    }
    return out.slice(0, count)
}

/**
 * Fast layout: jittered grid (NO overlap, but looks random)
 * - Deterministic using seed
 * - Very cheap to compute and scan against (math only)
 */
type TileLayout = { x: number; y: number }

function buildJitteredLayout(opts: {
    count: number
    cols: number
    tileW: number
    tileH: number
    gapX: number
    gapY: number
    seed: number
}) {
    const { count, cols, tileW, tileH, gapX, gapY, seed } = opts
    const rows = Math.ceil(count / cols)
    const rand = mulberry32(seed)

    const layouts: TileLayout[] = []
    for (let i = 0; i < count; i++) {
        const c = i % cols
        const r = Math.floor(i / cols)

        // base grid position
        const baseX = c * (tileW + gapX)
        const baseY = r * (tileH + gapY)

        // jitter inside a safe envelope (prevents collisions)
        const jx = (rand() - 0.5) * gapX * 0.65
        const jy = (rand() - 0.5) * gapY * 0.65

        layouts.push({ x: baseX + jx, y: baseY + jy })
    }

    // center around (0,0)
    const totalW = cols * tileW + (cols - 1) * gapX
    const totalH = rows * tileH + (rows - 1) * gapY
    const cx = totalW / 2
    const cy = totalH / 2

    return layouts.map((p) => ({ x: p.x - cx, y: p.y - cy }))
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
    // size & spacing (you can tune later)
    const TILE_W = 90
    const TILE_H = 120
    const GAP_X = 140
    const GAP_Y = 130
    const TILE_COUNT = 80
    const COLS = 10

    const viewportRef = useRef<HTMLDivElement | null>(null)
    const moverRef = useRef<HTMLDivElement | null>(null)

    // drag refs (no rerenders on move)
    const draggingRef = useRef(false)
    const pointerIdRef = useRef<number | null>(null)
    const startRef = useRef({ x: 0, y: 0 })
    const posRef = useRef({ x: 0, y: 0 })
    const rafRef = useRef<number | null>(null)

    // scan refs
    const scannedIdRef = useRef<string | null>(null)

    // state
    const [topicIndex, setTopicIndex] = useState(0)
    const [tiles, setTiles] = useState<UiProduct[]>([])
    const [scannedId, setScannedId] = useState<string | null>(null)
    const [scanPulseKey, setScanPulseKey] = useState(0)

    // hydration-safe seed
    const [layoutSeed, setLayoutSeed] = useState(1)
    useEffect(() => {
        // changes only after hydration
        setLayoutSeed(2)
    }, [])

    // init tiles
    useEffect(() => {
        if (!products.length) return
        const firstIdx = HERO_TOPICS.findIndex((t) => products.some(t.match))
        const idx = firstIdx === -1 ? 0 : firstIdx
        setTopicIndex(idx)
        setTiles(pickProductsForTopic(products, idx, TILE_COUNT))
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [products.length])

    // layout (deterministic)
    const layout = useMemo(() => {
        return buildJitteredLayout({
            count: TILE_COUNT,
            cols: COLS,
            tileW: TILE_W,
            tileH: TILE_H,
            gapX: GAP_X,
            gapY: GAP_Y,
            seed: 1337 + layoutSeed * 97 + topicIndex * 1009,
        })
    }, [layoutSeed, topicIndex])

    const scannedProduct = useMemo(() => {
        if (!scannedId) return null
        return tiles.find((t) => t?.id === scannedId) ?? null
    }, [tiles, scannedId])

    const pill = HERO_TOPICS[topicIndex]?.pill ?? "Curated picks"

    const getBounds = useCallback(() => {
        const viewport = viewportRef.current
        if (!viewport) return { minX: -700, maxX: 700, minY: -450, maxY: 450 }
        const v = viewport.getBoundingClientRect()
        // allow free drag but not empty forever
        const extraX = v.width * 0.55
        const extraY = v.height * 0.4
        return { minX: -extraX, maxX: extraX, minY: -extraY, maxY: extraY }
    }, [])

    const applyTransform = useCallback(() => {
        const mover = moverRef.current
        if (!mover) return
        mover.style.transform = `translate3d(${posRef.current.x}px, ${posRef.current.y}px, 0)`
    }, [])

    const scheduleFrame = useCallback(() => {
        if (rafRef.current != null) return
        rafRef.current = requestAnimationFrame(() => {
            rafRef.current = null
            applyTransform()

            // scan on same frame (math only)
            const viewport = viewportRef.current
            if (!viewport) return

            const vr = viewport.getBoundingClientRect()
            const scanW = Math.min(380, vr.width * 0.75)
            const scanH = Math.min(260, vr.height * 0.38)

            const halfW = scanW / 2 - 44
            const halfH = scanH / 2 - 44

            let best: { id: string; d: number } | null = null

            for (let i = 0; i < TILE_COUNT; i++) {
                const p = tiles[i]
                if (!p) continue
                const L = layout[i]
                if (!L) continue

                // tiles are centered around (0,0), scanner is also centered at (0,0)
                const cx = posRef.current.x + L.x
                const cy = posRef.current.y + L.y

                if (Math.abs(cx) <= halfW && Math.abs(cy) <= halfH) {
                    const d = Math.hypot(cx, cy)
                    if (!best || d < best.d) best = { id: p.id, d }
                }
            }

            const nextId = best?.id ?? null
            if (nextId !== scannedIdRef.current) {
                scannedIdRef.current = nextId
                setScannedId(nextId)
                if (nextId) setScanPulseKey((k) => k + 1)
            }
        })
    }, [applyTransform, layout, tiles])

    // end drag safely
    const endDrag = useCallback(() => {
        if (!draggingRef.current) return
        draggingRef.current = false

        const viewport = viewportRef.current
        if (viewport) {
            viewport.classList.add("cursor-grab")
            viewport.classList.remove("cursor-grabbing")
        }

        const pid = pointerIdRef.current
        pointerIdRef.current = null
        try {
            if (viewport && pid != null) viewport.releasePointerCapture(pid)
        } catch { }

        // snap back into bounds
        const b = getBounds()
        posRef.current.x = clamp(posRef.current.x, b.minX, b.maxX)
        posRef.current.y = clamp(posRef.current.y, b.minY, b.maxY)
        scheduleFrame()
    }, [getBounds, scheduleFrame])

    // pointer drag (stable, no “dies after first”)
    useEffect(() => {
        const viewport = viewportRef.current
        if (!viewport) return

        viewport.classList.add("cursor-grab")

        const onMove = (e: PointerEvent) => {
            if (!draggingRef.current) return
            e.preventDefault()

            const b = getBounds()
            const nx = e.clientX - startRef.current.x
            const ny = e.clientY - startRef.current.y

            posRef.current.x = clamp(nx, b.minX, b.maxX)
            posRef.current.y = clamp(ny, b.minY, b.maxY)

            scheduleFrame()
        }

        const onUp = (_e: PointerEvent) => {
            window.removeEventListener("pointermove", onMove as any)
            window.removeEventListener("pointerup", onUp as any)
            window.removeEventListener("pointercancel", onUp as any)
            endDrag()
        }

        const onDown = (e: PointerEvent) => {
            e.preventDefault()
            draggingRef.current = true

            pointerIdRef.current = e.pointerId
            try {
                viewport.setPointerCapture(e.pointerId)
            } catch { }

            startRef.current = { x: e.clientX - posRef.current.x, y: e.clientY - posRef.current.y }

            viewport.classList.add("cursor-grabbing")
            viewport.classList.remove("cursor-grab")

            window.addEventListener("pointermove", onMove as any, { passive: false })
            window.addEventListener("pointerup", onUp as any, { passive: false })
            window.addEventListener("pointercancel", onUp as any, { passive: false })
        }

        const onLost = () => onUp(new PointerEvent("pointerup"))
        const onBlur = () => onUp(new PointerEvent("pointerup"))
        const onVis = () => {
            if (document.hidden) onUp(new PointerEvent("pointerup"))
        }

        viewport.addEventListener("pointerdown", onDown as any, { passive: false })
        viewport.addEventListener("lostpointercapture", onLost as any)
        window.addEventListener("blur", onBlur)
        document.addEventListener("visibilitychange", onVis)

        return () => {
            viewport.removeEventListener("pointerdown", onDown as any)
            viewport.removeEventListener("lostpointercapture", onLost as any)
            window.removeEventListener("blur", onBlur)
            document.removeEventListener("visibilitychange", onVis)

            window.removeEventListener("pointermove", onMove as any)
            window.removeEventListener("pointerup", onUp as any)
            window.removeEventListener("pointercancel", onUp as any)

            if (rafRef.current) cancelAnimationFrame(rafRef.current)
        }
    }, [endDrag, getBounds, scheduleFrame])

    // keep centered on topic change (optional)
    useEffect(() => {
        posRef.current = { x: 0, y: 0 }
        scheduleFrame()
    }, [topicIndex, scheduleFrame])

    return (
        <section
            className="relative w-full overflow-hidden bg-gradient-to-b from-stone-50 via-stone-50 to-white"
            style={{ height: `${heightVh}vh`, minHeight }}
        >
            {/* topic pill */}
            <div className="absolute top-5 left-1/2 -translate-x-1/2 z-40 pointer-events-none">
                <div className="px-5 py-2.5 rounded-full bg-white/90 backdrop-blur-md border border-neutral-200/60 shadow-lg shadow-black/5">
                    <p className="text-xs text-neutral-600 font-medium tracking-wide">{pill}</p>
                </div>
            </div>

            {/* viewport that must capture drag */}
            <div
                ref={viewportRef}
                className="absolute inset-0 overflow-hidden cursor-grab"
                style={{ touchAction: "none" }}
            >
                {/* mover (ONLY this transforms) */}
                <div
                    ref={moverRef}
                    className="absolute left-1/2 top-1/2 will-change-transform"
                    style={{ transform: "translate3d(0,0,0)" }}
                >
                    {/* tiles field */}
                    {Array.from({ length: TILE_COUNT }).map((_, i) => {
                        const p = tiles[i]
                        const L = layout[i]
                        if (!L) return null

                        const img = p?.imageSrc ?? p?.images?.[0]

                        return (
                            <div
                                key={`${p?.id ?? "empty"}-${i}`}
                                className="absolute"
                                style={{
                                    left: "50%",
                                    top: "50%",
                                    width: TILE_W,
                                    height: TILE_H,
                                    transform: `translate3d(${L.x}px, ${L.y}px, 0)`,
                                    pointerEvents: "none", // CRITICAL: prevents drag getting blocked
                                }}
                            >
                                <div
                                    className="relative rounded-xl overflow-hidden bg-white"
                                    style={{
                                        width: TILE_W,
                                        height: TILE_H,
                                        boxShadow: "0 4px 20px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.05)",
                                    }}
                                >
                                    {p ? (
                                        <AnimatePresence mode="popLayout">
                                            <motion.img
                                                key={p.id}
                                                src={safeImg(img)}
                                                alt={p.name}
                                                className="h-full w-full object-cover"
                                                draggable={false}
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                exit={{ opacity: 0 }}
                                                transition={{ duration: 0.18, ease: "easeOut" }}
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
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* scanner zone */}
            <div
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none"
                style={{ width: "min(380px, 75vw)", height: "min(260px, 38vh)" }}
            >
                {(["tl", "tr", "bl", "br"] as const).map((pos) => (
                    <div
                        key={pos}
                        className="absolute"
                        style={{
                            width: 28,
                            height: 28,
                            borderStyle: "solid",
                            borderColor: scannedId ? "rgba(0,0,0,0.78)" : "rgba(0,0,0,0.40)",
                            transition: "border-color 0.25s ease",
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

                {!scannedProduct && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <div className="w-11 h-11 rounded-xl bg-white/80 backdrop-blur-sm border border-neutral-200/50 flex items-center justify-center mb-3 shadow-md">
                            <Scan className="w-5 h-5 text-neutral-400" strokeWidth={1.5} />
                        </div>
                        <p className="text-xs text-neutral-500 font-medium">Drag to explore</p>
                        <p className="text-xs text-neutral-400 mt-1">Bring items into frame to preview</p>
                    </div>
                )}

                <AnimatePresence>
                    {scannedProduct && (
                        <motion.div
                            key={scannedProduct.id}
                            initial={{ opacity: 0, scale: 0.95, y: 10, filter: "blur(2px)" }}
                            animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
                            exit={{ opacity: 0, scale: 0.98, y: 8, filter: "blur(1px)" }}
                            transition={{ duration: 0.28, ease: "easeOut" }}
                            className="absolute inset-0 rounded-2xl bg-white/98 backdrop-blur-xl border border-neutral-200/70 shadow-2xl shadow-black/10 overflow-hidden pointer-events-auto"
                        >
                            <div
                                key={scanPulseKey}
                                className="absolute left-0 right-0 h-[2px]"
                                style={{
                                    top: 0,
                                    background: "linear-gradient(90deg, transparent, rgba(0,0,0,0.25), transparent)",
                                    animation: "coveScanLine 0.55s ease-out forwards",
                                }}
                            />

                            <div className="flex h-full">
                                <div className="w-2/5 h-full bg-neutral-50 relative overflow-hidden">
                                    <img
                                        src={safeImg(scannedProduct.imageSrc ?? scannedProduct.images?.[0])}
                                        alt={scannedProduct.name}
                                        className="w-full h-full object-cover"
                                        draggable={false}
                                        onError={(e) => {
                                            const target = e.currentTarget as HTMLImageElement
                                            if (target.src.includes("fallback.jpg")) return
                                            target.src = "/clothing-images/fallback.jpg"
                                        }}
                                    />
                                    {!!scannedProduct.badge && (
                                        <div className="absolute top-3 left-3">
                                            <span className="px-2 py-1 text-xs font-medium bg-neutral-900 text-white rounded">
                                                {scannedProduct.badge}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div className="w-3/5 h-full p-5 flex flex-col justify-between">
                                    <div>
                                        <p className="text-xs text-neutral-400 font-medium uppercase tracking-wider mb-1">
                                            {scannedProduct.type ?? "Item"}
                                        </p>
                                        <h3 className="text-lg font-semibold text-neutral-900 tracking-tight leading-tight mb-2">
                                            {scannedProduct.name}
                                        </h3>
                                        <p className="text-base font-medium text-neutral-700">
                                            €{Number(scannedProduct.price ?? 0).toFixed(2)}
                                        </p>
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

            {/* bottom fade */}
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

            <style jsx global>{`
        @keyframes coveScanLine {
          0% {
            top: 0%;
            opacity: 1;
          }
          100% {
            top: 100%;
            opacity: 0.25;
          }
        }
      `}</style>
        </section>
    )
}
