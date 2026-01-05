"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { UiProduct, resolveImgPath, FALLBACK_IMG, formatPriceEUR } from "@/src/lib/catalog/shared"

function clamp(v: number, a: number, b: number) {
    return Math.max(a, Math.min(b, v))
}

export default function HeroShowcase({
    items,
    tag = "Hot picks of 2025",
    onGoToProduct,
}: {
    items: UiProduct[] // curated list only (ex 40–80)
    tag?: string
    onGoToProduct: (p: UiProduct) => void
}) {
    const hostRef = useRef<HTMLDivElement | null>(null)
    const sheetRef = useRef<HTMLDivElement | null>(null)

    // We do NOT update these via state during drag
    const posRef = useRef({ x: 0, y: 0 })
    const draggingRef = useRef(false)
    const startRef = useRef({ x: 0, y: 0, px: 0, py: 0 })
    const rafRef = useRef<number | null>(null)

    const [selected, setSelected] = useState<UiProduct | null>(null)

    // layout knobs
    const tile = 44 // smaller tiles
    const gap = 18  // prominent spacing
    const radius = 14

    // Build a grid big enough to drag (1.4× each axis)
    const layout = useMemo(() => {
        // keep it deterministic + light
        const max = Math.min(items.length, 84) // cap hero rendering
        return items.slice(0, max)
    }, [items])

    function applyTransform() {
        const el = sheetRef.current
        const host = hostRef.current
        if (!el || !host) return

        const hostRect = host.getBoundingClientRect()

        const sheetW = hostRect.width * 1.4
        const sheetH = hostRect.height * 1.4

        // allow drag within bounds so no empty space
        const maxX = (sheetW - hostRect.width) / 2
        const maxY = (sheetH - hostRect.height) / 2

        const x = clamp(posRef.current.x, -maxX, maxX)
        const y = clamp(posRef.current.y, -maxY, maxY)

        posRef.current.x = x
        posRef.current.y = y

        el.style.transform = `translate3d(${x}px, ${y}px, 0)`
    }

    function schedule() {
        if (rafRef.current) return
        rafRef.current = requestAnimationFrame(() => {
            rafRef.current = null
            applyTransform()
            updateCenterSelection()
        })
    }

    function updateCenterSelection() {
        const host = hostRef.current
        if (!host) return
        const rect = host.getBoundingClientRect()
        const cx = rect.width / 2
        const cy = rect.height / 2

        // approximate which tile is closest to center (fast)
        // Our tiles are laid out from top-left of sheet content area.
        const x0 = -posRef.current.x + (rect.width * 0.2) // sheet padding
        const y0 = -posRef.current.y + (rect.height * 0.2)

        const col = Math.round((cx - x0) / (tile + gap))
        const row = Math.round((cy - y0) / (tile + gap))

        const cols = Math.max(1, Math.floor((rect.width * 1.4) / (tile + gap)))
        const idx = row * cols + col

        const next = layout[idx]
        if (next && next.id !== selected?.id) setSelected(next)
    }

    useEffect(() => {
        applyTransform()
        updateCenterSelection()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [layout.length])

    useEffect(() => {
        const host = hostRef.current
        if (!host) return

        const onDown = (e: PointerEvent) => {
            draggingRef.current = true
                ; (e.target as HTMLElement).setPointerCapture?.(e.pointerId)
            startRef.current = {
                x: posRef.current.x,
                y: posRef.current.y,
                px: e.clientX,
                py: e.clientY,
            }
        }

        const onMove = (e: PointerEvent) => {
            if (!draggingRef.current) return
            const dx = e.clientX - startRef.current.px
            const dy = e.clientY - startRef.current.py
            posRef.current.x = startRef.current.x + dx
            posRef.current.y = startRef.current.y + dy
            schedule()
        }

        const onUp = () => {
            draggingRef.current = false
        }

        host.addEventListener("pointerdown", onDown, { passive: true })
        window.addEventListener("pointermove", onMove, { passive: true })
        window.addEventListener("pointerup", onUp, { passive: true })

        return () => {
            host.removeEventListener("pointerdown", onDown)
            window.removeEventListener("pointermove", onMove)
            window.removeEventListener("pointerup", onUp)
        }
    }, [])

    // tile positions
    const tiles = useMemo(() => {
        const host = hostRef.current
        // render as a simple grid; we’ll compute cols using a safe fallback
        const cols = 14
        return layout.map((p, i) => {
            const r = Math.floor(i / cols)
            const c = i % cols
            return {
                p,
                x: c * (tile + gap),
                y: r * (tile + gap),
            }
        })
    }, [layout])

    return (
        <div className="relative w-full">
            {/* Hero background: subtle white gradient (no blur) */}
            <div className="relative h-[58vh] rounded-[28px] overflow-hidden border border-black/10">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(0,0,0,0.06),_transparent_55%),linear-gradient(to_bottom,_rgba(255,255,255,1),_rgba(245,245,245,1))]" />

                <div className="absolute inset-0" ref={hostRef} style={{ touchAction: "none" }}>
                    {/* Tag */}
                    <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20">
                        <div className="px-4 py-2 rounded-full bg-white border border-black/10 shadow-sm text-xs text-black/60 font-medium">
                            {tag}
                        </div>
                    </div>

                    {/* Draggable sheet */}
                    <div
                        ref={sheetRef}
                        className="absolute left-1/2 top-1/2"
                        style={{
                            width: "140%",
                            height: "140%",
                            transform: "translate3d(0,0,0)",
                            willChange: "transform",
                            // anchor center
                            marginLeft: "-70%",
                            marginTop: "-70%",
                        }}
                    >
                        {/* padding so center area has room */}
                        <div className="absolute left-[20%] top-[20%]">
                            <div className="relative">
                                {tiles.map(({ p, x, y }) => (
                                    <div
                                        key={p.id}
                                        className="absolute"
                                        style={{ transform: `translate3d(${x}px, ${y}px, 0)` }}
                                    >
                                        <div
                                            className="overflow-hidden border border-black/10 bg-white shadow-[0_10px_30px_rgba(0,0,0,0.10)]"
                                            style={{
                                                width: tile,
                                                height: tile,
                                                borderRadius: radius,
                                            }}
                                        >
                                            <img
                                                src={resolveImgPath(p.images?.[0] ?? FALLBACK_IMG)}
                                                alt={p.name}
                                                className="w-full h-full object-cover"
                                                decoding="async"
                                                loading="eager"
                                                onError={(e) => {
                                                    ; (e.currentTarget as HTMLImageElement).src = FALLBACK_IMG
                                                }}
                                                draggable={false}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* “QR” / Focus card (smaller + squarish) */}
                    <div className="absolute inset-0 grid place-items-center z-30 pointer-events-none">
                        <div className="pointer-events-auto w-[min(720px,86vw)] rounded-[22px] bg-white border border-black/10 shadow-[0_25px_70px_rgba(0,0,0,0.18)] p-4">
                            <div className="grid grid-cols-[160px_1fr] gap-4">
                                <div className="rounded-[16px] overflow-hidden border border-black/10 bg-black/5 aspect-square">
                                    <img
                                        src={resolveImgPath(selected?.images?.[0] ?? FALLBACK_IMG)}
                                        alt={selected?.name ?? "Selected"}
                                        className="w-full h-full object-cover"
                                        decoding="async"
                                        loading="eager"
                                        onError={(e) => {
                                            ; (e.currentTarget as HTMLImageElement).src = FALLBACK_IMG
                                        }}
                                    />
                                </div>

                                <div className="min-w-0 flex flex-col justify-between">
                                    <div className="min-w-0">
                                        <div className="text-[10px] tracking-[0.18em] text-black/40 font-bold uppercase">
                                            COVE
                                        </div>
                                        <div className="text-base font-semibold text-black/85 truncate">
                                            {selected?.name ?? "Drag the panel — center selects"}
                                        </div>
                                        <div className="text-sm text-black/55 mt-1">
                                            {selected ? formatPriceEUR(selected.price) : ""}
                                        </div>
                                        <div className="text-[11px] text-black/40 mt-2">
                                            Drag the panel — center selects
                                        </div>
                                    </div>

                                    <div className="flex gap-2 pt-3">
                                        <button
                                            className="h-10 px-4 rounded-full bg-black text-white text-xs font-medium hover:scale-[1.02] active:scale-[0.98] transition pointer-events-auto"
                                            onClick={() => selected && onGoToProduct(selected)}
                                            disabled={!selected}
                                        >
                                            Go to Product Page
                                        </button>
                                        <button
                                            className="h-10 px-4 rounded-full border border-black/12 bg-white text-black/70 text-xs font-medium hover:bg-black/5 transition pointer-events-auto"
                                            onClick={() => selected && onGoToProduct(selected)}
                                            disabled={!selected}
                                        >
                                            Buy Now
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* center marker (optional) */}
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                        <div className="w-2 h-2 rounded-full bg-black/10" />
                    </div>
                </div>
            </div>
        </div>
    )
}
