"use client"

import { useCallback, useEffect, useMemo, useRef } from "react"
import type { UiProduct } from "@/src/lib/catalog/shared"

function clamp(v: number, min: number, max: number) {
    return Math.max(min, Math.min(max, v))
}

function rubberBand(value: number, min: number, max: number, maxOver = 240, strength = 0.35) {
    if (value < min) {
        const over = min - value
        return min - Math.min(maxOver, over * strength)
    }
    if (value > max) {
        const over = value - max
        return max + Math.min(maxOver, over * strength)
    }
    return value
}

export function HeroField({
    tiles,
    cols = 12,
    tileW = 78,
    tileH = 105,
    gap = 170, // more spacing
    pad = 220,
    heightVh = 70,
    minHeight = 600,
    dragging,
    setDragging,
    onScanChange,
    enablePanelCurvature = true,
}: {
    tiles: UiProduct[]
    cols?: number
    tileW?: number
    tileH?: number
    gap?: number
    pad?: number
    heightVh?: number
    minHeight?: number
    dragging: boolean
    setDragging: (v: boolean) => void
    onScanChange: (id: string | null) => void
    enablePanelCurvature?: boolean
}) {
    const TILE_COUNT = tiles.length
    const rows = Math.ceil(TILE_COUNT / cols)

    const viewportRef = useRef<HTMLDivElement | null>(null)
    const rigRef = useRef<HTMLDivElement | null>(null)
    const fieldRef = useRef<HTMLDivElement | null>(null)
    const scannerRef = useRef<HTMLDivElement | null>(null)

    // drag refs
    const isDraggingRef = useRef(false)
    const startRef = useRef({ x: 0, y: 0 })
    const posRef = useRef({ x: 0, y: 0 })
    const targetRef = useRef({ x: 0, y: 0 })
    const velRef = useRef({ x: 0, y: 0 })
    const lastRef = useRef({ x: 0, y: 0, t: 0 })
    const rafRef = useRef<number | null>(null)

    // scan throttle
    const scanLastAtRef = useRef(0)
    const scannedRef = useRef<string | null>(null)

    // precompute centers (NO DOM reads)
    const layout = useMemo(() => {
        const canvasW = pad * 2 + cols * tileW + (cols - 1) * gap
        const canvasH = pad * 2 + rows * tileH + (rows - 1) * gap

        const centers: Array<{ x: number; y: number }> = []
        for (let i = 0; i < TILE_COUNT; i++) {
            const r = Math.floor(i / cols)
            const c = i % cols
            const cx = -canvasW / 2 + pad + c * (tileW + gap) + tileW / 2
            const cy = -canvasH / 2 + pad + r * (tileH + gap) + tileH / 2
            centers.push({ x: cx, y: cy })
        }

        return { canvasW, canvasH, centers }
    }, [TILE_COUNT, cols, gap, pad, rows, tileH, tileW])

    const getBounds = useCallback(() => {
        const viewport = viewportRef.current
        if (!viewport) return { minX: -800, maxX: 800, minY: -500, maxY: 500 }
        const vr = viewport.getBoundingClientRect()
        const maxX = Math.max(0, (layout.canvasW - vr.width) / 2)
        const maxY = Math.max(0, (layout.canvasH - vr.height) / 2)
        const extra = 40
        return {
            minX: -(maxX + extra),
            maxX: maxX + extra,
            minY: -(maxY + extra),
            maxY: maxY + extra,
        }
    }, [layout.canvasH, layout.canvasW])

    const renderFrame = useCallback(() => {
        const viewport = viewportRef.current
        const rig = rigRef.current
        const field = fieldRef.current
        if (!viewport || !rig || !field) return

        // 1) Move field (cheap)
        field.style.transform = `translate3d(calc(-50% + ${posRef.current.x}px), calc(-50% + ${posRef.current.y}px), 0)`

        // 2) Single-transform “curved rig” (cheap)
        // 2) Fixed curvature (no yaw, no velocity-based rotation)
        if (enablePanelCurvature) {
            rig.style.transformOrigin = "50% 55%"
            rig.style.transform = "perspective(1200px) rotateX(10deg)"
        } else {
            rig.style.transform = "none"
        }


        // 3) Scanner math (throttled) — still works while dragging
        const now = performance.now()
        if (now - scanLastAtRef.current < 75) return
        scanLastAtRef.current = now

        const scanner = scannerRef.current
        if (!scanner) return

        const vr = viewport.getBoundingClientRect()
        const sr = scanner.getBoundingClientRect()

        const vCx = vr.width / 2
        const vCy = vr.height / 2
        const vLeft = vr.left
        const vTop = vr.top

        const padInside = 44
        const scx = sr.left + sr.width / 2
        const scy = sr.top + sr.height / 2

        let bestIdx = -1
        let bestDist = Infinity

        for (let i = 0; i < TILE_COUNT; i++) {
            const p = tiles[i]
            if (!p?.id) continue

            const local = layout.centers[i]
            const cx = vLeft + vCx + local.x + posRef.current.x
            const cy = vTop + vCy + local.y + posRef.current.y

            const inside =
                cx > sr.left + padInside &&
                cx < sr.right - padInside &&
                cy > sr.top + padInside &&
                cy < sr.bottom - padInside

            if (!inside) continue

            const d = Math.hypot(cx - scx, cy - scy)
            if (d < bestDist) {
                bestDist = d
                bestIdx = i
            }
        }

        const nextId = bestIdx >= 0 ? tiles[bestIdx]?.id ?? null : null
        if (nextId !== scannedRef.current) {
            scannedRef.current = nextId
            onScanChange(nextId)
        }
    }, [TILE_COUNT, enablePanelCurvature, layout.centers, onScanChange, tiles])

    useEffect(() => {
        // first paint
        requestAnimationFrame(() => renderFrame())
    }, [renderFrame])

    useEffect(() => {
        const viewport = viewportRef.current
        if (!viewport) return

        const onDown = (e: PointerEvent) => {
            // CRITICAL: stop browser gesture stealing
            e.preventDefault()

            isDraggingRef.current = true
            setDragging(true)

            viewport.setPointerCapture(e.pointerId)

            startRef.current = { x: e.clientX - posRef.current.x, y: e.clientY - posRef.current.y }
            lastRef.current = { x: e.clientX, y: e.clientY, t: performance.now() }
            velRef.current = { x: 0, y: 0 }

            if (rafRef.current) cancelAnimationFrame(rafRef.current)
            rafRef.current = requestAnimationFrame(function tick() {
                if (!isDraggingRef.current) return
                posRef.current.x = targetRef.current.x
                posRef.current.y = targetRef.current.y
                renderFrame()
                rafRef.current = requestAnimationFrame(tick)
            })
        }

        const onMove = (e: PointerEvent) => {
            if (!isDraggingRef.current) return
            e.preventDefault()

            const bounds = getBounds()
            const rawX = e.clientX - startRef.current.x
            const rawY = e.clientY - startRef.current.y

            targetRef.current = {
                x: rubberBand(rawX, bounds.minX, bounds.maxX, 240, 0.35),
                y: rubberBand(rawY, bounds.minY, bounds.maxY, 240, 0.35),
            }

            const t = performance.now()
            const dt = Math.max(1, t - lastRef.current.t)
            velRef.current = {
                x: ((e.clientX - lastRef.current.x) / dt) * 16,
                y: ((e.clientY - lastRef.current.y) / dt) * 16,
            }
            lastRef.current = { x: e.clientX, y: e.clientY, t }
        }

        const onUp = () => {
            if (!isDraggingRef.current) return
            isDraggingRef.current = false
            setDragging(false)

            if (rafRef.current) cancelAnimationFrame(rafRef.current)

            // momentum + spring back
            const step = () => {
                const bounds = getBounds()
                const tx = clamp(posRef.current.x, bounds.minX, bounds.maxX)
                const ty = clamp(posRef.current.y, bounds.minY, bounds.maxY)
                const dx = tx - posRef.current.x
                const dy = ty - posRef.current.y

                const k = 0.12
                const damping = 0.86

                velRef.current.x += dx * k
                velRef.current.y += dy * k
                velRef.current.x *= damping
                velRef.current.y *= damping

                posRef.current.x += velRef.current.x
                posRef.current.y += velRef.current.y

                renderFrame()

                const done =
                    Math.abs(velRef.current.x) < 0.35 &&
                    Math.abs(velRef.current.y) < 0.35 &&
                    Math.abs(dx) < 0.8 &&
                    Math.abs(dy) < 0.8

                if (!done) rafRef.current = requestAnimationFrame(step)
                else {
                    posRef.current = { x: tx, y: ty }
                    velRef.current = { x: 0, y: 0 }
                    renderFrame()
                }
            }

            rafRef.current = requestAnimationFrame(step)
        }

        const onCancel = () => onUp()

        // IMPORTANT: passive false so preventDefault works
        viewport.addEventListener("pointerdown", onDown, { passive: false })
        viewport.addEventListener("pointermove", onMove, { passive: false })
        viewport.addEventListener("pointerup", onUp, { passive: true })
        viewport.addEventListener("pointercancel", onCancel, { passive: true })

        return () => {
            viewport.removeEventListener("pointerdown", onDown)
            viewport.removeEventListener("pointermove", onMove)
            viewport.removeEventListener("pointerup", onUp)
            viewport.removeEventListener("pointercancel", onCancel)
            if (rafRef.current) cancelAnimationFrame(rafRef.current)
        }
    }, [getBounds, renderFrame, setDragging])

    return (
        <section
            className="relative left-1/2 w-screen -translate-x-1/2 overflow-hidden"
            style={{ height: `${heightVh}vh`, minHeight }}
        >
            {/* viewport */}
            <div
                ref={viewportRef}
                className="absolute inset-0 overflow-hidden"
                style={{
                    // these 3 are what fix “drag stops”
                    touchAction: "none",
                    userSelect: "none",
                    WebkitUserSelect: "none",
                }}
            >
                {/* panel edge fade + corner vignette */}
                <div
                    className="absolute inset-0 pointer-events-none z-[5]"
                    style={{
                        borderRadius: 28,
                        // fades edges without touching tiles
                        background:
                            "radial-gradient(90% 85% at 50% 45%, rgba(255,255,255,0) 55%, rgba(255,255,255,0.85) 100%)",
                        mixBlendMode: "normal",
                    }}
                />

                {/* 3D rig (one transform only) */}
                <div ref={rigRef} className="absolute inset-0">
                    <div
                        ref={fieldRef}
                        className="absolute left-1/2 top-1/2"
                        style={{
                            width: layout.canvasW,
                            height: layout.canvasH,
                            transform: "translate3d(-50%,-50%,0)",
                            willChange: "transform",
                        }}
                    >
                        <div
                            className="absolute left-0 top-0"
                            style={{
                                width: layout.canvasW,
                                height: layout.canvasH,
                                display: "grid",
                                gridTemplateColumns: `repeat(${cols}, ${tileW}px)`,
                                gridTemplateRows: `repeat(${rows}, ${tileH}px)`,
                                gap: `${gap}px`,
                                padding: pad,
                                placeContent: "center",
                            }}
                        >
                            {tiles.map((p, i) => (
                                <div
                                    key={`${p?.id ?? "empty"}-${i}`}
                                    className="rounded-xl overflow-hidden bg-white"
                                    style={{
                                        width: tileW,
                                        height: tileH,
                                        boxShadow: "0 4px 16px rgba(0,0,0,0.07), 0 1px 2px rgba(0,0,0,0.05)",
                                    }}
                                >
                                    <img
                                        src={p?.imageSrc ?? p?.images?.[0] ?? "/clothing-images/fallback.jpg"}
                                        alt={p?.name ?? "Item"}
                                        className="h-full w-full object-cover"
                                        draggable={false}
                                        onError={(e) => {
                                            const t = e.currentTarget as HTMLImageElement
                                            if (t.src.includes("fallback.jpg")) return
                                            t.src = "/clothing-images/fallback.jpg"
                                        }}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* scanner anchor (HeroScanner places overlay UI separately) */}
                <div
                    ref={scannerRef}
                    className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[20] pointer-events-none"
                    style={{ width: "min(380px, 75vw)", height: "min(260px, 38vh)" }}
                />
            </div>
        </section>
    )
}
