"use client"

import * as React from "react"
import type { UiProduct } from "@/src/lib/catalog/shared"
import { useRouter } from "next/navigation"

function safeImg(src?: string) {
    if (!src) return "/clothing-images/fallback.jpg"
    return src
}

export default function HeroScannerBottomBar({
    scanned,
    visible,
    onAskCove,
}: {
    scanned: UiProduct | null
    visible: boolean
    onAskCove?: (p: UiProduct) => void
}) {
    const router = useRouter()

    const colorsCount = React.useMemo(() => {
        const n = scanned?.colorNames?.length ?? 0
        return n > 0 ? n : null
    }, [scanned])

    if (!visible) return null

    return (
        <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 z-[120] w-[min(920px,92vw)]">
            <div
                className="pointer-events-auto rounded-[22px] border border-black/12 bg-white/85 backdrop-blur-xl shadow-[0_18px_70px_rgba(0,0,0,0.12)] px-4 py-3"
                style={{ WebkitBackdropFilter: "blur(16px)" }}
            >
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl overflow-hidden bg-black/5 shrink-0">
                        <img src={safeImg(scanned?.imageSrc ?? scanned?.images?.[0])} alt="" className="w-full h-full object-cover" draggable={false} />
                    </div>

                    <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 min-w-0">
                            <div className="text-[10px] uppercase tracking-wider text-black/55 font-medium">
                                {(scanned?.type ?? "Item").toString()}
                            </div>

                            {scanned?.tier ? (
                                <div className="text-[10px] px-2 py-0.5 rounded-full bg-black/6 text-black/60">{scanned.tier}</div>
                            ) : null}

                            {colorsCount ? (
                                <div className="text-[10px] px-2 py-0.5 rounded-full bg-black/6 text-black/60">{colorsCount} colors</div>
                            ) : null}
                        </div>

                        <div className="mt-0.5 truncate text-sm font-semibold text-black/90">
                            {scanned?.name ?? "—"}
                            {scanned?.price != null ? (
                                <span className="ml-2 text-sm font-medium text-black/65">€{Number(scanned.price ?? 0).toFixed(2)}</span>
                            ) : null}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            className="pointer-events-auto rounded-full bg-black/6 hover:bg-black/10 transition px-4 py-2 text-xs font-medium text-black/75"
                            onClick={() => {
                                if (!scanned) return
                                onAskCove?.(scanned)
                            }}
                        >
                            Ask Cove
                        </button>

                        <button
                            className="pointer-events-auto rounded-full bg-black text-white hover:bg-black/90 transition px-4 py-2 text-xs font-medium"
                            onClick={() => {
                                if (!scanned?.slug) return
                                const variantParam = scanned.variantId ? `?variantId=${scanned.variantId}` : ''
                                router.push(`/product/${scanned.slug}${variantParam}`)
                            }}
                        >
                            Go to Product
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
