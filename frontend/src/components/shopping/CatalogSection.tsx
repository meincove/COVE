"use client"

import type { UiProduct } from "@/src/lib/catalog/shared"
import { resolveImgPath, FALLBACK_IMG, formatPriceEUR } from "@/src/lib/catalog/shared"

type Props = {
    title: string
    subtitle?: string
    items: UiProduct[]
    totalCount?: number
    onShowMore?: () => void
    onGoToProduct?: (p: UiProduct) => void
}

export default function CatalogSection({
    title,
    subtitle,
    items,
    totalCount,
    onShowMore,
    onGoToProduct,
}: Props) {
    return (
        <section className="space-y-3">
            <div className="flex items-end justify-between gap-4">
                <div>
                    <div className="text-sm font-semibold text-black/85">{title}</div>
                    {subtitle ? <div className="text-xs text-black/45 mt-0.5">{subtitle}</div> : null}
                    {typeof totalCount === "number" ? (
                        <div className="text-[11px] text-black/35 mt-0.5">
                            Showing {items.length} of {totalCount}
                        </div>
                    ) : null}
                </div>

                {onShowMore ? (
                    <button
                        onClick={onShowMore}
                        className="rounded-full bg-black text-white px-4 py-2 text-xs font-medium hover:scale-[1.02] active:scale-[0.98] transition"
                    >
                        Show more
                    </button>
                ) : null}
            </div>

            <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                {items.map((p) => (
                    <button
                        key={p.id}
                        onClick={() => onGoToProduct?.(p)}
                        className="min-w-[220px] rounded-2xl border border-black/10 bg-white p-3 text-left hover:bg-black/[0.02] transition"
                    >
                        <div className="w-full h-[160px] rounded-xl overflow-hidden border border-black/10 bg-black/5">
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
                        </div>

                        <div className="mt-2">
                            <div className="text-[11px] text-black/45 truncate">{p.brandId ?? "COVE"}</div>
                            <div className="text-sm font-semibold text-black/85 truncate">{p.name}</div>
                            <div className="text-xs text-black/55 mt-0.5">{formatPriceEUR(p.price)}</div>
                        </div>
                    </button>
                ))}
            </div>
        </section>
    )
}
