"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { X, Search } from "lucide-react"
import { useVirtualizer } from "@tanstack/react-virtual"

import type { UiProduct } from "@/lib/catalog/shared"
import { formatPriceEUR, resolveImgPath, FALLBACK_IMG } from "@/lib/catalog/shared"

type Props = {
    open: boolean
    type: string | null
    items: UiProduct[] // already filtered list from page.tsx (same flow as Catalog)
    onClose: () => void
    onGoToProduct?: (p: UiProduct) => void
    onBuyNow?: (p: UiProduct) => void
}

export default function CatalogBrowseModal({
    open,
    type,
    items,
    onClose,
    onGoToProduct,
    onBuyNow,
}: Props) {
    const [query, setQuery] = useState("")
    const parentRef = useRef<HTMLDivElement | null>(null)

    // Reset search when opening/type changes
    useEffect(() => {
        if (!open) return
        setQuery("")
    }, [open, type])

    // Body scroll lock
    useEffect(() => {
        if (!open) return
        const y = window.scrollY
        document.body.style.position = "fixed"
        document.body.style.top = `-${y}px`
        document.body.style.left = "0"
        document.body.style.right = "0"
        document.body.style.width = "100%"

        return () => {
            const top = document.body.style.top
            document.body.style.position = ""
            document.body.style.top = ""
            document.body.style.left = ""
            document.body.style.right = ""
            document.body.style.width = ""
            const prevY = top ? Math.abs(parseInt(top, 10)) : 0
            window.scrollTo(0, prevY)
        }
    }, [open])

    const filtered = useMemo(() => {
        if (!query.trim()) return items
        const q = query.trim().toLowerCase()
        return items.filter((p) => {
            const hay = `${p.name ?? ""} ${p.type ?? ""} ${p.tier ?? ""} ${p.fit ?? ""}`.toLowerCase()
            return hay.includes(q)
        })
    }, [items, query])

    // Virtualized grid
    const cols = 2
    const rowCount = Math.ceil(filtered.length / cols)

    const rowVirtualizer = useVirtualizer({
        count: rowCount,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 112,
        overscan: 10,
    })

    if (!open) return null

    return (
        <div className="fixed inset-0 z-[60]">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/30" onClick={onClose} />

            {/* Panel */}
            <div className="absolute inset-0 flex items-center justify-center p-4">
                <div className="w-[min(1200px,92vw)] h-[min(760px,86vh)] rounded-[28px] bg-white shadow-2xl border border-black/10 overflow-hidden relative">
                    {/* Header */}
                    <div className="px-6 py-4 border-b border-black/10 flex items-center gap-3">
                        <div className="min-w-0">
                            <div className="text-[10px] tracking-[0.2em] text-black/40 uppercase">Browse all</div>
                            <div className="text-base font-semibold text-black/85 truncate">{type ?? ""}</div>
                            <div className="text-[11px] text-black/45 mt-0.5">
                                Showing {filtered.length} of {items.length}
                            </div>
                        </div>

                        <div className="ml-auto flex items-center gap-2">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/35" />
                                <input
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="Search in this category…"
                                    className="h-10 w-[min(360px,46vw)] rounded-full border border-black/10 bg-black/5 pl-10 pr-3 text-sm outline-none focus:bg-white"
                                />
                            </div>

                            <button
                                onClick={onClose}
                                className="h-10 w-10 rounded-full border border-black/10 bg-white hover:bg-black/5 flex items-center justify-center"
                                aria-label="Close"
                            >
                                <X className="w-5 h-5 text-black/70" />
                            </button>
                        </div>
                    </div>

                    {/* Body */}
                    <div className="h-[calc(100%-72px)]">
                        <div ref={parentRef} className="h-full overflow-auto">
                            <div
                                style={{
                                    height: `${rowVirtualizer.getTotalSize()}px`,
                                    width: "100%",
                                    position: "relative",
                                }}
                            >
                                {rowVirtualizer.getVirtualItems().map((row) => {
                                    const start = row.index * cols
                                    const slice = filtered.slice(start, start + cols)

                                    return (
                                        <div
                                            key={row.key}
                                            style={{
                                                position: "absolute",
                                                top: 0,
                                                left: 0,
                                                width: "100%",
                                                transform: `translateY(${row.start}px)`,
                                            }}
                                            className="px-6 py-3"
                                        >
                                            <div className="grid grid-cols-2 gap-4">
                                                {slice.map((p) => (
                                                    <div
                                                        key={p.id}
                                                        className="rounded-2xl border border-black/10 bg-white p-3 flex items-center gap-3"
                                                    >
                                                        {/* Thumb */}
                                                        <button
                                                            onClick={() => onGoToProduct?.(p)}
                                                            className="relative w-16 h-16 rounded-xl overflow-hidden border border-black/10 bg-black/5 flex-shrink-0"
                                                            title="Open product"
                                                        >
                                                            <img
                                                                src={resolveImgPath(p.images?.[0] ?? p.imageSrc ?? FALLBACK_IMG)}
                                                                alt={p.name}
                                                                className="w-full h-full object-cover"
                                                                loading="lazy"
                                                                decoding="async"
                                                                onError={(e) => {
                                                                    ; (e.currentTarget as HTMLImageElement).src = FALLBACK_IMG
                                                                }}
                                                            />
                                                        </button>

                                                        {/* Info */}
                                                        <div className="min-w-0 flex-1">
                                                            <div className="text-[11px] text-black/45 truncate">{p.brandId ?? "COVE"}</div>
                                                            <div className="text-sm font-semibold text-black/85 truncate">{p.name}</div>
                                                            <div className="text-xs text-black/55 mt-0.5">{formatPriceEUR(p.price)}</div>
                                                        </div>

                                                        {/* CTAs */}
                                                        <div className="flex flex-col gap-2">
                                                            <button
                                                                onClick={() => onBuyNow?.(p)}
                                                                className="h-9 px-3 rounded-full bg-black text-white text-xs font-medium hover:scale-[1.03] active:scale-[0.98] transition"
                                                            >
                                                                Buy now
                                                            </button>
                                                            <button
                                                                onClick={() => onGoToProduct?.(p)}
                                                                className="h-9 px-3 rounded-full border border-black/10 bg-white text-black text-xs font-medium hover:bg-black/5 transition"
                                                            >
                                                                Product page
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                                {slice.length === 1 ? <div /> : null}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>

                            <div className="px-6 py-4 text-xs text-black/45 border-t border-black/10 flex items-center justify-between">
                                <div>Loaded {items.length} items</div>
                                <button onClick={onClose} className="h-9 px-4 rounded-full bg-black text-white text-xs font-medium">
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Empty state */}
                    {items.length === 0 && (
                        <div className="absolute inset-0 grid place-items-center pointer-events-none">
                            <div className="text-center">
                                <div className="text-sm font-semibold text-black/70">No items found</div>
                                <div className="text-xs text-black/45 mt-1">Try changing filters or search.</div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
