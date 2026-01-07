"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { FpsMeter } from "@/src/components/FpsMeter"

/** Types needed for the Hero (subset of page types) */
export type UiProduct = {
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

function computeLayout(vw: number, vh: number): Layout {
    const safeVW = Math.max(320, vw)
    const safeVH = Math.max(360, vh)

    const visibleCols = clamp(Math.round(safeVW / 220) + 2, 5, 10)
    const fittedTile = Math.floor((safeVW - 2 * 18) / visibleCols)
    const tile = clamp(Math.floor(fittedTile * 0.7), 56, 96)
    const gap = clamp(Math.floor(tile * 0.45), 18, 44)
    const step = tile + gap
    const visibleRows = clamp(Math.ceil((safeVH - 2 * 18) / step), 4, 8)
    const extra = clamp(Math.round(visibleCols * 0.5), 3, 6)
    const totalCols = visibleCols + extra * 2
    const totalRows = visibleRows + extra * 2

    const stageW = totalCols * tile + (totalCols - 1) * gap
    const stageH = totalRows * tile + (totalRows - 1) * gap
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

export default function ShoppableHero({ products }: { products: UiProduct[] }) {
    const heroRef = useRef<HTMLElement | null>(null)
    const stageRef = useRef<HTMLDivElement | null>(null)
    const [layout, setLayout] = useState<Layout | null>(null)

    // Drag state
    const isDraggingRef = useRef(false)
    const pointerIdRef = useRef<number | null>(null)
    const lastPtRef = useRef<{ x: number; y: number } | null>(null)
    const posRef = useRef({ x: 0, y: 0 })
    const velRef = useRef({ x: 0, y: 0 })
    const animRafRef = useRef<number | null>(null)

    const [selectedIndex, setSelectedIndex] = useState(0)

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

    const applyTransform = useCallback(() => {
        const el = stageRef.current
        if (!el) return
        const { x, y } = posRef.current
        el.style.transform = `translate3d(${x}px, ${y}px, 0)`
    }, [])

    const updateSelectionFromCenter = useCallback(() => {
        const el = heroRef.current
        const lay = layout
        if (!el || !lay) return
        const { x, y } = posRef.current

        const cx = lay.vw / 2
        const cy = lay.vh / 2
        const sx = cx - x
        const sy = cy - y

        const col = clamp(Math.round(sx / lay.step), 0, lay.totalCols - 1)
        const row = clamp(Math.round(sy / lay.step), 0, lay.totalRows - 1)
        const idx = row * lay.totalCols + col

        setSelectedIndex((prev) => (prev === idx ? prev : idx))
    }, [layout])

    const startAnimLoop = useCallback(() => {
        if (animRafRef.current) return

        let last = performance.now()

        const tick = (t: number) => {
            animRafRef.current = requestAnimationFrame(tick)
            const dt = Math.min(32, t - last)
            last = t

            const lay = layout
            if (!lay) return

            if (isDraggingRef.current) {
                applyTransform()
                updateSelectionFromCenter()
                return
            }

            const vel = velRef.current
            const pos = posRef.current

            pos.x += vel.x * (dt / 16.67)
            pos.y += vel.y * (dt / 16.67)

            vel.x *= 0.92
            vel.y *= 0.92

            const minX = lay.vw - lay.stageW
            const minY = lay.vh - lay.stageH
            const maxX = 0
            const maxY = 0

            const k = 0.14
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

    useEffect(() => {
        const hero = heroRef.current
        if (!hero) return

        const ro = new ResizeObserver(() => {
            const rect = hero.getBoundingClientRect()
            const lay = computeLayout(rect.width, rect.height)
            setLayout(lay)

            posRef.current.x = -lay.padX
            posRef.current.y = -lay.padY
            velRef.current.x = 0
            velRef.current.y = 0

            requestAnimationFrame(() => {
                applyTransform()
                updateSelectionFromCenter()
            })
        })

        ro.observe(hero)
        return () => ro.disconnect()
    }, [applyTransform, updateSelectionFromCenter])

    const onPointerDown = useCallback(
        (e: React.PointerEvent) => {
            const lay = layout
            const stage = stageRef.current
            if (!lay || !stage) return
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

            vel.x = dx
            vel.y = dy
            pos.x += dx
            pos.y += dy

            const minX = lay.vw - lay.stageW
            const minY = lay.vh - lay.stageH
            const maxX = 0
            const maxY = 0

            const rubber = 0.35

            if (pos.x < minX) pos.x = minX + (pos.x - minX) * rubber
            if (pos.x > maxX) pos.x = maxX + (pos.x - maxX) * rubber
            if (pos.y < minY) pos.y = minY + (pos.y - minY) * rubber
            if (pos.y > maxY) pos.y = maxY + (pos.y - maxY) * rubber
        },
        [layout]
    )

    const onPointerUp = useCallback((e: React.PointerEvent) => {
        if (pointerIdRef.current !== e.pointerId) return
        isDraggingRef.current = false
        pointerIdRef.current = null
        lastPtRef.current = null
        startAnimLoop()
    }, [startAnimLoop])

    useEffect(() => {
        if (!layout) return
        startAnimLoop()
        return () => {
            stopAnimLoop()
        }
    }, [layout, startAnimLoop, stopAnimLoop])

    const heroBgStyle: React.CSSProperties = {
        background:
            "linear-gradient(180deg, rgba(250,250,250,1) 0%, rgba(255,255,255,1) 55%, rgba(255,255,255,1) 100%)",
    }

    return (
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
                touchAction: "none",
            }}
        >
            <FpsMeter />

            <div
                className="absolute inset-0 z-10"
                style={{ padding: 18 }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerUp}
            >
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
                            willChange: "transform",
                            backfaceVisibility: "hidden",
                            transform: "translate3d(0,0,0)",
                            contain: "strict",
                            pointerEvents: "none",
                        }}
                    >
                        {heroTiles.map((p, i) => {
                            const col = i % layout.totalCols
                            const row = Math.floor(i / layout.totalCols)
                            const cx = (layout.totalCols - 1) / 2
                            const cy = (layout.totalRows - 1) / 2
                            const dx = (col - cx) / cx
                            const dy = (row - cy) / cy
                            const dist = Math.min(1, Math.sqrt(dx * dx + dy * dy))
                            const fisheye = 1 - 0.2 * Math.pow(dist, 1.35)
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

                <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
                    <div
                        className="relative pointer-events-none"
                        style={{
                            width: "min(840px, 92vw)",
                            height: "min(320px, 42vh)",
                        }}
                    >
                        <div className="absolute inset-0 rounded-[28px] border border-neutral-200 bg-white/90" />
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

            <div
                className="absolute bottom-0 left-0 right-0 h-28 pointer-events-none z-40"
                style={{
                    background: "linear-gradient(180deg, rgba(255,255,255,0) 0%, rgba(255,255,255,1) 90%)",
                }}
            />
        </section>
    )
}
