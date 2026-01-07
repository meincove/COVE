"use client"

import { useEffect, useMemo, useRef } from "react"
import type { UiProduct } from "@/src/lib/catalog/shared"

type Layout = { x: number; y: number; z: number; r: number; s: number }
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))

function clamp(v: number, min: number, max: number) {
    return Math.max(min, Math.min(max, v))
}

function rubberBand(value: number, min: number, max: number, maxOver = 240, strength = 0.35) {
    if (value < min) return min - Math.min(maxOver, (min - value) * strength)
    if (value > max) return max + Math.min(maxOver, (value - max) * strength)
    return value
}

function makeLayout(count: number, seed: number): Layout[] {
    const RX = 1305
    const RY = 775
    const DEPTH = 240

    const out: Layout[] = []
    for (let i = 0; i < count; i++) {
        const t = i + 1 + seed * 17
        const u = (i + 0.5) / count
        const r = Math.sqrt(u)
        const a = t * GOLDEN_ANGLE

        const baseX = Math.cos(a) * r * RX
        const baseY = Math.sin(a) * r * RY

        const nx = (Math.sin(t * 1.7) + Math.cos(t * 0.9)) * 18
        const ny = (Math.cos(t * 1.4) + Math.sin(t * 0.8)) * 16

        const x = baseX + nx
        const y = baseY + ny

        const depth = -(r * r) * DEPTH + Math.sin(t * 0.6) * 12
        const rot = (x / RX) * 12 + Math.sin(t * 0.3) * 2
        const scale = 0.86 + (1 - r) * 0.24

        out.push({ x, y, z: depth, r: rot, s: scale })
    }
    return out
}

export default function HeroPanel({
    tiles,
    layoutSeed,
    onScanChange,
    onDragActiveChange,
    scannerPad = 46,
    tileW = 78,
    tileH = 105,
}: {
    tiles: UiProduct[]
    layoutSeed: number
    onScanChange: (id: string | null) => void
    onDragActiveChange: (v: boolean) => void
    scannerPad?: number
    tileW?: number
    tileH?: number
}) {
    const viewportRef = useRef<HTMLDivElement | null>(null)
    const moverRef = useRef<HTMLDivElement | null>(null)

    // stable refs (no re-render bugs)
    const tilesRef = useRef<UiProduct[]>(tiles)
    const layoutRef = useRef<Layout[]>([])
    const scanCbRef = useRef(onScanChange)
    const dragCbRef = useRef(onDragActiveChange)

    useEffect(() => {
        tilesRef.current = tiles
    }, [tiles])
    useEffect(() => {
        scanCbRef.current = onScanChange
    }, [onScanChange])
    useEffect(() => {
        dragCbRef.current = onDragActiveChange
    }, [onDragActiveChange])

    const layout = useMemo(() => makeLayout(tiles.length, layoutSeed), [tiles.length, layoutSeed])
    useEffect(() => {
        layoutRef.current = layout
    }, [layout])

    const posRef = useRef({ x: 0, y: 0 })
    const velRef = useRef({ x: 0, y: 0 })
    const startRef = useRef({ x: 0, y: 0 })
    const lastRef = useRef({ x: 0, y: 0, t: 0 })
    const draggingRef = useRef(false)
    const pidRef = useRef<number | null>(null)
    const rafRef = useRef<number | null>(null)
    const momentumRef = useRef<number | null>(null)

    const getScannerSize = () => {
        const v = viewportRef.current?.getBoundingClientRect()
        if (!v) return { w: 380, h: 260 }
        return { w: Math.min(380, v.width * 0.75), h: Math.min(260, v.height * 0.38) }
    }

    const getBounds = () => {
        const extra = 460
        return { minX: -extra, maxX: extra, minY: -extra * 0.65, maxY: extra * 0.65 }
    }

    const flush = () => {
        if (rafRef.current != null) return
        rafRef.current = requestAnimationFrame(() => {
            rafRef.current = null
            const mover = moverRef.current
            if (!mover) return

            mover.style.transform = `translate3d(${posRef.current.x}px, ${posRef.current.y}px, 0)`

            // scanning (no DOM reads per tile)
            const { w, h } = getScannerSize()
            const halfW = w / 2 - scannerPad
            const halfH = h / 2 - scannerPad

            let bestId: string | null = null
            let bestD = Infinity

            const t = tilesRef.current
            const L = layoutRef.current

            for (let i = 0; i < t.length; i++) {
                const p = t[i]
                const li = L[i]
                if (!p || !li) continue

                const dx = posRef.current.x + li.x
                const dy = posRef.current.y + li.y

                if (Math.abs(dx) <= halfW && Math.abs(dy) <= halfH) {
                    const d = Math.hypot(dx, dy)
                    if (d < bestD) {
                        bestD = d
                        bestId = p.id
                    }
                }
            }

            scanCbRef.current(bestId)
        })
    }

    const endDrag = (snap: boolean) => {
        if (!draggingRef.current) return
        draggingRef.current = false
        dragCbRef.current(false)

        const viewport = viewportRef.current
        if (viewport) {
            viewport.classList.add("cursor-grab")
            viewport.classList.remove("cursor-grabbing")
        }

        const pid = pidRef.current
        pidRef.current = null
        try {
            if (viewport && pid != null) viewport.releasePointerCapture(pid)
        } catch { }

        if (!snap) return

        if (momentumRef.current) cancelAnimationFrame(momentumRef.current)

        const step = () => {
            const b = getBounds()
            const targetX = clamp(posRef.current.x, b.minX, b.maxX)
            const targetY = clamp(posRef.current.y, b.minY, b.maxY)

            const dx = targetX - posRef.current.x
            const dy = targetY - posRef.current.y

            velRef.current.x += dx * 0.12
            velRef.current.y += dy * 0.12

            velRef.current.x *= 0.86
            velRef.current.y *= 0.86

            posRef.current.x += velRef.current.x
            posRef.current.y += velRef.current.y

            flush()

            const done =
                Math.abs(velRef.current.x) < 0.35 &&
                Math.abs(velRef.current.y) < 0.35 &&
                Math.abs(dx) < 0.8 &&
                Math.abs(dy) < 0.8

            if (!done) momentumRef.current = requestAnimationFrame(step)
            else {
                posRef.current.x = targetX
                posRef.current.y = targetY
                velRef.current.x = 0
                velRef.current.y = 0
                flush()
            }
        }

        momentumRef.current = requestAnimationFrame(step)
    }

    useEffect(() => {
        const viewport = viewportRef.current
        if (!viewport) return

        viewport.classList.add("cursor-grab")

        const handleMove = (e: PointerEvent) => {
            if (!draggingRef.current) return
            e.preventDefault()

            const b = getBounds()
            const rawX = e.clientX - startRef.current.x
            const rawY = e.clientY - startRef.current.y

            posRef.current.x = rubberBand(rawX, b.minX, b.maxX, 260, 0.35)
            posRef.current.y = rubberBand(rawY, b.minY, b.maxY, 220, 0.35)

            const t = performance.now()
            const dt = Math.max(1, t - lastRef.current.t)

            velRef.current.x = ((e.clientX - lastRef.current.x) / dt) * 16
            velRef.current.y = ((e.clientY - lastRef.current.y) / dt) * 16
            lastRef.current = { x: e.clientX, y: e.clientY, t }

            flush()
        }

        const handleUp = (_e: PointerEvent) => {
            window.removeEventListener("pointermove", handleMove as any)
            window.removeEventListener("pointerup", handleUp as any)
            window.removeEventListener("pointercancel", handleUp as any)
            endDrag(true)
        }

        const handleDown = (e: PointerEvent) => {
            e.preventDefault()

            draggingRef.current = true
            dragCbRef.current(true)

            pidRef.current = e.pointerId
            try {
                viewport.setPointerCapture(e.pointerId)
            } catch { }

            startRef.current = { x: e.clientX - posRef.current.x, y: e.clientY - posRef.current.y }
            lastRef.current = { x: e.clientX, y: e.clientY, t: performance.now() }
            velRef.current = { x: 0, y: 0 }

            viewport.classList.add("cursor-grabbing")
            viewport.classList.remove("cursor-grab")

            if (momentumRef.current) cancelAnimationFrame(momentumRef.current)

            window.addEventListener("pointermove", handleMove as any, { passive: false })
            window.addEventListener("pointerup", handleUp as any, { passive: false })
            window.addEventListener("pointercancel", handleUp as any, { passive: false })
        }

        const onLostCapture = () => handleUp(new PointerEvent("pointerup"))
        const onBlur = () => handleUp(new PointerEvent("pointerup"))
        const onVis = () => {
            if (document.hidden) handleUp(new PointerEvent("pointerup"))
        }

        viewport.addEventListener("pointerdown", handleDown as any, { passive: false })
        viewport.addEventListener("lostpointercapture", onLostCapture as any)
        window.addEventListener("blur", onBlur)
        document.addEventListener("visibilitychange", onVis)

        return () => {
            viewport.removeEventListener("pointerdown", handleDown as any)
            viewport.removeEventListener("lostpointercapture", onLostCapture as any)
            window.removeEventListener("blur", onBlur)
            document.removeEventListener("visibilitychange", onVis)

            window.removeEventListener("pointermove", handleMove as any)
            window.removeEventListener("pointerup", handleUp as any)
            window.removeEventListener("pointercancel", handleUp as any)

            endDrag(false)
            if (rafRef.current) cancelAnimationFrame(rafRef.current)
            if (momentumRef.current) cancelAnimationFrame(momentumRef.current)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // reset on seed change
    useEffect(() => {
        posRef.current = { x: 0, y: 0 }
        velRef.current = { x: 0, y: 0 }
        flush()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [layoutSeed])

    return (
        <div
            ref={viewportRef}
            className="absolute inset-0 overflow-hidden cursor-grab pointer-events-auto"
            style={{ touchAction: "none" }}
        >
            {/* cheap vignette / subtle curvature feel */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    background:
                        "radial-gradient(1200px 520px at 50% 45%, rgba(255,255,255,0) 35%, rgba(0,0,0,0.035) 78%, rgba(0,0,0,0.06) 100%)",
                    opacity: 0.65,
                }}
            />

            <div
                ref={moverRef}
                className="absolute left-1/2 top-1/2 will-change-transform"
                style={{ transform: "translate3d(0,0,0)" }}
            >
                <div
                    className="relative"
                    style={{
                        width: 2800,
                        height: 1700,
                        transform: "translate(-50%, -50%)",
                        transformStyle: "preserve-3d",
                        perspective: "1100px",
                    }}
                >
                    {tiles.map((p, i) => {
                        const L = layout[i]
                        if (!p || !L) return null
                        const img = p.imageSrc ?? p.images?.[0]

                        return (
                            <div
                                key={p.id + "-" + i}
                                className="absolute select-none"
                                style={{
                                    left: "50%",
                                    top: "50%",
                                    width: tileW,
                                    height: tileH,
                                    transform: `translate3d(${L.x}px, ${L.y}px, ${L.z}px) rotateY(${L.r}deg) scale(${L.s})`,
                                    transformStyle: "preserve-3d",
                                    backfaceVisibility: "hidden",
                                    pointerEvents: "none",
                                }}
                            >
                                <div
                                    className="w-full h-full rounded-xl overflow-hidden bg-white"
                                    style={{
                                        boxShadow: "0 5px 26px rgba(0,0,0,0.10), 0 1px 3px rgba(0,0,0,0.06)",
                                    }}
                                >
                                    <img
                                        src={img || "/clothing-images/fallback.jpg"}
                                        alt={p.name}
                                        className="w-full h-full object-cover"
                                        draggable={false}
                                        decoding="async"
                                        loading="eager"
                                        onError={(e) => {
                                            const t = e.currentTarget as HTMLImageElement
                                            if (t.src.includes("fallback.jpg")) return
                                            t.src = "/clothing-images/fallback.jpg"
                                        }}
                                    />
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
